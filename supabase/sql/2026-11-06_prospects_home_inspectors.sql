-- KJ, Nov 6: 31 home inspectors (NY, NJ, AZ) we already emailed, added to the
-- private pre-built profiles. Info is from each person's own business website or
-- business page (link kept in source_url). Not public until they claim it.
-- Adds two optional columns: trade and source_url. Safe to run twice.

ALTER TABLE public.prospect_profiles ADD COLUMN IF NOT EXISTS trade text;
ALTER TABLE public.prospect_profiles ADD COLUMN IF NOT EXISTS source_url text;

INSERT INTO public.prospect_profiles (first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url)
VALUES
  ('Tommy', 'Williams', 'Pine Home Inspection LLC', NULL, '5519461192', 'tommy@pinehomeinspection.com', 'Cliffside Park, NJ', 'Home Inspector', 'https://pinehomeinspection.com/'),
  ('Preston', 'Kincaid', 'Kincaid Home Inspection Services', 'Inspector Preston', '6074416031', 'preston@kincaidservices.com', 'Oxford, NY', 'Home Inspector', 'https://kincaidservices.com/'),
  ('Ed', 'Chatterton', 'Inspector Ed Home Inspections Inc', 'Inspector Ed', '6468726198', 'homeinspector@inspectored.com', 'Whitestone, NY', 'Home Inspector', 'https://inspectored.com/'),
  ('Jordan', 'Gable', 'Sunnyside Home Inspection LLC', NULL, '6465354322', 'inspectorgablenyc@gmail.com', 'Sunnyside, NY', 'Home Inspector', 'https://www.sunnysidehomeinspection.com/'),
  ('Joe', 'Milito', 'Cozy Property Inspections Inc', 'Cozy Joe', '6314843095', 'cozypropertyinspections@yahoo.com', 'Long Island, NY', 'Home Inspector', 'https://cozypropertyinspections.com/'),
  ('Domenic', 'Settimo', 'Right Start Home Inspections', NULL, '5163848724', 'domenic.settimo@gmail.com', 'East Meadow, NY', 'Home Inspector', 'https://www.instagram.com/p/DcBTDCXIDUe/'),
  ('Chen Chung', 'Weng', 'NYS Home Inspector', 'Tony', '7186141222', 'wenginspctn.envrnmntlsrvcs@gmail.com', 'Bronx, NY', 'Home Inspector', 'https://www.nyshomeinspector.com/'),
  ('Erik', 'Zerrenner', 'Premier Home and Environmental Inspection Services', NULL, '2013707054', 'erik@premierhomenj.com', 'Allendale, NJ', 'Home Inspector', 'https://www.premierhomenj.com/'),
  ('Frank', 'Frasco', 'Frank Frasco Home Inspections LLC', NULL, '2018156508', 'frankfrasco@aol.com', 'Vernon, NJ', 'Home Inspector', 'https://frankfrascohomeinspections.com/'),
  ('Jason', 'Sestito', 'Core 360 Home Inspections LLC', NULL, '8882673360', 'info@core360.llc', 'Wantage, NJ', 'Home Inspector', 'https://app.spectora.com/home-inspectors/core-360-home-inspections'),
  ('Joe', 'Zingone', 'A Closer Look Home Inspection Services LLC', NULL, '9739220161', 'info@acloserlooknj.com', 'Oakland, NJ', 'Home Inspector', 'https://acloserlooknj.com/'),
  ('Phil', 'Vitanzo', 'Veriguard Home Inspections', NULL, '2017908736', 'info@veriguardhomeinspections.com', 'Hackensack, NJ', 'Home Inspector', 'https://veriguardhomeinspections.com/'),
  ('Lance', 'Kotash', 'Eagle Eye Home Inspection', NULL, '9144386817', 'lance@eagleeyeinspectionny.com', 'Mahopac, NY', 'Home Inspector', 'https://eagleeyeinspectionny.co/'),
  ('Carlos', 'Monserrate', 'First-In Home Inspections', NULL, '9144205686', 'info@first-inhomeinspections.com', 'Ardsley, NY', 'Home Inspector', 'https://www.instagram.com/p/Da1LckUOOSW/'),
  ('Debra', 'Monte', 'At Home Inspections Inc', 'The Green Inspector', '7188779745', 'inspectormonte@gmail.com', 'Staten Island, NY', 'Home Inspector', 'https://www.reporthost.com/AtHomeMonte/'),
  ('Moses', 'Pabon', 'Moe''s Home Inspections LLC', 'Moe', '9145153911', 'info@moeshomeinspect.com', 'Westchester County, NY', 'Home Inspector', 'https://www.facebook.com/moses.pabon/posts/pfbid047QDm3TEi2a6qKZP2GjwfnNsq3oKBtg1gQurooPUDmrapZNRyqgpamYcHdnfbT4Jl'),
  ('Morgan', 'Brown', 'Four Roses Inspections LLC', NULL, '6029099886', 'morgan@fourrosesinspections.com', 'Phoenix, AZ', 'Home Inspector', 'https://www.fourrosesinspections.com/'),
  ('Rodney', 'Harrison', 'Arizona Sun Home Inspection LLC', NULL, '4808288335', 'azshomeinspect@gmail.com', 'Queen Creek, AZ', 'Home Inspector', 'https://www.azsunhomeinspection.com/contact/'),
  ('Sean', 'Doherty', 'Good Look Home Inspections LLC', 'Sean the Jarhead', '6238249776', 'myazinspector@gmail.com', 'Waddell, AZ', 'Home Inspector', 'https://giveitagoodlook.com/'),
  ('Ross', 'Baudhuin', 'Veteran Inspection Services', NULL, '6026867042', 'ross@veteraninspectionservices.com', 'Phoenix, AZ', 'Home Inspector', 'https://www.veteraninspectionservices.com/about/'),
  ('Joey', 'Aloisio', 'Aloisio Home Inspections', NULL, '6239809550', 'joey@aloisiohomeinspections.com', 'Phoenix, AZ', 'Home Inspector', 'https://aloisiohomeinspections.com/services/'),
  ('Dennis', 'Nobley', 'Horizon Inspection Service', NULL, '6028594333', 'dennis@horizoninspectionservice.com', 'Scottsdale, AZ', 'Home Inspector', 'https://www.horizoninspectionservice.com/'),
  ('Joe', 'Worthy', 'Vertex Property Inspections', NULL, '4803530668', 'joseph@getvtx.com', 'Phoenix, AZ', 'Home Inspector', 'https://app.spectora.com/home-inspectors/my-inspection-company-33256800ef'),
  ('Brett', 'Sutton', 'First-In Property Inspections LLC', NULL, '6028187430', 'firstinpropertyinspect@gmail.com', 'Phoenix, AZ', 'Home Inspector', 'https://www.first-inpropertyinspectionsllc.com/'),
  ('Daniel', 'O''Rourke', 'AZ Pro Inspector Service', 'Danny', '4802527455', 'danny@azproinspector.com', 'Florence, AZ', 'Home Inspector', 'https://azproinspector.com/'),
  ('Kyle', 'Pritchett', 'Pritchett Home Inspection LLC', NULL, '6027571162', 'kyle@pritchetthi.com', 'Chandler, AZ', 'Home Inspector', 'https://pritchetthi.com/'),
  ('Jaren', 'Drummond', 'San Tan Property Inspections', NULL, '4806180805', 'santanpropertyinspections@gmail.com', 'San Tan Valley, AZ', 'Home Inspector', 'https://santanpropertyinspections.com/'),
  ('Levi', 'Gomez', 'PAL Home Inspections PLLC', NULL, '4802519277', 'levi@palhomeinspections.com', 'Mesa, AZ', 'Home Inspector', 'https://www.palhomeinspections.com'),
  ('David', 'Dion', 'Whole Home Inspections, LLC', NULL, '6023178771', 'david@phxinspect.com', 'Phoenix, AZ', 'Home Inspector', 'https://wholehomeinspectionsllc.com/'),
  ('Bob', 'Clardy', 'AZ Home Inspection Services', NULL, '4808052025', 'bob@azhiservices.com', 'Scottsdale, AZ', 'Home Inspector', 'https://www.azhiservices.com/'),
  ('Pat', 'Grady', 'APPS Inspection', NULL, '6232023111', 'appsinspection26@gmail.com', 'Peoria, AZ', 'Home Inspector', 'https://appsinspection.com/')
ON CONFLICT (phone) DO NOTHING;

-- They were already emailed
UPDATE public.prospect_profiles SET status = 'contacted', updated_at = now()
 WHERE trade = 'Home Inspector' AND status = 'not_contacted';

-- No duplicates: link any prospect whose phone is already on a DNounce profile.
UPDATE public.prospect_profiles p
   SET existing_subject_id = s.subject_uuid
  FROM public.subjects s
 WHERE p.existing_subject_id IS NULL
   AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10) = p.phone;

-- Check
SELECT count(*) AS prospects,
       count(*) FILTER (WHERE trade = 'Home Inspector') AS home_inspectors,
       count(email) AS with_email,
       count(existing_subject_id) AS already_on_dnounce,
       (SELECT count(*) FROM public.subjects) AS real_profiles_unchanged
  FROM public.prospect_profiles;
