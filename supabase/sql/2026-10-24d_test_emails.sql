-- Sends KJ two test emails with the new design (only to KJ's own account).
-- They also show up as notifications on her dashboard; that's expected.
INSERT INTO public.notifications (user_id, title, body, type, record_id) VALUES
  ('2b3a7734-988d-4bc0-baa5-4fc4ec6f9774', 'Test: new record email', 'Test of the new email design.', 'stage_2_subject', '19b99d72-6a14-4ecf-9ee7-70a31d77662b'),
  ('2b3a7734-988d-4bc0-baa5-4fc4ec6f9774', 'Test: results email', 'Test of the new email design.', 'verdict_announced', '19b99d72-6a14-4ecf-9ee7-70a31d77662b');
