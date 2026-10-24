-- Fix the subject score so it points the right way (KJ, 2026-10-24).
-- The score is only used for ranks on the Analytics page and the "Well Regarded" badge.
--
-- Before: a 2-star record RAISED the score and a 10-star record LOWERED it, and one
-- version counted "most people sided with the writer" in the person's favor.
-- After (both versions identical):
--   40%  share of public records where most people sided with the person
--   30%  share of public records that were never challenged   (unchanged)
--   30%  average star rating / 10  (higher stars = higher score)
--
-- Safe: keeps a backup of current scores, checks the old text is there before
-- changing anything, and stops with nothing changed if it isn't.

CREATE TABLE IF NOT EXISTS public.subject_scores_backup_20261024 AS
  SELECT * FROM public.subject_scores;

DO $fix$
DECLARE
  def text;
  new_def text;
BEGIN
  -- 1) compute_subject_score_by_uuid
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'compute_subject_score_by_uuid';
  IF def IS NULL THEN RAISE EXCEPTION 'compute_subject_score_by_uuid not found; nothing changed'; END IF;
  IF position('AND final_outcome = ''keep'';' IN def) = 0
     OR position('(((10 - v_avg_rating) / 10) * 30)' IN def) = 0 THEN
    RAISE EXCEPTION 'compute_subject_score_by_uuid is not as expected; nothing changed';
  END IF;
  new_def := replace(def, 'AND final_outcome = ''keep'';',
                          'AND final_outcome IN (''delete'', ''sided_with_subject'', ''side_with_subject'');');
  new_def := replace(new_def, '(((10 - v_avg_rating) / 10) * 30)', '((v_avg_rating / 10) * 30)');
  EXECUTE new_def;

  -- 2) compute_subject_score (by user): use the same calculation
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'compute_subject_score';
  IF def IS NULL THEN RAISE EXCEPTION 'compute_subject_score not found; nothing changed'; END IF;
  IF position('IF v_subject_uuid IS NULL THEN RETURN NULL; END IF;' IN def) = 0 THEN
    RAISE EXCEPTION 'compute_subject_score is not as expected; nothing changed';
  END IF;
  new_def := replace(def, 'IF v_subject_uuid IS NULL THEN RETURN NULL; END IF;',
                          'IF v_subject_uuid IS NULL THEN RETURN NULL; END IF;' || chr(10) ||
                          '  RETURN public.compute_subject_score_by_uuid(v_subject_uuid);');
  EXECUTE new_def;

  -- 3) Recalculate stored scores
  UPDATE public.subject_scores
     SET subject_score = public.compute_subject_score_by_uuid(subject_uuid),
         updated_at = now();
END
$fix$;

-- Check: before vs after for every scored profile.
SELECT b.subject_uuid, b.subject_score AS before, s.subject_score AS after
FROM public.subject_scores_backup_20261024 b
JOIN public.subject_scores s USING (subject_uuid)
WHERE b.subject_score IS NOT NULL OR s.subject_score IS NOT NULL
ORDER BY s.subject_score DESC NULLS LAST;
