-- KJ, Nov 6: pre-built profiles don't need a claim code. Verifying their email is enough.
--  * claim_prospect_by_email(user): when someone signs up and verifies an email that
--    matches a pre-built profile, that profile becomes theirs automatically.
--  * claim_prospect(user, code): the link (dnounce.com/claim?code=...) still shows them
--    their profile, but claiming it also needs their verified email to match the one we
--    have for them. A code on its own can't take anyone's profile.
-- Only the server can use these. Safe to run twice.

CREATE TABLE IF NOT EXISTS public.prospect_code_attempts (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  ok         boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_code_attempts_key_time ON public.prospect_code_attempts (key, created_at);
ALTER TABLE public.prospect_code_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospect_code_attempts FROM anon, authenticated;

-- The person's verified email, or NULL if they haven't verified it yet.
CREATE OR REPLACE FUNCTION public.verified_email(p_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(trim(u.email)) FROM auth.users u
   WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.verified_email(uuid) FROM PUBLIC, anon, authenticated;

-- Turns one pre-built profile into a real profile owned by this person.
CREATE OR REPLACE FUNCTION public.claim_prospect_row(p_user_id uuid, p_prospect_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.prospect_profiles%ROWTYPE;
  v_mine uuid;
  v_subject uuid;
  v_result text;
  v_location text;
BEGIN
  SELECT * INTO p FROM public.prospect_profiles WHERE id = p_prospect_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;

  IF p.status = 'claimed' THEN
    IF EXISTS (SELECT 1 FROM public.subjects WHERE subject_uuid = p.claimed_subject_id AND owner_auth_user_id = p_user_id) THEN
      RETURN jsonb_build_object('result', 'already_owner', 'subject_uuid', p.claimed_subject_id);
    END IF;
    RETURN jsonb_build_object('result', 'taken');
  END IF;

  v_location := CASE WHEN position(',' IN p.neighborhood) > 0 THEN p.neighborhood ELSE p.neighborhood || ', NY' END;

  IF p.existing_subject_id IS NOT NULL THEN
    -- Their phone is already on a DNounce profile: claim that one.
    v_result := public.claim_subject_for_user(p_user_id, p.existing_subject_id, 'pre-built profile (verified email)');
    IF v_result NOT IN ('claimed', 'already_owner') THEN
      RETURN jsonb_build_object('result', v_result);
    END IF;
    v_subject := p.existing_subject_id;
  ELSE
    SELECT subject_uuid INTO v_mine FROM public.subjects
     WHERE owner_auth_user_id = p_user_id ORDER BY created_at NULLS LAST LIMIT 1;

    IF v_mine IS NOT NULL THEN
      -- They already have their own profile: fill in what's blank, never overwrite.
      UPDATE public.subjects SET
        organization = coalesce(nullif(trim(organization), ''), p.company_name),
        nickname     = coalesce(nullif(trim(nickname), ''), p.nickname),
        location     = coalesce(nullif(trim(location), ''), v_location),
        phone        = coalesce(nullif(trim(phone), ''), p.phone),
        email        = coalesce(nullif(trim(email), ''), p.email)
      WHERE subject_uuid = v_mine;
      v_subject := v_mine;
    ELSE
      INSERT INTO public.subjects (name, nickname, organization, location, phone, email, owner_auth_user_id)
      VALUES (p.first_name || ' ' || p.last_name, p.nickname, p.company_name, v_location, p.phone, p.email, p_user_id)
      RETURNING subject_uuid INTO v_subject;
      UPDATE public.users SET subject_id = v_subject WHERE auth_user_id = p_user_id;
    END IF;

    INSERT INTO public.admin_audit_log (admin_user_id, admin_level, action, target_type, target_id, note)
    VALUES (p_user_id, 0, 'profile_claim', 'subject', v_subject, 'Claimed pre-built profile (verified email)');
    INSERT INTO public.notifications (user_id, title, body, type, record_id)
    VALUES (p_user_id, 'Your profile is now yours',
            'You can see and respond to records about you from here on.', 'claim_approved', NULL);
  END IF;

  UPDATE public.prospect_profiles
     SET status = 'claimed', claimed_subject_id = v_subject, updated_at = now()
   WHERE id = p.id;

  RETURN jsonb_build_object('result', 'claimed', 'subject_uuid', v_subject);
END
$$;
REVOKE ALL ON FUNCTION public.claim_prospect_row(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Automatic: after someone verifies their email, claim the pre-built profile with that email.
CREATE OR REPLACE FUNCTION public.claim_prospect_by_email(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := public.verified_email(p_user_id);
  v_id uuid;
BEGIN
  IF v_email IS NULL THEN RETURN jsonb_build_object('result', 'email_not_verified'); END IF;
  SELECT id INTO v_id FROM public.prospect_profiles
   WHERE lower(trim(email)) = v_email AND status <> 'claimed'
   ORDER BY created_at LIMIT 1;
  IF v_id IS NULL THEN RETURN jsonb_build_object('result', 'none'); END IF;
  RETURN public.claim_prospect_row(p_user_id, v_id);
END
$$;

-- From the link: the code finds the profile; the verified email must match ours.
CREATE OR REPLACE FUNCTION public.claim_prospect(p_user_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.prospect_profiles%ROWTYPE;
  v_email text := public.verified_email(p_user_id);
BEGIN
  IF p_user_id IS NULL OR coalesce(p_code, '') !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;
  SELECT * INTO p FROM public.prospect_profiles WHERE claim_code = p_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF p.status = 'claimed' THEN RETURN public.claim_prospect_row(p_user_id, p.id); END IF;

  IF v_email IS NULL THEN RETURN jsonb_build_object('result', 'email_not_verified'); END IF;
  IF p.email IS NULL OR lower(trim(p.email)) <> v_email THEN
    RETURN jsonb_build_object('result', 'email_mismatch');
  END IF;
  RETURN public.claim_prospect_row(p_user_id, p.id);
END
$$;

REVOKE ALL ON FUNCTION public.claim_prospect(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_prospect_by_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_prospect(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_prospect_by_email(uuid) TO service_role;

-- Check
SELECT (SELECT count(*) FROM public.prospect_profiles WHERE status <> 'claimed') AS ready_to_claim,
       (SELECT count(*) FROM public.prospect_profiles WHERE status <> 'claimed' AND email IS NOT NULL) AS can_claim_now_with_email,
       to_regprocedure('public.claim_prospect_by_email(uuid)') IS NOT NULL AS ready;
