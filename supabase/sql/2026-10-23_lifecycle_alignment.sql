-- Lifecycle alignment (2026-10-23)
-- Makes the database match what the site and emails promise:
--   dispute -> 24h -> 72h debate -> 48h voting -> results 7 days later
--   -> the record STAYS published and is labeled with which side the community took.
-- Also removes "AI review" / "verdict" wording from notifications.
-- Run as one block. If anything errors, nothing changes.

begin;

-- 1) Disputes no longer skip straight to a 7-day debate.
--    advance_record_stages() opens the 72h debate 24h after the dispute.
drop trigger if exists on_deletion_request on public.records;

-- 2) Final outcome: never deletes or unpublishes. Uses the real vote_tally columns.
--    Stored values stay 'keep' (contributor side) / 'delete' (subject side) because
--    the score and badge functions read them; the site shows them as
--    "Community sided with contributor / subject".
create or replace function public.records_finalize_outcome_from_votes()
returns trigger
language plpgsql
as $$
declare
  v_contributor bigint;
  v_subject     bigint;
begin
  if new.status::text = 'decision'
     and new.decision_made_at is not null
     and (old.decision_made_at is distinct from new.decision_made_at or old.status is distinct from new.status)
  then
    select t.contributor_count, t.subject_count
      into v_contributor, v_subject
      from public.vote_tally(new.id) t;

    if coalesce(v_subject, 0) > coalesce(v_contributor, 0) then
      new.final_outcome := 'delete';   -- most voters sided with the subject; record stays
    else
      new.final_outcome := 'keep';     -- most voters sided with the contributor (or a tie)
    end if;

    -- The record stays on DNounce whatever the outcome.
    new.is_published := true;
    if new.published_at is null then
      new.published_at := now();
    end if;
    new.finalized_at := now();
  end if;
  return new;
end;
$$;

-- 3) Stage engine: same steps as before, plus announcing results when
--    verdict_announced_at arrives (this is what sets the outcome).
create or replace function public.advance_record_stages()
returns void
language plpgsql
as $$
declare
  rec record;
begin
  -- Stage 2 -> 3: publish 24h after submission
  for rec in
    select id from public.records
    where status = 'subject_notified'
      and submitted_at is not null
      and submitted_at <= now() - interval '24 hours'
  loop
    update public.records set
      status = 'published',
      is_published = true,
      published_at = now()
    where id = rec.id;
  end loop;

  -- Stage 4 -> 5: debate opens 24h after the dispute, for 72h
  for rec in
    select id from public.records
    where status = 'deletion_request'
      and dispute_started_at is not null
      and dispute_started_at <= now() - interval '24 hours'
      and debate_started_at is null
  loop
    update public.records set
      status = 'debate',
      debate_started_at = now(),
      debate_ends_at = now() + interval '72 hours'
    where id = rec.id;
  end loop;

  -- Stage 5 -> 6: voting opens when debate ends, for 48h
  for rec in
    select id from public.records
    where status = 'debate'
      and debate_ends_at is not null
      and debate_ends_at <= now()
      and voting_started_at is null
  loop
    update public.records set
      status = 'voting',
      voting_started_at = now(),
      voting_ends_at = now() + interval '48 hours'
    where id = rec.id;
  end loop;

  -- Stage 6 -> 7: voting ends; results are shown 7 days later
  for rec in
    select id from public.records
    where status = 'voting'
      and voting_ends_at is not null
      and voting_ends_at <= now()
      and decision_started_at is null
  loop
    update public.records set
      status = 'decision',
      decision_started_at = now(),
      execution_ends_at = now() + interval '3 days',
      verdict_announced_at = now() + interval '7 days'
    where id = rec.id;
  end loop;

  -- Results announced: record the outcome (fires records_finalize_outcome_from_votes)
  -- and tell both people. (trg_record_notifications only fires on status changes,
  -- so this notice is sent here.)
  for rec in
    select r.id, s.owner_auth_user_id as subject_uid, c.user_id as contributor_uid
    from public.records r
    left join public.subjects s on s.subject_uuid = r.subject_id
    left join public.contributors c on c.id = r.contributor_id
    where r.status = 'decision'
      and r.decision_made_at is null
      and r.verdict_announced_at is not null
      and r.verdict_announced_at <= now()
  loop
    update public.records set
      decision_made_at = now()
    where id = rec.id;

    perform notify_if_pref(rec.subject_uid, 'notif_always_stage_changes', true,
      'The results are in', 'See where people landed on the record about you.', 'verdict_announced', rec.id);
    perform notify_if_pref(rec.contributor_uid, 'notif_always_stage_changes', true,
      'The results are in', 'See where people landed on your record.', 'verdict_announced', rec.id);
  end loop;
