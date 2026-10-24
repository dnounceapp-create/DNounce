-- Undo 2026-10-24c: restores the old function text and the old stored scores.
-- Only run this if KJ asks to go back.
DO $rb$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='compute_subject_score_by_uuid';
  def := replace(def, 'AND final_outcome IN (''delete'', ''sided_with_subject'', ''side_with_subject'');', 'AND final_outcome = ''keep'';');
  def := replace(def, '((v_avg_rating / 10) * 30)', '(((10 - v_avg_rating) / 10) * 30)');
  EXECUTE def;
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='compute_subject_score';
  def := replace(def, chr(10) || '  RETURN public.compute_subject_score_by_uuid(v_subject_uuid);', '');
  EXECUTE def;
  UPDATE public.subject_scores s SET subject_score = b.subject_score, updated_at = now()
  FROM public.subject_scores_backup_20261024 b WHERE b.subject_uuid = s.subject_uuid;
END $rb$;
