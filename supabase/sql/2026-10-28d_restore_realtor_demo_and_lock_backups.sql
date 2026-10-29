-- 1) Put back the realtor demo row that the test-data delete removed by mistake
--    (it pointed at one of the deleted test records; that link is cleared).
-- 2) Make every backup table private (row level security on, no public access).
-- Safe to run more than once.

DO $fix$
DECLARE
  t record;
  restored int := 0;
BEGIN
  -- 1) Restore demo row(s) from the backup, unless already back
  INSERT INTO public.demo_records
  SELECT (jsonb_populate_record(NULL::public.demo_records, b.row_data || jsonb_build_object('record_id', NULL))).*
  FROM public.deleted_rows_backup_20261028 b
  WHERE b.table_name = 'demo_records'
    AND NOT EXISTS (SELECT 1 FROM public.demo_records d WHERE d.id::text = b.row_data->>'id');
  GET DIAGNOSTICS restored = ROW_COUNT;
  RAISE NOTICE 'restored % demo row(s)', restored;

  -- 2) Lock every backup table
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%backup%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
    RAISE NOTICE 'locked %', t.tablename;
  END LOOP;
END
$fix$;

-- Check: demo pages present (realtor should be back)
SELECT slug FROM public.demo_records ORDER BY slug;
