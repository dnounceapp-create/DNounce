-- KJ, Nov 10: 7 more NYC pros (handymen, contractors, a carpenter), each from their own
-- business page or listing (link kept in source_url). Private until they claim it.
-- Safe to run twice.

INSERT INTO public.prospect_profiles (first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url)
VALUES
  ('Benigno', 'Ng-Garcia II', 'Ben''s Handyman Inc', NULL, '9172979848', 'benshandymaninc@gmail.com', 'Staten Island, NY', 'Handyman', 'https://contractorfinder.bradfordwhite.com/contractors/bens-handyman-inc-31501-richmond-county-ny'),
  ('Anatolii', 'Terekhov', 'Anatolii Handyman', NULL, '7185643869', 'anatoliihandyman@gmail.com', 'Brooklyn, NY', 'Handyman', 'https://anatoliihandyman.com/'),
  ('Ernesto', 'Flores', 'EF Home Improvement Contractor', NULL, '7184604470', 'erflores123@yahoo.com', 'Flushing, NY', 'Contractor', 'https://www.allbiz.com/business/ef-home-improvement-contractor-718-460-4470'),
  ('Ray', 'Wong', 'Brooklyn''s Best Handyman & General Construction', NULL, '9177897366', 'hello@bk-handyman.com', 'Brooklyn, NY', 'Handyman', 'https://bk-handyman.com/'),
  ('Michael', 'Riegelman', 'NYC Handyguy', NULL, '3475233937', 'nychandyguy@gmail.com', 'New York, NY', 'Handyman', 'https://nextdoor.com/pages/nyc-handyguy-new-york-ny/'),
  ('Nicholas', 'Zikos', 'Zikos Millwork and Contracting LLC', NULL, '3474267055', 'nick@zikosmillwork.com', 'Rego Park, NY', 'Carpenter', 'https://www.zikosmillwork.com/about'),
  ('Robert', 'Johnson', 'RJ Home Improvement Services', NULL, '6318355204', 'rjhomeimprovementsvces@gmail.com', 'Queens, NY', 'Contractor', 'https://www.rjhomeimprovementsvces.com/about')

ON CONFLICT (phone) DO NOTHING;

-- No duplicates: link any prospect whose phone is already on a DNounce profile.
UPDATE public.prospect_profiles p
   SET existing_subject_id = s.subject_uuid
  FROM public.subjects s
 WHERE p.existing_subject_id IS NULL
   AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10) = p.phone;

-- Check
SELECT count(*) AS prospects,
       count(*) FILTER (WHERE source_url IN ('https://contractorfinder.bradfordwhite.com/contractors/bens-handyman-inc-31501-richmond-county-ny', 'https://anatoliihandyman.com/', 'https://www.allbiz.com/business/ef-home-improvement-contractor-718-460-4470', 'https://bk-handyman.com/', 'https://nextdoor.com/pages/nyc-handyguy-new-york-ny/', 'https://www.zikosmillwork.com/about', 'https://www.rjhomeimprovementsvces.com/about')) AS added_today,
       count(email) AS with_email,
       count(*) FILTER (WHERE claim_code ~ '^[0-9]{6}$') AS six_digit_codes,
       (SELECT count(*) FROM public.subjects) AS real_profiles_unchanged
  FROM public.prospect_profiles;

-- Their links
SELECT first_name, last_name, company_name, trade, email,
       'https://www.dnounce.com/claim?code=' || claim_code AS link
  FROM public.prospect_profiles
 WHERE source_url IN ('https://contractorfinder.bradfordwhite.com/contractors/bens-handyman-inc-31501-richmond-county-ny', 'https://anatoliihandyman.com/', 'https://www.allbiz.com/business/ef-home-improvement-contractor-718-460-4470', 'https://bk-handyman.com/', 'https://nextdoor.com/pages/nyc-handyguy-new-york-ny/', 'https://www.zikosmillwork.com/about', 'https://www.rjhomeimprovementsvces.com/about')
 ORDER BY last_name;
