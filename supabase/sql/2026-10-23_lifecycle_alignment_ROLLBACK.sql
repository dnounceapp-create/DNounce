-- ROLLBACK for 2026-10-23_lifecycle_alignment.sql: restores the functions exactly as they were.

begin;

create or replace function public.records_finalize_outcome_from_votes() returns trigger language plpgsql as $fn$

DECLARE
  keep_count   bigint;
  delete_count bigint;
  total_count  bigint;
BEGIN
  IF NEW.status::text = 'decision'
     AND NEW.decision_made_at IS NOT NULL
     AND (OLD.decision_made_at IS DISTINCT FROM NEW.decision_made_at OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    -- Use vote_tally which excludes convicted votes
    SELECT t.keep_count, t.delete_count, t.total_count
    INTO keep_count, delete_count, total_count
    FROM public.vote_tally(NEW.id) t;

    IF delete_count > keep_count THEN
      NEW.final_outcome := 'delete';
      NEW.deleted_at := COALESCE(NEW.deleted_at, now());
      NEW.is_published := false;
    ELSE
      NEW.final_outcome := 'keep';
      NEW.deleted_at := NULL;
      NEW.is_published := true;
      IF NEW.published_at IS NULL THEN
        NEW.published_at := now();
      END IF;
    END IF;
    NEW.finalized_at := now();
  END IF;
  RETURN NEW;
END;
$fn$;

create or replace function public.advance_record_stages() returns void language plpgsql as $fn$

DECLARE
  rec RECORD;
BEGIN
  -- Stage 2 → 3
  FOR rec IN
    SELECT id FROM public.records
    WHERE status = 'subject_notified'
      AND submitted_at IS NOT NULL
      AND submitted_at <= now() - INTERVAL '24 hours'
  LOOP
    UPDATE public.records SET
      status = 'published',
      is_published = true,
      published_at = now()
    WHERE id = rec.id;
  END LOOP;

  -- Stage 4 → 5
  FOR rec IN
    SELECT id FROM public.records
    WHERE status = 'deletion_request'
      AND dispute_started_at IS NOT NULL
      AND dispute_started_at <= now() - INTERVAL '24 hours'
      AND debate_started_at IS NULL
  LOOP
    UPDATE public.records SET
      status = 'debate',
      debate_started_at = now(),
      debate_ends_at = now() + INTERVAL '72 hours'
    WHERE id = rec.id;
  END LOOP;

  -- Stage 5 → 6
  FOR rec IN
    SELECT id FROM public.records
    WHERE status = 'debate'
      AND debate_ends_at IS NOT NULL
      AND debate_ends_at <= now()
      AND voting_started_at IS NULL
  LOOP
    UPDATE public.records SET
      status = 'voting',
      voting_started_at = now(),
      voting_ends_at = now() + INTERVAL '48 hours'
    WHERE id = rec.id;
  END LOOP;

  -- Stage 6 → 7
  FOR rec IN
    SELECT id FROM public.records
    WHERE status = 'voting'
      AND voting_ends_at IS NOT NULL
      AND voting_ends_at <= now()
      AND decision_started_at IS NULL
  LOOP
    UPDATE public.records SET
      status = 'decision',
      decision_started_at = now(),
      execution_ends_at = now() + INTERVAL '3 days',
      verdict_announced_at = now() + INTERVAL '7 days'
    WHERE id = rec.id;
  END LOOP;

END;
$fn$;

create or replace function public.trigger_record_notifications() returns trigger language plpgsql as $fn$

DECLARE
  v_subject_auth_user_id uuid;
  v_contributor_auth_user_id uuid;
  v_subject_name text;
  v_credibility text;
  v_contributor_label text;
BEGIN
  v_credibility := COALESCE(NEW.ai_vendor_1_result, NEW.anonymity_status, '');

  SELECT owner_auth_user_id, name INTO v_subject_auth_user_id, v_subject_name
  FROM public.subjects WHERE subject_uuid = NEW.subject_id;

  SELECT user_id INTO v_contributor_auth_user_id
  FROM public.contributors WHERE id = NEW.contributor_id;

  v_contributor_label := get_contributor_display_name(
    NEW.contributor_id, NEW.contributor_identity_preference, v_credibility
  );

  IF TG_OP = 'INSERT' THEN
    PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
      'Your record is under AI review',
      'Your submission is being reviewed by DNounce AI. You''ll hear back within 72 hours.',
      'stage_1_contributor', NEW.id);
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN

    IF NEW.status = 'subject_notified' THEN
      PERFORM notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Action Required — A record has been submitted about you',
        v_contributor_label || ' submitted a record about you. You have 24 hours to review privately before it publishes.',
        'stage_2_subject', NEW.id);
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'AI review complete — subject has been notified',
        'Your record passed AI review. The subject has been notified and it will publish within 24 hours.',
        'stage_2_contributor_ai_complete', NEW.id);
    END IF;

    IF NEW.status = 'published' THEN
      PERFORM notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'A record about you is now published',
        'The record is now publicly visible on DNounce.',
        'stage_3_subject', NEW.id);
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Your record is now live',
        'Your submitted record is now publicly visible on DNounce.',
        'stage_3_contributor', NEW.id);
    END IF;

    IF NEW.status = 'deletion_request' THEN
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Action Required — Your record has been disputed',
        v_subject_name || ' has disputed your record. Debate opens in 24 hours — review and prepare.',
        'stage_4_contributor', NEW.id);
    END IF;

    IF NEW.status = 'debate' THEN
      PERFORM notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Debate is now open — make your case',
        'You have a 72-hour window to present your case and respond to the contributor.',
        'stage_5_subject', NEW.id);
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Debate is now open — defend your record',
        'You have a 72-hour window to defend your submission with evidence and respond.',
        'stage_5_contributor', NEW.id);
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT p.user_id, 'A pinned record entered debate', 'A record you pinned is now in the debate stage.', 'pinned_stage_change', NEW.id
      FROM public.pinned_records p
      WHERE p.record_id = NEW.id
        AND p.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND p.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(p.user_id, 'notif_pinned_debate_open') = true;
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT f.user_id, 'A followed record entered debate', 'A record you follow is now in the debate stage.', 'following_stage_change', NEW.id
      FROM public.record_follows f
      WHERE f.record_id = NEW.id
        AND f.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND f.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(f.user_id, 'notif_following_debate_open') = true;
    END IF;

    IF NEW.status = 'voting' THEN
      PERFORM notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Voting has begun on your record',
        'The community is now voting. You can observe but not interact during this stage.',
        'stage_6_subject', NEW.id);
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Voting has begun on your record',
        'The community is now voting. Outcome announced in 7 days.',
        'stage_6_contributor', NEW.id);
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT p.user_id, 'A pinned record is now in voting', 'A record you pinned has entered the community voting stage.', 'pinned_stage_change', NEW.id
      FROM public.pinned_records p
      WHERE p.record_id = NEW.id
        AND p.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND p.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(p.user_id, 'notif_pinned_voting_open') = true;
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT f.user_id, 'A followed record is now in voting', 'A record you follow has entered the community voting stage.', 'following_stage_change', NEW.id
      FROM public.record_follows f
      WHERE f.record_id = NEW.id
        AND f.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND f.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(f.user_id, 'notif_following_voting_open') = true;
    END IF;

    IF NEW.status = 'decision' AND OLD.status = 'voting' THEN
      PERFORM notify_if_pref(v_subject_auth_user_id, 'notif_always_stage_changes', true,
        'Voting has ended — verdict coming soon',
        'The community has finished voting. The verdict will be announced in 7 days.',
        'voting_ended_subject', NEW.id);
      PERFORM notify_if_pref(v_contributor_auth_user_id, 'notif_always_stage_changes', true,
        'Voting has ended — verdict coming soon',
        'The community has finished voting on your record. The verdict will be announced in 7 days.',
        'voting_ended_contributor', NEW.id);
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT p.user_id, 'Voting ended on a pinned record', 'The community has voted. The verdict will be announced in 7 days.', 'pinned_decided', NEW.id
      FROM public.pinned_records p
      WHERE p.record_id = NEW.id
        AND p.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND p.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(p.user_id, 'notif_pinned_outcome') = true;
      INSERT INTO public.notifications (user_id, title, body, type, record_id)
      SELECT f.user_id, 'Voting ended on a followed record', 'The community has voted. The verdict will be announced in 7 days.', 'following_decided', NEW.id
      FROM public.record_follows f
      WHERE f.record_id = NEW.id
        AND f.user_id != COALESCE(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND f.user_id != COALESCE(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000')
        AND get_user_pref(f.user_id, 'notif_following_outcome') = true;
    END IF;

  END IF;

  IF OLD.decision_started_at IS NULL AND NEW.decision_started_at IS NOT NULL THEN
    INSERT INTO public.notification_queue (scheduled_for, type, record_id, payload)
    VALUES (
      NEW.decision_started_at + INTERVAL '7 days',
      'seven_day_unlock', NEW.id,
      jsonb_build_object(
        'subject_user_id', v_subject_auth_user_id,
        'contributor_user_id', v_contributor_auth_user_id,
        'pinned_user_ids', (SELECT jsonb_agg(user_id) FROM public.pinned_records WHERE record_id = NEW.id),
        'following_user_ids', (SELECT jsonb_agg(user_id) FROM public.record_follows WHERE record_id = NEW.id)
      )
    );
  END IF;

  RETURN NEW;
END;
$fn$;

create or replace function public.process_notification_queue() returns void language plpgsql as $fn$

DECLARE
  item RECORD;
  v_subject_id uuid;
  v_contributor_id uuid;
BEGIN
  FOR item IN
    SELECT * FROM public.notification_queue
    WHERE processed = false
      AND scheduled_for <= now()
  LOOP
    v_subject_id := (item.payload->>'subject_user_id')::uuid;
    v_contributor_id := (item.payload->>'contributor_user_id')::uuid;

    IF item.type = 'seven_day_unlock' THEN
      IF v_subject_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, record_id)
        VALUES (
          v_subject_id,
          'You can now interact with the community section',
          'The 7-day post-verdict window has passed. You can now post a community statement on this record.',
          'seven_day_unlock',
          item.record_id
        );
      END IF;
      IF v_contributor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, record_id)
        VALUES (
          v_contributor_id,
          'You can now interact with the community section',
          'The 7-day post-verdict window has passed. You can now post a community statement on this record.',
          'seven_day_unlock',
          item.record_id
        );
      END IF;
    END IF;

    UPDATE public.notification_queue
    SET processed = true
    WHERE id = item.id;

  END LOOP;
