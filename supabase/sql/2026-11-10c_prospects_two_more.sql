-- KJ, Nov 10: 2 more NYC pros added to the private pre-built profiles.
-- Private until they claim it. Safe to run twice.

INSERT INTO public.prospect_profiles (first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url)
VALUES
  ('Ivan', 'Sirotin', 'Price Decor Inc.', NULL, '9174597345', 'ivansirotinusa@gmail.com', 'Sheepshead Bay, NY', 'Contractor', NULL),
  ('Kamani', 'Sicard', 'NYC Handyman', NULL, '9179155732', 'nychandyman718@gmail.com', 'Midtown, NY', 'Handyman', NULL)
ON CONFLICT (phone) DO NOTHING;

-- No duplicates: link if their phone is already on a DNounce profile.
UPDATE public.prospect_profiles p
   SET existing_subject_id = s.subject_uuid
  FROM public.subjects s
 WHERE p.existing_subject_id IS NULL
   AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10) = p.phone;

-- Check + links
SELECT first_name, last_name, company_name, trade, neighborhood, email,
       'https://www.dnounce.com/claim?code=' || claim_code AS link,
       (SELECT count(*) FROM public.prospect_profiles) AS prospects_total
  FROM public.prospect_profiles
 WHERE phone IN ('9174597345', '9179155732');
