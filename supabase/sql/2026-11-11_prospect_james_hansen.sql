-- KJ, Nov 11: add James Hansen (electrician, McHenry, IL) to the private pre-built profiles.
-- Private until he claims it (signing up with this email claims it). Safe to run twice.

INSERT INTO public.prospect_profiles (first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url)
VALUES ('James', 'Hansen', NULL, NULL, '8152763782', 'livecircuit@yahoo.com', 'McHenry, IL', 'Electrician', NULL)
ON CONFLICT (phone) DO NOTHING;

-- No duplicates: link if his phone is already on a DNounce profile.
UPDATE public.prospect_profiles p
   SET existing_subject_id = s.subject_uuid
  FROM public.subjects s
 WHERE p.existing_subject_id IS NULL
   AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10) = p.phone;

-- Check + link
SELECT first_name, last_name, trade, neighborhood, email,
       'https://www.dnounce.com/claim?code=' || claim_code AS link,
       (SELECT count(*) FROM public.prospect_profiles) AS prospects_total
  FROM public.prospect_profiles
 WHERE phone = '8152763782';