END;
$fn$;

create or replace function public.sync_record_alias() returns trigger language plpgsql security definer set search_path = public as $fn$
DECLARE
  v_full_name text;
  v_subject_name text;
  v_contributor_label text;
BEGIN
  SELECT TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
  INTO v_full_name
  FROM public.user_accountdetails u
  JOIN public.contributors c ON c.user_id = u.user_id
  WHERE c.id = NEW.contributor_id;

  SELECT name INTO v_subject_name
  FROM public.subjects
  WHERE subject_uuid = NEW.subject_id;

  IF NEW.ai_vendor_1_result ILIKE '%opinion%' THEN
    v_contributor_label := COALESCE(NULLIF(v_full_name, ''), 'SuperHero123');
  ELSIF NEW.ai_vendor_1_result ILIKE '%evidence%' AND NEW.contributor_identity_preference = TRUE THEN
    v_contributor_label := COALESCE(NULLIF(v_full_name, ''), 'SuperHero123');
  ELSE
    v_contributor_label := 'SuperHero123';
  END IF;

  NEW.record_alias := v_contributor_label || ' • ' || COALESCE(v_subject_name, 'Unknown');

  RETURN NEW;
END;
$fn$;

create or replace function public.trigger_debate_on_deletion_request() returns trigger language plpgsql as $fn$
BEGIN
  IF NEW.status = 'deletion_request' AND OLD.status != 'deletion_request' THEN
    NEW.debate_started_at = NOW();
    NEW.debate_ends_at = NOW() + INTERVAL '7 days';
    NEW.status = 'debate';
  END IF;
  RETURN NEW;
END;
$fn$;
drop trigger if exists on_deletion_request on public.records;
create trigger on_deletion_request before update on public.records for each row execute function public.trigger_debate_on_deletion_request();

commit;
