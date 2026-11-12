-- KJ, Nov 11: two demo records for the claim page (one great, one bad), so people can
-- see how records look on their profile. Both are written by DNounce App. The claim
-- page shows them with the person's own name, inside their profile. Written without
-- he/she so any name fits. Attachments use the DNounce logo.
-- Adds the two rows if missing (copying an existing demo row for any other columns),
-- then sets their content. Safe to run again: it just refreshes the content.

DO $ex$
DECLARE
  base public.demo_records%ROWTYPE;
  id_type text;
  new_id jsonb;
  s text;
BEGIN
  SELECT * INTO base FROM public.demo_records WHERE slug NOT LIKE 'claim-example-%' ORDER BY slug LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No demo pages found to copy from; nothing changed.'; END IF;
  SELECT data_type INTO id_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'demo_records' AND column_name = 'id';

  -- 1) Make sure both rows exist
  FOREACH s IN ARRAY ARRAY['claim-example-great', 'claim-example-bad'] LOOP
    IF NOT EXISTS (SELECT 1 FROM public.demo_records WHERE slug = s) THEN
      new_id := CASE WHEN id_type = 'uuid' THEN to_jsonb(gen_random_uuid())
                     ELSE to_jsonb((SELECT coalesce(max(id::text::bigint), 0) + 1 FROM public.demo_records)) END;
      INSERT INTO public.demo_records
      SELECT (jsonb_populate_record(NULL::public.demo_records, to_jsonb(base) || jsonb_build_object(
        'id', new_id,
        'slug', s,
        'record_id', CASE WHEN s = 'claim-example-great' THEN 'a1000101-0000-0000-0000-000000000101' ELSE 'a1000102-0000-0000-0000-000000000102' END
      ))).*;
    END IF;
  END LOOP;

  -- 2) The great record (not challenged)
  UPDATE public.demo_records SET
    subject_name = 'Alex Rivera', subject_organization = 'Independent', subject_location = 'New York, NY', subject_demo_url = '/',
    contributor_name = 'DNounce App', category = 'Home services', relationship = 'Client', rating = 9,
    created_at_display = '2026-10-02',
    description = 'Alex did a great job from start to finish. Showed up on time, explained everything before starting, and gave a fair price with no surprises. When a small issue came up a week later, Alex came back the same day and fixed it at no charge. I''d hire Alex again without thinking twice.',
    attachments = jsonb_build_array(
      jsonb_build_object('id', 'ex-g-a1', 'label', 'Photo of the finished work', 'type', 'image', 'src', '/logo.png', 'agree', 12, 'disagree', 0),
      jsonb_build_object('id', 'ex-g-a2', 'label', 'Final invoice', 'type', 'image', 'src', '/logo.png', 'agree', 4, 'disagree', 0)
    ),
    debate_posts = '[]'::jsonb,
    debate_reactions = '{}'::jsonb,
    seed_votes = '[]'::jsonb
  WHERE slug = 'claim-example-great';

  -- 3) The bad record (challenged, debate, community vote open)
  UPDATE public.demo_records SET
    subject_name = 'Alex Rivera', subject_organization = 'Independent', subject_location = 'New York, NY', subject_demo_url = '/',
    contributor_name = 'DNounce App', category = 'Home services', relationship = 'Client', rating = 2,
    created_at_display = '2026-09-18',
    description = 'Alex quoted one price and then charged almost double when the job was done. The work took three weeks longer than promised, and calls went unanswered for days at a time. Some of it had to be redone by someone else.',
    attachments = jsonb_build_array(
      jsonb_build_object('id', 'ex-b-a1', 'label', 'Original quote', 'type', 'image', 'src', '/logo.png', 'agree', 7, 'disagree', 2),
      jsonb_build_object('id', 'ex-b-a2', 'label', 'Final bill', 'type', 'image', 'src', '/logo.png', 'agree', 9, 'disagree', 3)
    ),
    debate_posts = jsonb_build_array(
      jsonb_build_object('id', 'ex-p1', 'role', 'subject', 'name', 'Alex Rivera', 'parentId', null, 'created_at', '2026-09-20T15:10:00Z',
        'body', 'The price went up because extra work was added halfway through, and I sent the new quote by text before starting it. The delay came from waiting on materials, which I explained at the time.',
        'attachments', jsonb_build_array(jsonb_build_object('id', 'ex-p1-a1', 'label', 'Text with the new quote', 'type', 'image', 'src', '/logo.png'))),
      jsonb_build_object('id', 'ex-p2', 'role', 'contributor', 'name', 'DNounce App', 'parentId', null, 'created_at', '2026-09-20T19:42:00Z',
        'body', 'The extra work was small. I never agreed to a price that high, and nobody mentioned a materials delay until I asked.'),
      jsonb_build_object('id', 'ex-p3', 'role', 'subject', 'name', 'Alex Rivera', 'parentId', 'ex-p2', 'created_at', '2026-09-21T09:05:00Z',
        'body', 'Here is the supplier''s delay notice from that week. I should have called more often, and I''ve changed how I give updates since.',
        'attachments', jsonb_build_array(jsonb_build_object('id', 'ex-p3-a1', 'label', 'Supplier delay notice', 'type', 'image', 'src', '/logo.png'))),
      jsonb_build_object('id', 'ex-p4', 'role', 'contributor', 'name', 'DNounce App', 'parentId', 'ex-p2', 'created_at', '2026-09-21T13:30:00Z',
        'body', 'The notice is dated after the original finish date, so it doesn''t explain the first week of delay. The work that had to be redone is in the photo.',
        'attachments', jsonb_build_array(jsonb_build_object('id', 'ex-p4-a1', 'label', 'Photo of the work redone', 'type', 'image', 'src', '/logo.png'))),
      jsonb_build_object('id', 'ex-p5', 'role', 'subject', 'name', 'Alex Rivera', 'parentId', null, 'created_at', '2026-09-22T10:00:00Z',
        'body', 'That section was redone because the layout changed after it was finished, which the text messages also show. I''m happy to let the community decide.')
    ),
    debate_reactions = jsonb_build_object(
      'ex-p1', jsonb_build_object('agree', 14, 'disagree', 6, 'mine', null),
      'ex-p2', jsonb_build_object('agree', 9, 'disagree', 11, 'mine', null),
      'ex-p3', jsonb_build_object('agree', 17, 'disagree', 4, 'mine', null),
      'ex-p4', jsonb_build_object('agree', 10, 'disagree', 8, 'mine', null),
      'ex-p5', jsonb_build_object('agree', 12, 'disagree', 5, 'mine', null)
    ),
    seed_votes = jsonb_build_array(
      jsonb_build_object('id', 'ex-v1', 'alias', 'jw@dnounce_731', 'choice', 'side_with_subject', 'created_at', '2026-09-23T13:00:00Z', 'agreeCount', 12, 'disagreeCount', 2,
        'explanation', 'There''s a text with the new quote sent before the extra work started. That counts as agreeing to it.'),
      jsonb_build_object('id', 'ex-v2', 'alias', 'mara@dnounce_205', 'choice', 'side_with_contributor', 'created_at', '2026-09-23T16:20:00Z', 'agreeCount', 7, 'disagreeCount', 5,
        'explanation', 'Almost double for small extra work is a lot. A bigger change like that should have been signed off in writing.'),
      jsonb_build_object('id', 'ex-v3', 'alias', 'dk@dnounce_948', 'choice', 'side_with_subject', 'created_at', '2026-09-24T10:45:00Z', 'agreeCount', 9, 'disagreeCount', 1,
        'explanation', 'Both sides agree extra work was asked for, and the supplier notice explains most of the delay.'),
      jsonb_build_object('id', 'ex-v4', 'alias', 'sol@dnounce_362', 'choice', 'side_with_contributor', 'created_at', '2026-09-24T18:30:00Z', 'agreeCount', 6, 'disagreeCount', 4,
        'explanation', 'Three weeks late with calls going unanswered is a real problem, whatever the reason.')
    )
  WHERE slug = 'claim-example-bad';
END
$ex$;

-- Check
SELECT slug, contributor_name, rating,
       jsonb_array_length(coalesce(debate_posts::jsonb, '[]'::jsonb)) AS debate_posts,
       jsonb_array_length(coalesce(attachments::jsonb, '[]'::jsonb)) AS attachments
  FROM public.demo_records WHERE slug LIKE 'claim-example-%' ORDER BY slug;
