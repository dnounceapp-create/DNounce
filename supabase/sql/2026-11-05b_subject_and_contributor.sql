-- KJ, Nov 5: "no just subject and contributor".
--   "the writer"            -> "the contributor"
--   "the person it's about" -> "the subject"
--   Badges: Top Writer -> Top Contributor, Well Regarded -> Top Subject
-- Covers: badges, every database function that writes notices or awards badges,
-- notices already sent, and blog posts. Backups are kept (locked, not public).
-- All or nothing: if anything looks unexpected, it stops and nothing changes.

DO $all$
DECLARE
  f record;
  d text;
  n int := 0;
BEGIN
  -- Backups (locked like the other backup tables)
  CREATE TABLE IF NOT EXISTS public.badges_backup_20261105 AS SELECT * FROM public.badges;
  CREATE TABLE IF NOT EXISTS public.notifications_backup_20261105 AS
    SELECT id, title, body FROM public.notifications
     WHERE title ~* '(writer|person it.s about|Well Regarded)' OR body ~* '(writer|person it.s about|Well Regarded)';
  CREATE TABLE IF NOT EXISTS public.blog_posts_backup_20261105 AS SELECT * FROM public.blog_posts;
  ALTER TABLE public.badges_backup_20261105        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.notifications_backup_20261105 ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.blog_posts_backup_20261105    ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.badges_backup_20261105, public.notifications_backup_20261105, public.blog_posts_backup_20261105 FROM anon, authenticated;

  -- 1) Badges
  UPDATE public.badges SET label = 'Top Contributor' WHERE label = 'Top Writer';
  UPDATE public.badges SET label = 'Top Subject'     WHERE label = 'Well Regarded';

  -- 2) Database functions (notices, badge awards)
  FOR f IN
    SELECT p.oid, p.proname
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND p.proname <> 'process_ai_verification'
       AND (p.prosrc ~* 'person it''''s about' OR p.prosrc ~* '\mwriter'
            OR p.prosrc LIKE '%''Top Writer''%' OR p.prosrc LIKE '%''Well Regarded''%')
  LOOP
    d := pg_get_functiondef(f.oid);
    d := replace(d, 'The person it''''s about', 'The subject');
    d := replace(d, 'the person it''''s about', 'the subject');
    d := replace(d, 'The writer''''s', 'The contributor''''s');
    d := replace(d, 'the writer''''s', 'the contributor''''s');
    d := replace(d, 'The writer', 'The contributor');
    d := replace(d, 'the writer', 'the contributor');
    d := replace(d, '''Top Writer''', '''Top Contributor''');
    d := replace(d, '''Well Regarded''', '''Top Subject''');
    EXECUTE d;
    n := n + 1;
    RAISE NOTICE 'updated wording in %', f.proname;
  END LOOP;

  -- 3) Notices already sent
  UPDATE public.notifications SET
    title = replace(replace(replace(replace(replace(replace(title,
      'The person it''s about', 'The subject'), 'the person it''s about', 'the subject'),
      'The writer', 'The contributor'), 'the writer', 'the contributor'),
      'Top Writer', 'Top Contributor'), 'Well Regarded', 'Top Subject'),
    body = replace(replace(replace(replace(replace(replace(body,
      'The person it''s about', 'The subject'), 'the person it''s about', 'the subject'),
      'The writer', 'The contributor'), 'the writer', 'the contributor'),
      'Top Writer', 'Top Contributor'), 'Well Regarded', 'Top Subject')
  WHERE id IN (SELECT id FROM public.notifications_backup_20261105);

  -- 4) Blog posts
  UPDATE public.blog_posts SET
    content = replace(replace(replace(replace(replace(replace(replace(content,
      '## Step 2: The Person It''s About Is Told', '## Step 2: The Subject Is Told'),
      'The person it''s about', 'The subject'), 'the person it''s about', 'the subject'),
      'The writer', 'The contributor'), 'the writer', 'the contributor'),
      'Top Writer', 'Top Contributor'), 'Well Regarded', 'Top Subject'),
    description = replace(replace(description, 'the writer', 'the contributor'), 'the person it''s about', 'the subject'),
    updated_at = now()
  WHERE content ~* '(the writer|person it.s about|Top Writer|Well Regarded)'
     OR description ~* '(the writer|person it.s about)';

  -- Nothing may still use the old wording
  IF EXISTS (SELECT 1 FROM public.badges WHERE label IN ('Top Writer', 'Well Regarded'))
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
                 WHERE ns.nspname = 'public' AND p.proname <> 'process_ai_verification'
                   AND (p.prosrc ~* 'person it''''s about' OR p.prosrc ~* '\mthe writer\M'
                        OR p.prosrc LIKE '%''Top Writer''%' OR p.prosrc LIKE '%''Well Regarded''%'))
     OR EXISTS (SELECT 1 FROM public.blog_posts WHERE content ~* '(the writer\M|person it.s about)')
  THEN
    RAISE EXCEPTION 'Old wording still found; nothing changed. Send this message to Claude.';
  END IF;
END
$all$;

-- Check: badge counts by name (no Top Writer / Well Regarded)
SELECT label, count(*) FROM public.badges GROUP BY label ORDER BY label;
