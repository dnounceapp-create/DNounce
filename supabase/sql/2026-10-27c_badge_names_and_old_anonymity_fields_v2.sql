-- KJ, Oct 27: everything should match end to end. (v2: also switches off the old AI-review trigger.)
--  1) Badges are stored under the names people see:
--       Top Contributor -> Top Writer, Top Subject -> Well Regarded,
--       Top Citizen -> Top Community Member, Convicted -> Lost voting rights.
--     Every database function that awards or describes badges is updated too.
--  2) The old "Anonymity Granted / Not Granted" fields are emptied. Nothing on the
--     site uses them anymore, but anyone could read them in the raw record data.
-- Backups of both are kept. All or nothing: if anything looks unexpected, it stops
-- and nothing changes.

DO $all$
DECLARE
  f record;
  d text;
  refs text;
  n int;
BEGIN
  ----------------------------------------------------------------------------
  -- Old "AI review" trigger: dead code (it only acts when three AI results are
  -- all filled in, which never happens now, and it refers to the long-renamed
  -- "credibility" column). Switched off, not deleted. To switch back on:
  --   ALTER TABLE public.records ENABLE TRIGGER trigger_process_ai_verification;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_process_ai_verification' AND tgrelid = 'public.records'::regclass) THEN
    ALTER TABLE public.records DISABLE TRIGGER trigger_process_ai_verification;
  END IF;

  ----------------------------------------------------------------------------
  -- Safety check for (2): stop if any view or other function still reads the
  -- old anonymity fields, so emptying them can't break anything.
  -- (process_ai_verification is the switched-off trigger above.)
  SELECT string_agg(name, ', ') INTO refs FROM (
    SELECT 'function ' || p.proname AS name
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.prokind = 'f' AND p.proname <> 'process_ai_verification'
      AND (p.prosrc ILIKE '%anonymity_status%' OR p.prosrc ILIKE '%ai_vendor_1_result%' OR p.prosrc ILIKE '%ai_vendor_1_score%')
    UNION ALL
    SELECT 'view ' || viewname
    FROM pg_views
    WHERE schemaname = 'public'
      AND (definition ILIKE '%anonymity_status%' OR definition ILIKE '%ai_vendor_1_result%' OR definition ILIKE '%ai_vendor_1_score%')
  ) x;
  IF refs IS NOT NULL THEN
    RAISE EXCEPTION 'These still read the old anonymity fields: %. Nothing changed — send this message to Claude.', refs;
  END IF;

  ----------------------------------------------------------------------------
  -- Backups
  CREATE TABLE IF NOT EXISTS public.badges_backup_20261027 AS SELECT * FROM public.badges;
  CREATE TABLE IF NOT EXISTS public.records_anonymity_backup_20261027 AS
    SELECT id, anonymity_status, ai_vendor_1_result, ai_vendor_1_score FROM public.records;

  ----------------------------------------------------------------------------
  -- (1) Badge rows
  UPDATE public.badges SET label = 'Top Writer'           WHERE label = 'Top Contributor';
  UPDATE public.badges SET label = 'Well Regarded'        WHERE label = 'Top Subject';
  UPDATE public.badges SET label = 'Top Community Member' WHERE label = 'Top Citizen';
  UPDATE public.badges SET label = 'Lost voting rights'   WHERE label = 'Convicted';

  -- (1) Every function that uses the old badge names
  n := 0;
  FOR f IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.prokind = 'f'
      AND (p.prosrc LIKE '%''Top Contributor''%' OR p.prosrc LIKE '%''Top Subject''%'
           OR p.prosrc LIKE '%''Top Citizen''%' OR p.prosrc LIKE '%''Convicted''%')
  LOOP
    d := pg_get_functiondef(f.oid);
    d := replace(d, '''Top Contributor''', '''Top Writer''');
    d := replace(d, '''Top Subject''', '''Well Regarded''');
    d := replace(d, '''Top Citizen''', '''Top Community Member''');
    d := replace(d, '''Convicted''', '''Lost voting rights''');
    EXECUTE d;
    n := n + 1;
    RAISE NOTICE 'updated badge names in %', f.proname;
  END LOOP;
  IF n = 0 THEN
    RAISE EXCEPTION 'No badge functions found with the old names; nothing changed — send this message to Claude.';
  END IF;

  -- Nothing may still use the old names
  IF EXISTS (SELECT 1 FROM public.badges WHERE label IN ('Top Contributor', 'Top Subject', 'Top Citizen', 'Convicted'))
     OR EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
       WHERE ns.nspname = 'public'
         AND (p.prosrc LIKE '%''Top Contributor''%' OR p.prosrc LIKE '%''Top Subject''%' OR p.prosrc LIKE '%''Top Citizen''%'))
  THEN
    RAISE EXCEPTION 'Old badge names still found; nothing changed — send this message to Claude.';
  END IF;

  ----------------------------------------------------------------------------
  -- (2) Empty the old anonymity fields
  UPDATE public.records
     SET anonymity_status = NULL, ai_vendor_1_result = NULL, ai_vendor_1_score = NULL
   WHERE anonymity_status IS NOT NULL OR ai_vendor_1_result IS NOT NULL OR ai_vendor_1_score IS NOT NULL;
END
$all$;

-- Check: badge counts by name (old names should not appear).
SELECT label, count(*) FROM public.badges GROUP BY label ORDER BY label;
