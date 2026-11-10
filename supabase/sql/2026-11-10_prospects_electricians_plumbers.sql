-- KJ, Nov 10: 50 NYC electricians and plumbers added to the private pre-built profiles.
-- Not public until each person claims theirs (signing up with this email claims it).
-- Safe to run twice: anyone whose phone is already in the list is skipped.

INSERT INTO public.prospect_profiles (first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url)
VALUES
  ('Michael', 'Marcellino', 'A&M Electrical Contracting LLC', NULL, '9177089729', 'mjm31904@aol.com', 'Bronx, NY', 'Electrician', NULL),
  ('James', 'Kelly', 'JK Electrical Inc', NULL, '9175046039', 'jkelectrical13@gmail.com', 'Bronx, NY', 'Electrician', NULL),
  ('Denzil', 'Davis', 'Triple D Electric Inc', NULL, '7186760530', 'tripledelectric3550@gmail.com', 'Bronx, NY', 'Electrician', NULL),
  ('Van', 'Vassell', 'V. Vass Electric Corp', NULL, '7189941201', 'vvass60@hotmail.com', 'Bronx, NY', 'Electrician', NULL),
  ('William', 'Geiger', 'Adam Electrical Contracting LLC', NULL, '3476134270', 'bgelectricinc16@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Wayne', 'Hamm', 'Electric Fixx Inc', NULL, '7184152559', 'electricfixx@hotmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Atul', 'Keluskar', 'Akay Electric Corporation', NULL, '7183455097', 'akayelectric@verizon.net', 'Brooklyn, NY', 'Electrician', NULL),
  ('Harvey', 'Isaacman', 'Electrical Solutions LLC', NULL, '7187882018', 'elecsolutions@hotmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Ozni', 'Lewis', 'James Lewis Electrical Corp', NULL, '3473653166', 'jameslewiselectricalcorp@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Gregory', 'Blau', 'Angler Electric', NULL, '7185173179', 'anglerelectric@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Leonid', 'Simkin', 'Lens Electric Inc', NULL, '6465227311', 'lenselectric@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Pablo', 'Cintron', 'Cintron Electrical Services & Lighting', NULL, '3476314475', 'cintronelectrical1@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Shabse', 'Rosenberg', 'Lighten Up Electrical Service', NULL, '7186330906', 'lightenupcorp@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Jose', 'Cruz', 'Main Power Electrical Contracting', NULL, '7185043211', 'jose@mainpowerelectric.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Mark', 'Hall', 'MAK Electrical Contracting Corp', NULL, '7184849383', 'yahhall59@yahoo.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Tomas', 'Figueroa', 'TMF Electrical Contracting Inc', NULL, '7184390851', 'tomas@tmfelectrical.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Dennis', 'Waterman', 'Waterman Electric Inc', NULL, '7186730273', 'waterman1348@gmail.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('Karl', 'Griffith', 'Zena Electric Inc', NULL, '7188417838', 'karl@zenaelectric.com', 'Brooklyn, NY', 'Electrician', NULL),
  ('David', 'Lake', 'Checkmate Electric LLC', NULL, '2125141496', 'dlake6345@gmail.com', 'Manhattan, NY', 'Electrician', NULL),
  ('Peter', 'Li', 'P.L. Electrical Contracting Corp', NULL, '2126088868', 'plelectrical8868@gmail.com', 'Manhattan, NY', 'Electrician', NULL),
  ('Nicholas', 'Maring', 'KrisCorp Electrical Contracting Inc', NULL, '6469520189', 'nicholas@kriscorpelectric.com', 'Manhattan, NY', 'Electrician', NULL),
  ('George', 'Tonaj', 'Principal Electric Corp', NULL, '2124703314', 'georgetonaj@principalelectric.com', 'Manhattan, NY', 'Electrician', NULL),
  ('Julio', 'Alarcon', 'A&S Master Electrical Corp', NULL, '7183617672', 'a-and-s_electric@hotmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Tomasz', 'Kuczynski', 'BluWolf Electric Co Inc', NULL, '9178327601', 'kuczynski27@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Jeffrey', 'Socol', 'Ace Electrical Construction', NULL, '3473684038', 'hvacq128@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Anthony', 'La Rosa', 'Chapman & Chapman Electrical', NULL, '7183264800', 'chapmanelectric@verizon.net', 'Queens, NY', 'Electrician', NULL),
  ('Dimitrios', 'Tomboris', 'Arch Electric Inc', NULL, '7185299100', 'james@archelectricinc.com', 'Queens, NY', 'Electrician', NULL),
  ('Stephen', 'Martino', 'CSI Electrical & Mechanical Inc', NULL, '7184289759', 'csi-electrical@verizon.net', 'Queens, NY', 'Electrician', NULL),
  ('David', 'Doyley', 'Dynamo Electrical Corp', NULL, '7185589080', 'dynamoelectricalcorp@aol.com', 'Queens, NY', 'Electrician', NULL),
  ('Shefki', 'Arifi', 'Jefferson Electrical Inc', NULL, '7182960530', 'jeffersonelectrical@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Joseph', 'Mendez', 'Jomen Electrical Contracting Corp', NULL, '7187841662', 'jomen@verizon.net', 'Queens, NY', 'Electrician', NULL),
  ('Stanley', 'Dessources', 'High Impact Electric Corp', NULL, '3473046546', 'stan@highimpactelectric.com', 'Queens, NY', 'Electrician', NULL),
  ('Michael', 'Sookhai', 'Infiniti Electric Corp', NULL, '7182052244', 'michaelsookhai@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Frank', 'Fodera', 'Pappas & Fodera Electrical', NULL, '7186342211', 'frank@pnfelectric.com', 'Queens, NY', 'Electrician', NULL),
  ('Joseph', 'Brincat', 'J.G.C. Electric LLC', NULL, '2128513738', 'jgelectricnyc@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Effrain', 'Alverez', 'Power Control Electric Corp', NULL, '7184452405', 'powercontrol@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Sherwin', 'Greene', 'Sezekcol Electric Inc', NULL, '9178907214', 'sezekcolelectric@outlook.com', 'Queens, NY', 'Electrician', NULL),
  ('Urim', 'Syla', 'US1 Electric Corp', NULL, '6464237569', 'us1electricnyc@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('John', 'Karalis', 'Triboro Electrical Contracting Corp', NULL, '7187860913', 'triboroelectric@gmail.com', 'Queens, NY', 'Electrician', NULL),
  ('Jeff', 'Skowronski', 'Inter Connection Electric', NULL, '7187489800', 'jeff@interconnectionelectric.com', 'Staten Island, NY', 'Electrician', NULL),
  ('David', 'Antenucci', 'Antenucci Mechanical Inc', NULL, '7184665282', 'davidpantenucci@msn.com', 'Bronx, NY', 'Plumber', NULL),
  ('Ani', 'Bera', 'Aspect Plumbing & Heating Co LLC', NULL, '7187342909', 'ani@aspectplumbing.net', 'Bronx, NY', 'Plumber', NULL),
  ('Lenworth', 'Barnett', 'Barnett Plumbing & Heating Corp', NULL, '7183677350', 'lbar123@msn.com', 'Bronx, NY', 'Plumber', NULL),
  ('Paul', 'Dasilva', 'Dasilva Plumbing & Heating Corp', NULL, '7188663900', 'dph1495@gmail.com', 'Bronx, NY', 'Plumber', NULL),
  ('Herbert', 'Greenberg', 'Evergreen Mechanical Corp', NULL, '7182921929', 'hgreenberg@evergreenmech.com', 'Bronx, NY', 'Plumber', NULL),
  ('George', 'Bassolino III', 'George Bassolino Plumbing', NULL, '7186220911', 'george@plumbingny.com', 'Bronx, NY', 'Plumber', NULL),
  ('Marc', 'Breslaw', 'TriState Plumbing Services Corp', NULL, '2125630341', 'marc@triplumbing.com', 'Bronx, NY', 'Plumber', NULL),
  ('Eric', 'Matzen', 'Got Pipes Inc', NULL, '9175535254', 'apexusa@yahoo.com', 'Bronx, NY', 'Plumber', NULL),
  ('Marash', 'Voka', 'Voka Mechanical Corp', NULL, '7188286090', 'vokaplumbing@optonline.net', 'Bronx, NY', 'Plumber', NULL),
  ('Patrick', 'Sementa', 'Pat Sementa P&H Co Inc', NULL, '7188295464', 'pats@psphc.net', 'Bronx, NY', 'Plumber', NULL)
ON CONFLICT (phone) DO NOTHING;

-- No duplicates: link any prospect whose phone is already on a DNounce profile.
UPDATE public.prospect_profiles p
   SET existing_subject_id = s.subject_uuid
  FROM public.subjects s
 WHERE p.existing_subject_id IS NULL
   AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 10) = p.phone;

-- Check
SELECT count(*) AS prospects,
       count(*) FILTER (WHERE trade = 'Electrician') AS electricians,
       count(*) FILTER (WHERE trade = 'Plumber') AS plumbers,
       count(email) AS with_email,
       count(*) FILTER (WHERE claim_code ~ '^[0-9]{6}$') AS six_digit_codes,
       (SELECT count(*) FROM public.subjects) AS real_profiles_unchanged
  FROM public.prospect_profiles;

-- Their links
SELECT first_name, last_name, company_name, trade, email,
       'https://www.dnounce.com/claim?code=' || claim_code AS link
  FROM public.prospect_profiles
 WHERE trade IN ('Electrician', 'Plumber')
 ORDER BY trade, last_name;
