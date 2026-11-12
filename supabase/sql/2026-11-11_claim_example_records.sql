-- KJ, Nov 11: two example records for the claim page (one great, one bad), so people
-- can see how records look on their profile. They're demo pages like the others
-- (dnounce.com/d/claim-example-great and /d/claim-example-bad); the claim page shows
-- them with the person's own name. Written without he/she so any name fits.
-- Copies an existing demo row for any columns not set here. Safe to run twice.

DO $ex$
DECLARE
  base public.demo_records%ROWTYPE;
  id_type text;
  new_id jsonb;
  alias jsonb;
  j jsonb;
BEGIN
  SELECT * INTO base FROM public.demo_records ORDER BY slug LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No demo pages found to copy from; nothing changed.'; END IF;

  SELECT data_type INTO id_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'demo_records' AND column_name = 'id';

  -- Anonymous names for the example voters, borrowed from an existing demo
  alias := coalesce(to_jsonb(base) -> 'seed_votes', '[]'::jsonb);

  ---------------------------------------------------------------- great record
  IF NOT EXISTS (SELECT 1 FROM public.demo_records WHERE slug = 'claim-example-great') THEN
    new_id := CASE WHEN id_type = 'uuid' THEN to_jsonb(gen_random_uuid())
                   ELSE to_jsonb((SELECT coalesce(max(id::text::bigint), 0) + 1 FROM public.demo_records)) END;
    j := to_jsonb(base) || jsonb_build_object(
      'id', new_id,
      'slug', 'claim-example-great',
      'record_id', 'a1000101-0000-0000-0000-000000000101',
      'subject_name', 'Alex Rivera',
      'subject_organization', 'Independent',
      'subject_location', 'New York, NY',
      'subject_demo_url', '/',
      'contributor_name', 'Jordan P.',
      'category', 'Home services',
      'relationship', 'Client',
      'rating', 9,
      'created_at_display', '2026-10-02',
      'description', 'Alex did a great job from start to finish. Showed up on time, explained everything before starting, and gave a fair price with no surprises. When a small issue came up a week later, Alex came back the same day and fixed it at no charge. I''d hire Alex again without thinking twice.',
      'debate_posts', '[]'::jsonb,
      'debate_reactions', '{}'::jsonb,
      'attachments', '[]'::jsonb,
      'seed_votes', '[]'::jsonb
    );
    INSERT INTO public.demo_records SELECT (jsonb_populate_record(NULL::public.demo_records, j)).*;
  END IF;

  ---------------------------------------------------------------- bad record (challenged)
  IF NOT EXISTS (SELECT 1 FROM public.demo_records WHERE slug = 'claim-example-bad') THEN
    new_id := CASE WHEN id_type = 'uuid' THEN to_jsonb(gen_random_uuid())
                   ELSE to_jsonb((SELECT coalesce(max(id::text::bigint), 0) + 1 FROM public.demo_records)) END;
    j := to_jsonb(base) || jsonb_build_object(
      'id', new_id,
      'slug', 'claim-example-bad',
      'record_id', 'a1000102-0000-0000-0000-000000000102',
      'subject_name', 'Alex Rivera',
      'subject_organization', 'Independent',
      'subject_location', 'New York, NY',
      'subject_demo_url', '/',
      'contributor_name', 'Taylor M.',
      'category', 'Home services',
      'relationship', 'Client',
      'rating', 2,
      'created_at_display', '2026-09-18',
      'description', 'Alex quoted one price and then charged almost double when the job was done. The work took three weeks longer than promised, and calls went unanswered for days at a time. Some of it had to be redone by someone else.',
      'debate_posts', jsonb_build_array(
        jsonb_build_object('id', 'ex-p1', 'role', 'subject', 'name', 'Alex Rivera', 'parentId', null, 'created_at', '2026-09-20T15:10:00Z',
          'body', 'The price went up because extra work was added halfway through, and I sent the new quote by text before starting it. The delay came from waiting on materials, which I explained at the time. I''m happy to share the messages.'),
        jsonb_build_object('id', 'ex-p2', 'role', 'contributor', 'name', 'Taylor M.', 'parentId', null, 'created_at', '2026-09-20T19:42:00Z',
          'body', 'The extra work was small. I never agreed to a price that high, and nobody mentioned a materials delay until I asked.'),
        jsonb_build_object('id', 'ex-p3', 'role', 'subject', 'name', 'Alex Rivera', 'parentId', 'ex-p2', 'created_at', '2026-09-21T09:05:00Z',
          'body', 'Here is the text from Sept 2 with the updated quote, and the supplier''s delay notice. I should have called more often, and I''ve changed how I give updates since.')
      ),
      'debate_reactions', jsonb_build_object(
        'ex-p1', jsonb_build_object('agree', 14, 'disagree', 6, 'mine', null),
        'ex-p2', jsonb_build_object('agree', 9, 'disagree', 11, 'mine', null),
        'ex-p3', jsonb_build_object('agree', 17, 'disagree', 4, 'mine', null)
      ),
      'attachments', '[]'::jsonb,
      'seed_votes', jsonb_build_array(
        jsonb_build_object('id', 'ex-v1', 'alias', coalesce(alias->0->>'alias', 'Community member #7314'), 'choice', 'side_with_subject', 'created_at', '2026-09-23T13:00:00Z', 'agreeCount', 12, 'disagreeCount', 2,
          'explanation', 'There''s a text with the new quote sent before the extra work started. That counts as agreeing to it.'),
        jsonb_build_object('id', 'ex-v2', 'alias', coalesce(alias->1->>'alias', 'Community member #2056'), 'choice', 'side_with_contributor', 'created_at', '2026-09-23T16:20:00Z', 'agreeCount', 7, 'disagreeCount', 5,
          'explanation', 'Almost double for small extra work is a lot. A bigger change like that should have been signed off in writing.'),
        jsonb_build_object('id', 'ex-v3', 'alias', coalesce(alias->2->>'alias', 'Community member #9481'), 'choice', 'side_with_subject', 'created_at', '2026-09-24T10:45:00Z', 'agreeCount', 9, 'disagreeCount', 1,
          'explanation', 'Both sides agree extra work was asked for, and the supplier notice explains the delay. Communication could have been better, but the record leaves that out.'),
        jsonb_build_object('id', 'ex-v4', 'alias', coalesce(alias->3->>'alias', 'Community member #3627'), 'choice', 'side_with_contributor', 'created_at', '2026-09-24T18:30:00Z', 'agreeCount', 6, 'disagreeCount', 4,
          'explanation', 'Three weeks late with calls going unanswered is a real problem, whatever the reason.')
      )
    );
    INSERT INTO public.demo_records SELECT (jsonb_populate_record(NULL::public.demo_records, j)).*;
  END IF;
END
$ex$;

-- Check
SELECT slug, subject_name, rating, jsonb_array_length(coalesce(debate_posts, '[]'::jsonb)) AS debate_posts
  FROM public.demo_records WHERE slug LIKE 'claim-example-%' ORDER BY slug;