end;
$$;

-- 4) Notifications: no AI wording, no "verdict", contributor shown as First L.,
--    and a "results are in" notice when the outcome is set.
create or replace function public.trigger_record_notifications()
returns trigger
language plpgsql
as $$
declare
  v_subject_auth_user_id uuid;
  v_contributor_auth_user_id uuid;
  v_subject_name text;
  v_subject_short text;
  v_contributor_label text;
begin
  select owner_auth_user_id, name into v_subject_auth_user_id, v_subject_name
  from public.subjects where subject_uuid = new.subject_id;

  -- "Sam S." (first name + last initial), same rule as contributors
  v_subject_short := case
    when array_length(regexp_split_to_array(trim(coalesce(v_subject_name, '')), '\s+'), 1) > 1
      then split_part(trim(v_subject_name), ' ', 1) || ' ' ||
           upper(left((regexp_split_to_array(trim(v_subject_name), '\s+'))[array_length(regexp_split_to_array(trim(v_subject_name), '\s+'), 1)], 1)) || '.'
    else coalesce(nullif(trim(v_subject_name), ''), 'The person it''s about')
  end;

  select user_id into v_contributor_auth_user_id
  from public.contributors where id = new.contributor_id;

  v_contributor_label := case
    when new.contributor_identity_preference is distinct from false
         and nullif(trim(new.contributor_display_name), '') is not null
      then new.contributor_display_name
    else 'Someone'
  end;

  if tg_op = 'INSERT' then
    -- No notice on insert: the record moves to "Subject Notified" right after,
    -- and that step notifies both people.
    return new;
  end if;

  if old.status is distinct from new.status then

    if new.status = 'subject_notified' then
      perform notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        v_contributor_label || ' wrote a record about you',
        'Only you can see it for the next 24 hours. Then it goes public.',
        'stage_2_subject', new.id);
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Your record is in',
        'We let ' || v_subject_short || ' know. Your record goes public in 24 hours.',
        'stage_2_contributor', new.id);
    end if;

    if new.status = 'published' then
      perform notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'The record about you is now public',
        'Anyone can see it now. If you see things differently, you can challenge it from My Records.',
        'stage_3_subject', new.id);
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Your record is now public',
        'Anyone can see it now.',
        'stage_3_contributor', new.id);
    end if;

    if new.status = 'deletion_request' then
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        v_subject_short || ' challenged your record',
        v_subject_short || ' sees things differently and challenged your record. In 24 hours you''ll both get 3 days to share your side. Your record stays up either way.',
        'stage_4_contributor', new.id);
    end if;

    if new.status = 'debate' then
      perform notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Time to share your side',
        'You and ' || v_contributor_label || ' have 3 days to share your side, with evidence if you have it.',
        'stage_5_subject', new.id);
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Time to share your side',
        'You and ' || v_subject_short || ' have 3 days to share your side, with evidence if you have it.',
        'stage_5_contributor', new.id);
      insert into public.notifications (user_id, title, body, type, record_id)
      select p.user_id, 'Both sides are talking', 'A record you pinned was challenged. Both sides are sharing their story now.', 'pinned_stage_change', new.id
      from public.pinned_records p
      where p.record_id = new.id
        and p.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and p.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(p.user_id, 'notif_pinned_debate_open') = true;
      insert into public.notifications (user_id, title, body, type, record_id)
      select f.user_id, 'Both sides are talking', 'A record you follow was challenged. Both sides are sharing their story now.', 'following_stage_change', new.id
      from public.record_follows f
      where f.record_id = new.id
        and f.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and f.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(f.user_id, 'notif_following_debate_open') = true;
    end if;

    if new.status = 'voting' then
      perform notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'The community is voting',
        'People are voting for the next 2 days. You can watch, but you can''t vote on a record about you.',
        'stage_6_subject', new.id);
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'The community is voting',
        'People are voting for the next 2 days. You can watch, but you can''t vote on your own record.',
        'stage_6_contributor', new.id);
      insert into public.notifications (user_id, title, body, type, record_id)
      select p.user_id, 'Voting is open', 'A record you pinned is open for votes for the next 2 days.', 'pinned_stage_change', new.id
      from public.pinned_records p
      where p.record_id = new.id
        and p.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and p.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(p.user_id, 'notif_pinned_voting_open') = true;
      insert into public.notifications (user_id, title, body, type, record_id)
      select f.user_id, 'Voting is open', 'A record you follow is open for votes for the next 2 days.', 'following_stage_change', new.id
      from public.record_follows f
      where f.record_id = new.id
        and f.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and f.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(f.user_id, 'notif_following_voting_open') = true;
    end if;

    if new.status = 'decision' and old.status = 'voting' then
      perform notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Voting is closed',
        'The results show on the record in 7 days.',
        'voting_ended_subject', new.id);
      perform notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Voting is closed',
        'The results show on your record in 7 days.',
        'voting_ended_contributor', new.id);
      insert into public.notifications (user_id, title, body, type, record_id)
      select p.user_id, 'Voting is closed', 'Results for a record you pinned show in 7 days.', 'pinned_decided', new.id
      from public.pinned_records p
      where p.record_id = new.id
        and p.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and p.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(p.user_id, 'notif_pinned_outcome') = true;
      insert into public.notifications (user_id, title, body, type, record_id)
      select f.user_id, 'Voting is closed', 'Results for a record you follow show in 7 days.', 'following_decided', new.id
      from public.record_follows f
      where f.record_id = new.id
        and f.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and f.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and get_user_pref(f.user_id, 'notif_following_outcome') = true;
    end if;

  end if;

  if old.decision_started_at is null and new.decision_started_at is not null then
    insert into public.notification_queue (scheduled_for, type, record_id, payload)
    values (
      new.decision_started_at + interval '7 days',
      'seven_day_unlock', new.id,
      jsonb_build_object(
        'subject_user_id', v_subject_auth_user_id,
        'contributor_user_id', v_contributor_auth_user_id,
        'pinned_user_ids', (select jsonb_agg(user_id) from public.pinned_records where record_id = new.id),
        'following_user_ids', (select jsonb_agg(user_id) from public.record_follows where record_id = new.id)
      )
    );
  end if;

  return new;
