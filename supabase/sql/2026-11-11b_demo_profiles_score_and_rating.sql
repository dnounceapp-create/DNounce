-- KJ, Nov 11: profiles show the subject score (0–100) and each record card shows its rating.
-- The demo profiles still had the old small scores (like 2.8) and no rating on their
-- record cards. This puts their scores on the 0–100 scale (old × 20) and copies each
-- demo record's rating onto its card. A backup is kept (locked, not public).
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS public.demo_records_backup_20261111 AS SELECT * FROM public.demo_records;
ALTER TABLE public.demo_records_backup_20261111 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_records_backup_20261111 FROM anon, authenticated;

-- 1) Scores on the 0–100 scale (only ones still on the old small scale)
UPDATE public.demo_records
   SET subject_scores = jsonb_set(subject_scores::jsonb, '{subject_score}',
         to_jsonb(round(((subject_scores::jsonb ->> 'subject_score')::numeric) * 20)))
 WHERE subject_scores IS NOT NULL
   AND (subject_scores::jsonb ->> 'subject_score') ~ '^[0-9.]+$'
   AND (subject_scores::jsonb ->> 'subject_score')::numeric <= 5;

-- 2) Each record card gets the rating of the demo record it opens
UPDATE public.demo_records d
   SET subject_records = (
     SELECT coalesce(jsonb_agg(
              CASE WHEN r ? 'rating' THEN r
                   ELSE r || jsonb_build_object('rating', (SELECT x.rating FROM public.demo_records x WHERE x.record_id::text = r->>'id' LIMIT 1))
              END), '[]'::jsonb)
       FROM jsonb_array_elements(d.subject_records::jsonb) r)
 WHERE d.subject_records IS NOT NULL;

-- Check
SELECT slug,
       subject_scores::jsonb ->> 'subject_score' AS subject_score,
       (SELECT string_agg(r->>'rating', ', ') FROM jsonb_array_elements(subject_records::jsonb) r) AS card_ratings
  FROM public.demo_records
 WHERE slug NOT LIKE 'claim-example-%'
 ORDER BY slug;
