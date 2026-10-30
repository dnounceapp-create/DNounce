-- KJ, Oct 30: claim codes for pre-built profiles become 6 digits, like the codes
-- from "Generate record" (e.g. 482913). Each one is unique and never the same as
-- a record claim code, so the two can't be mixed up.
-- Safe to run twice.

CREATE OR REPLACE FUNCTION public.new_prospect_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
  LOOP
    c := (100000 + floor(random() * 900000))::int::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.prospect_profiles WHERE claim_code = c)
          AND NOT EXISTS (SELECT 1 FROM public.record_claim_codes WHERE code::text = c);
  END LOOP;
  RETURN c;
END $$;

REVOKE ALL ON FUNCTION public.new_prospect_code() FROM PUBLIC, anon, authenticated;

-- Replace the long codes, one row at a time so each new code is unique.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.prospect_profiles WHERE claim_code !~ '^[0-9]{6}$' LOOP
    UPDATE public.prospect_profiles SET claim_code = public.new_prospect_code(), updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.prospect_profiles ALTER COLUMN claim_code SET DEFAULT public.new_prospect_code();

-- Check: every code is 6 digits and unique
SELECT count(*) AS prospects,
       count(*) FILTER (WHERE claim_code ~ '^[0-9]{6}$') AS six_digit_codes,
       count(DISTINCT claim_code) AS unique_codes
  FROM public.prospect_profiles;