end;
$$;

-- 5) "post-verdict" wording
create or replace function public.process_notification_queue()
returns void
language plpgsql
as $$
declare
  item record;
  v_subject_id uuid;
  v_contributor_id uuid;
begin
  for item in
    select * from public.notification_queue
    where processed = false
      and scheduled_for <= now()
  loop
    v_subject_id := (item.payload->>'subject_user_id')::uuid;
    v_contributor_id := (item.payload->>'contributor_user_id')::uuid;

    if item.type = 'seven_day_unlock' then
      if v_subject_id is not null then
        insert into public.notifications (user_id, title, body, type, record_id)
        values (v_subject_id, 'You can join the conversation again',
          'It''s been a week since the results came out. You can now post in the record''s community section.',
          'seven_day_unlock', item.record_id);
      end if;
      if v_contributor_id is not null then
        insert into public.notifications (user_id, title, body, type, record_id)
        values (v_contributor_id, 'You can join the conversation again',
          'It''s been a week since the results came out. You can now post in the record''s community section.',
          'seven_day_unlock', item.record_id);
      end if;
    end if;

    update public.notification_queue set processed = true where id = item.id;
  end loop;
end;
$$;

-- 6) Record alias: First L. (same rule as everywhere else), never the full name.
create or replace function public.sync_record_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_name text;
  v_label text;
begin
  select name into v_subject_name from public.subjects where subject_uuid = new.subject_id;

  v_label := case
    when new.contributor_identity_preference is distinct from false
         and nullif(trim(new.contributor_display_name), '') is not null
      then new.contributor_display_name
    else 'SuperHero123'
  end;

  new.record_alias := v_label || ' • ' || coalesce(v_subject_name, 'Unknown');
  return new;
end;
$$;

commit;
