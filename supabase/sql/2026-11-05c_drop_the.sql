-- KJ, Nov 5: no "the" — "the subject" -> "Subject", "the contributor" -> "Contributor".
-- Covers every database function that writes notices, notices already sent, and blog posts.
-- Leaves phrases like "on the subject of" alone. Backups are kept (locked, not public).
-- All or nothing: if anything looks unexpected, it stops and nothing changes.

DO $all$
DECLARE
  f record;
  d text;
  -- matches "the subject" / "The contributor" etc. as whole words, not "the subject of"
  pat constant text := '\m[Tt]he (subject|contributor)\M(?! of)';
BEGIN
  CREATE TABLE IF NOT EXISTS public.notifications_backup_20261105c AS
    SELECT id, title, body FROM public.notifications
     WHERE title ~ '\m[Tt]he (subject|contributor)\M' OR body ~ '\m[Tt]he (subject|contributor)\M';
  CREATE TABLE IF NOT EXISTS public.blog_posts_backup_20261105c AS SELECT * FROM public.blog_posts;
  ALTER TABLE public.notifications_backup_20261105c ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.blog_posts_backup_20261105c    ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.notifications_backup_20261105c, public.blog_posts_backup_20261105c FROM anon, authenticated;

  -- 1) Database functions
  FOR f IN
    SELECT p.oid, p.proname
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND p.proname <> 'process_ai_verification'
       AND p.prosrc ~ '\m[Tt]he (subject|contributor)\M'
  LOOP
    d := pg_get_functiondef(f.oid);
    d := regexp_replace(d, '\m[Tt]he subject\M(?! of)', 'Subject', 'g');
    d := regexp_replace(d, '\m[Tt]he contributor\M', 'Contributor', 'g');
    EXECUTE d;
    RAISE NOTICE 'updated wording in %', f.proname;
  END LOOP;

  -- 2) Notices already sent
  UPDATE public.notifications SET
    title = regexp_replace(regexp_replace(title, '\m[Tt]he subject\M(?! of)', 'Subject', 'g'), '\m[Tt]he contributor\M', 'Contributor', 'g'),
    body  = regexp_replace(regexp_replace(body,  '\m[Tt]he subject\M(?! of)', 'Subject', 'g'), '\m[Tt]he contributor\M', 'Contributor', 'g')
  WHERE id IN (SELECT id FROM public.notifications_backup_20261105c);

  -- 3) Blog posts
  UPDATE public.blog_posts SET
    content = regexp_replace(regexp_replace(replace(content, 'The Subject Is Told', 'Subject Is Told'), '\m[Tt]he subject\M(?! of)', 'Subject', 'g'), '\m[Tt]he contributor\M', 'Contributor', 'g'),
    description = regexp_replace(regexp_replace(description, '\m[Tt]he subject\M(?! of)', 'Subject', 'g'), '\m[Tt]he contributor\M', 'Contributor', 'g'),
    updated_at = now()
  WHERE content ~ pat OR description ~ pat OR content LIKE '%The Subject Is Told%';

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
              WHERE ns.nspname = 'public' AND p.proname <> 'process_ai_verification' AND p.prosrc ~ pat)
     OR EXISTS (SELECT 1 FROM public.blog_posts WHERE content ~ pat)
  THEN
    RAISE EXCEPTION 'Old wording still found; nothing changed. Send this message to Claude.';
  END IF;
END
$all$;

-- Check: how many blog posts and notices now say Subject / Contributor
SELECT (SELECT count(*) FROM public.blog_posts WHERE content ~ '\m(Subject|Contributor)\M') AS blog_posts,
       (SELECT count(*) FROM public.notifications_backup_20261105c) AS notices_updated;
