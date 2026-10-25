-- KJ, Oct 25:
--  1) The stage is called "Debate" again everywhere (it was "Both sides").
--  2) Voters get a "Thanks for voting" notice when voting closes (email: voting_ended_voter).
--  3) The "comment again" notice matches when it's sent (right when results come out).
--  4) Blog posts use "debate" for the stage.
-- All or nothing: if any expected text isn't found, it stops and nothing changes.

DO $all$
DECLARE
  d text;
  before text;
  n int;
BEGIN
  -- 1a) Replies in the debate
  d := pg_get_functiondef('public.trigger_debate_reply_notification'::regproc);
  before := d;
  d := replace(d, $s$'New post in Both sides'$s$, $s$'New post in your debate'$s$);
  d := replace(d, $s$'New reply in Both sides'$s$, $s$'New reply in your debate'$s$);
  d := replace(d, $s$' replied in Both sides.'$s$, $s$' replied in the debate.'$s$);
  IF d = before OR position('Both sides' IN d) > 0 THEN
    RAISE EXCEPTION 'debate reply notice not as expected; nothing changed';
  END IF;
  EXECUTE d;

  -- 1b) Stage notices for people following or pinning a record + 2) voters' notice
  d := pg_get_functiondef('public.trigger_record_notifications'::regproc);
  before := d;
  d := replace(d, $s$'Both sides are talking'$s$, $s$'A debate has started'$s$);
  d := replace(d, $s$'A record you pinned was challenged. Both sides are sharing their story now.'$s$,
                  $s$'A record you pinned was challenged, and the debate has started.'$s$);
  d := replace(d, $s$'A record you follow was challenged. Both sides are sharing their story now.'$s$,
                  $s$'A record you follow was challenged, and the debate has started.'$s$);
  IF position($s$'voting_ended_contributor', new.id);$s$ IN d) = 0 THEN
    RAISE EXCEPTION 'record notices not as expected (voting closed); nothing changed';
  END IF;
  d := replace(d, $s$'voting_ended_contributor', new.id);$s$,
    $s$'voting_ended_contributor', new.id);
      -- Everyone who voted (not the writer or the person it's about)
      insert into public.notifications (user_id, title, body, type, record_id)
      select distinct v.user_id, 'Thanks for voting', 'Voting has closed. Results come out in about a week.', 'voting_ended_voter', new.id
      from public.record_votes v
      where v.record_id = new.id
        and v.user_id is not null
        and v.user_id != coalesce(v_subject_auth_user_id, '00000000-0000-0000-0000-000000000000')
        and v.user_id != coalesce(v_contributor_auth_user_id, '00000000-0000-0000-0000-000000000000');$s$);
  IF d = before OR position('Both sides' IN d) > 0 OR position('voting_ended_voter' IN d) = 0 THEN
    RAISE EXCEPTION 'record notices not as expected; nothing changed';
  END IF;
  EXECUTE d;

  -- 3) "Comment again" notice
  d := pg_get_functiondef('public.process_notification_queue'::regproc);
  before := d;
  d := replace(d, 'You can join the conversation again', 'You can comment on this record now');
  d := replace(d, 'It''''s been a week since the results came out. You can now post in the record''''s community section.',
                  'Now that the results are out, you can comment on this record.');
  IF d = before OR position('a week since' IN d) > 0 THEN
    RAISE EXCEPTION 'comment-again notice not as expected; nothing changed';
  END IF;
  EXECUTE d;

  -- 4) Blog posts
  UPDATE public.blog_posts SET
    content = replace(replace(replace(replace(replace(content,
      'A challenge opens **Both sides**, where:', 'A challenge opens a **debate**, where:'),
      'When Both sides is done,', 'When the debate is done,'),
      'it opens Both sides.', 'it opens a debate.'),
      '## Step 4: Both Sides', '## Step 4: The Debate'),
      'Both sides is open for a set time, then closes.', 'The debate is open for a set time, then closes.'),
    description = replace(description, '— Both sides, the Community vote,', '— the debate, the Community vote,'),
    updated_at = now()
  WHERE slug IN ('what-to-do-if-someone-posts-something-false-about-you-on-dnounce', 'what-happens-when-a-review-is-disputed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 OR EXISTS (SELECT 1 FROM public.blog_posts WHERE content LIKE '%Both sides is%' OR content LIKE '%opens Both sides%' OR content LIKE '%Both Sides%') THEN
    RAISE EXCEPTION 'blog posts not as expected; nothing changed';
  END IF;
END
$all$;
