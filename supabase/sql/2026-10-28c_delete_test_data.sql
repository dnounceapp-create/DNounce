-- Delete test data (KJ, Oct 28):
--   * record 19b99d72 "test" by Kenny V. (about DNounce App)
--   * record ac3d9478 "video editor" by John D. (about DNounce App)
--   * 2 empty duplicate "Marcus Webb, New York, NY" profiles (93627577, 6b055787)
-- NOT touched: the kitchen-renovation record, demo pages, DNounce-posted records, any other profile.
--
-- Everything removed is saved first in public.deleted_rows_backup_20261028
-- (table name + the full row), so it can be restored.
-- All or nothing: if anything doesn't match exactly, it stops and nothing changes.

CREATE TABLE IF NOT EXISTS public.deleted_rows_backup_20261028 (
  table_name text,
  row_data jsonb,
  deleted_at timestamptz DEFAULT now()
);

DO $del$
DECLARE
  rec_ids uuid[];
  subj_ids uuid[];
  t record;
  n int;
BEGIN
  -- The 2 test records, matched exactly
  SELECT array_agg(id) INTO rec_ids FROM public.records
  WHERE (id::text LIKE '19b99d72%' AND description = 'test')
     OR (id::text LIKE 'ac3d9478%' AND description ILIKE 'Hired this person to edit a video%');
  IF coalesce(array_length(rec_ids, 1), 0) <> 2 THEN
    RAISE EXCEPTION 'Expected 2 test records, found %. Nothing changed.', coalesce(array_length(rec_ids, 1), 0);
  END IF;

  -- The 2 empty Marcus Webb copies, matched exactly (unclaimed, New York, no records)
  SELECT array_agg(subject_uuid) INTO subj_ids FROM public.subjects s
  WHERE (s.subject_uuid::text LIKE '93627577%' OR s.subject_uuid::text LIKE '6b055787%')
    AND s.name = 'Marcus Webb' AND s.location = 'New York, NY' AND s.owner_auth_user_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.records r WHERE r.subject_id = s.subject_uuid);
  IF coalesce(array_length(subj_ids, 1), 0) <> 2 THEN
    RAISE EXCEPTION 'Expected 2 empty Marcus Webb profiles, found %. Nothing changed.', coalesce(array_length(subj_ids, 1), 0);
  END IF;

  -- Rows in other tables that point at these records (comments, votes, views, notices...): back up, then remove
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'record_id' AND c.table_name NOT LIKE '%backup%'
  LOOP
    EXECUTE format('INSERT INTO public.deleted_rows_backup_20261028 (table_name, row_data) SELECT %L, to_jsonb(x) FROM public.%I x WHERE x.record_id::text = ANY ($1)', t.table_name, t.table_name)
      USING (SELECT array_agg(i::text) FROM unnest(rec_ids) i);
    EXECUTE format('DELETE FROM public.%I WHERE record_id::text = ANY ($1)', t.table_name)
      USING (SELECT array_agg(i::text) FROM unnest(rec_ids) i);
  END LOOP;

  INSERT INTO public.deleted_rows_backup_20261028 (table_name, row_data)
  SELECT 'records', to_jsonb(r) FROM public.records r WHERE r.id = ANY (rec_ids);
  DELETE FROM public.records WHERE id = ANY (rec_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'deleted % records', n;

  -- Rows in other tables that point at the 2 empty profiles (scores, views...): back up, then remove
  FOR t IN
    SELECT c.table_name, c.column_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name IN ('subject_id', 'subject_uuid')
      AND c.table_name NOT IN ('subjects', 'records', 'users') AND c.table_name NOT LIKE '%backup%'
  LOOP
    EXECUTE format('INSERT INTO public.deleted_rows_backup_20261028 (table_name, row_data) SELECT %L, to_jsonb(x) FROM public.%I x WHERE x.%I::text = ANY ($1)', t.table_name, t.table_name, t.column_name)
      USING (SELECT array_agg(i::text) FROM unnest(subj_ids) i);
    EXECUTE format('DELETE FROM public.%I WHERE %I::text = ANY ($1)', t.table_name, t.column_name)
      USING (SELECT array_agg(i::text) FROM unnest(subj_ids) i);
  END LOOP;

  -- Never delete an account: just unlink it if it pointed at one of these profiles
  UPDATE public.users SET subject_id = NULL WHERE subject_id::text = ANY (SELECT i::text FROM unnest(subj_ids) i);

  INSERT INTO public.deleted_rows_backup_20261028 (table_name, row_data)
  SELECT 'subjects', to_jsonb(s) FROM public.subjects s WHERE s.subject_uuid = ANY (subj_ids);
  DELETE FROM public.subjects WHERE subject_uuid = ANY (subj_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'deleted % profiles', n;
END
$del$;

-- Check: what was removed (backup contents by table)
SELECT table_name, count(*) FROM public.deleted_rows_backup_20261028 GROUP BY table_name ORDER BY table_name;
