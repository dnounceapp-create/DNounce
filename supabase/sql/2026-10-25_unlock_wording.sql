-- The "you can comment again" notice is sent the moment the results come out
-- (7 days after voting closes), but its text said "It's been a week since the results came out".
-- This fixes the in-app wording to match. Stops with nothing changed if the text isn't found.
DO $w$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'process_notification_queue';
  IF def IS NULL OR position('It''''s been a week since the results came out. You can now post in the record''''s community section.' IN def) = 0 THEN
    RAISE EXCEPTION 'process_notification_queue not as expected; nothing changed';
  END IF;
  def := replace(def, 'You can join the conversation again', 'You can comment on this record now');
  def := replace(def, 'It''''s been a week since the results came out. You can now post in the record''''s community section.',
                      'Now that the results are out, you can comment on this record.');
  EXECUTE def;
END $w$;
