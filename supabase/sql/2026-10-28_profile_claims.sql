-- Profile claims, fixed end to end (KJ, Oct 28).
--
-- Problems this fixes:
--   * Sign-up always made a NEW profile, even when a profile with the person's
--     email already existed (made when someone wrote a record about them).
--     Claiming that existing profile later left the person owning TWO profiles,
--     which breaks My Records and Analytics.
--   * A typed (unconfirmed) phone number at sign-up could link someone to a
--     profile. Now a phone match only creates a request for an admin to review.
--
-- New rules:
--   * One profile per person.
--   * A CONFIRMED email that matches an unclaimed profile connects the person to
--     that profile at sign-up instead of creating a new one.
--   * Claiming later (profile page or admin approval) moves the person onto the
--     claimed profile; their empty sign-up profile is removed (or, if it has
--     records about it, the claim waits for an admin).
--   * Every claim sends the same "profile claimed" notice and is logged.
--
-- Safe to run more than once. Nothing here deletes a profile that has records.

-- Admin review fields on claim requests
ALTER TABLE public.subject_claims ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.subject_claims ADD COLUMN IF NOT EXISTS review_note text;

------------------------------------------------------------------------------
-- Claim one profile for one person. Returns:
--   'claimed'       the person now owns it (and only it)
--   'already_owner' they already own it
--   'taken'         someone else owns it
--   'needs_review'  they own another profile that has records; an admin decides
--   'not_found'
CREATE OR REPLACE FUNCTION public.claim_subject_for_user(p_user_id uuid, p_subject_uuid uuid, p_source text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_found boolean;
  v_old uuid;
  v_old_records int := 0;
  v_old_row public.subjects%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_subject_uuid IS NULL THEN
    RETURN 'not_found';
  END IF;

  SELECT owner_auth_user_id, true INTO v_owner, v_found
  FROM public.subjects WHERE subject_uuid = p_subject_uuid FOR UPDATE;
  IF v_found IS NULL THEN RETURN 'not_found'; END IF;
  IF v_owner = p_user_id THEN RETURN 'already_owner'; END IF;
  IF v_owner IS NOT NULL THEN RETURN 'taken'; END IF;

  -- The profile this person already owns (usually the empty one made at sign-up)
  SELECT * INTO v_old_row FROM public.subjects
  WHERE owner_auth_user_id = p_user_id AND subject_uuid <> p_subject_uuid
  ORDER BY created_at NULLS LAST LIMIT 1;
  v_old := v_old_row.subject_uuid;

  IF v_old IS NOT NULL THEN
    SELECT count(*) INTO v_old_records FROM public.records WHERE subject_id = v_old;
    IF v_old_records > 0 THEN
      INSERT INTO public.subject_claims (subject_uuid, claimant_auth_user_id, status, note)
      SELECT p_subject_uuid, p_user_id, 'pending',
             'Needs review: this person already owns another profile with records (' || v_old || '). Source: ' || coalesce(p_source, '')
      WHERE NOT EXISTS (SELECT 1 FROM public.subject_claims
                        WHERE subject_uuid = p_subject_uuid AND claimant_auth_user_id = p_user_id);
      RETURN 'needs_review';
    END IF;
  END IF;

  -- Claim it. Keep what's on the profile; only fill gaps from their sign-up profile.
  UPDATE public.subjects s SET
    owner_auth_user_id = p_user_id,
    nickname     = coalesce(s.nickname, v_old_row.nickname),
    organization = coalesce(s.organization, v_old_row.organization),
    location     = coalesce(s.location, v_old_row.location),
    avatar_url   = coalesce(s.avatar_url, v_old_row.avatar_url)
  WHERE s.subject_uuid = p_subject_uuid;

  UPDATE public.users SET subject_id = p_subject_uuid WHERE auth_user_id = p_user_id;

  -- Remove the empty sign-up profile so there's only one. If anything still points
  -- at it (views, follows...), leave it in place but unowned.
  IF v_old IS NOT NULL THEN
    UPDATE public.subjects SET owner_auth_user_id = NULL WHERE subject_uuid = v_old;
    BEGIN
      DELETE FROM public.subjects WHERE subject_uuid = v_old;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  -- Close any open request for this profile by this person
  UPDATE public.subject_claims SET status = 'approved', reviewed_at = now()
  WHERE subject_uuid = p_subject_uuid AND claimant_auth_user_id = p_user_id AND status = 'pending';

  INSERT INTO public.admin_audit_log (admin_user_id, admin_level, action, target_type, target_id, note)
  VALUES (p_user_id, 0, 'profile_claim', 'subject', p_subject_uuid, 'Claimed via ' || coalesce(p_source, 'unknown'));

  INSERT INTO public.notifications (user_id, title, body, type, record_id)
  VALUES (p_user_id, 'Your profile is now yours',
          'You can see and respond to records about you from here on.', 'claim_approved', NULL);

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_subject_for_user(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subject_for_user(uuid, uuid, text) TO service_role;

------------------------------------------------------------------------------
-- Sign-up: connect to an existing profile by CONFIRMED email before making a new one.
CREATE OR REPLACE FUNCTION public.create_subject_if_not_exists(
  p_user_id uuid, p_name text, p_nickname text, p_organization text, p_location text, p_avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_uuid uuid;
  v_email text;
  v_phone text;
  v_match uuid;
BEGIN
  -- Only the caller can set up their own profile
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Already has a profile
  SELECT subject_uuid INTO v_subject_uuid FROM public.subjects WHERE owner_auth_user_id = p_user_id LIMIT 1;

  IF v_subject_uuid IS NULL THEN
    -- Confirmed login email only (read-only lookup)
    SELECT lower(trim(email)) INTO v_email FROM auth.users
    WHERE id = p_user_id AND email_confirmed_at IS NOT NULL;

    IF v_email IS NOT NULL AND v_email <> '' THEN
      -- 1) A profile someone created with this email
      SELECT subject_uuid INTO v_match FROM public.subjects
      WHERE owner_auth_user_id IS NULL AND lower(trim(email)) = v_email
      ORDER BY created_at NULLS LAST LIMIT 1;

      -- 2) A profile behind a DNounce-posted record with this email
      IF v_match IS NULL THEN
        SELECT r.subject_id INTO v_match
        FROM public.record_claim_codes c JOIN public.records r ON r.id = c.record_id
        JOIN public.subjects s ON s.subject_uuid = r.subject_id
        WHERE lower(trim(c.subject_email)) = v_email AND s.owner_auth_user_id IS NULL
        ORDER BY c.created_at NULLS LAST LIMIT 1;
      END IF;

      IF v_match IS NOT NULL AND public.claim_subject_for_user(p_user_id, v_match, 'sign-up email match') = 'claimed' THEN
        v_subject_uuid := v_match;
        -- Fill gaps with what they entered at sign-up (never overwrite the name)
        UPDATE public.subjects SET
          nickname     = coalesce(nickname, p_nickname),
          organization = coalesce(organization, p_organization),
          location     = coalesce(location, p_location),
          avatar_url   = coalesce(avatar_url, p_avatar_url)
        WHERE subject_uuid = v_match;
      END IF;
    END IF;
  END IF;

  IF v_subject_uuid IS NULL THEN
    INSERT INTO public.subjects (name, nickname, organization, location, avatar_url, owner_auth_user_id)
    VALUES (p_name, p_nickname, p_organization, p_location, p_avatar_url, p_user_id)
    RETURNING subject_uuid INTO v_subject_uuid;

    -- A typed phone number is never trusted: a match only asks an admin to review.
    SELECT regexp_replace(coalesce(phone, ''), '\D', '', 'g') INTO v_phone
    FROM public.user_accountdetails WHERE user_id = p_user_id;
    IF length(coalesce(v_phone, '')) >= 7 THEN
      INSERT INTO public.subject_claims (subject_uuid, claimant_auth_user_id, status, note)
      SELECT DISTINCT s.subject_uuid, p_user_id, 'pending', 'Phone number entered at sign-up matches this profile (phone not verified). Please check before approving.'
      FROM public.subjects s
      WHERE s.owner_auth_user_id IS NULL
        AND (regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = v_phone
             OR s.subject_uuid IN (SELECT r.subject_id FROM public.record_claim_codes c JOIN public.records r ON r.id = c.record_id
                                   WHERE regexp_replace(coalesce(c.subject_phone, ''), '\D', '', 'g') = v_phone))
        AND NOT EXISTS (SELECT 1 FROM public.subject_claims x WHERE x.subject_uuid = s.subject_uuid AND x.claimant_auth_user_id = p_user_id);
    END IF;
  END IF;

  UPDATE public.users SET subject_id = v_subject_uuid WHERE auth_user_id = p_user_id;
END;
$$;
