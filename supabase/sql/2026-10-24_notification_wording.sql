-- Notification wording (2026-10-24)
-- Edits the text inside three notification rules IN PLACE, so every other setting
-- of those rules stays exactly as it is. If any expected text is not found, the
-- whole block stops and nothing changes.
--   * "Both sides" replies: no "debate", no "subject/contributor" role words
--   * Disqualified vote: no mention of the (now hidden) voter score
--   * Badges: new display names (Top Writer, Well Regarded, Top Community Member),
--     plain descriptions, and no notice for the hidden Expert badge

begin;

do $do$
declare
  d text;
  before text;
  procedure_name text;
begin
  -- 1) Replies while both sides are sharing
  d := pg_get_functiondef('public.trigger_debate_reply_notification'::regproc);
  before := d;
  d := replace(d, $s$'New statement posted in the debate'$s$, $s$'New post in Both sides'$s$);
  d := replace(d, $s$'New reply in the debate'$s$, $s$'New reply in Both sides'$s$);
  d := replace(d,
    $s$'The ' || NEW.author_role || ' posted a new opening statement in the debate. Review and respond.'$s$,
    $s$(CASE WHEN NEW.author_role = 'subject' THEN 'The person it''s about' ELSE 'The writer' END) || ' shared their side. Take a look and respond.'$s$);
  d := replace(d,
    $s$'The ' || NEW.author_role || ' replied to a statement in the debate.'$s$,
    $s$(CASE WHEN NEW.author_role = 'subject' THEN 'The person it''s about' ELSE 'The writer' END) || ' replied in Both sides.'$s$);
  if d = before or position('debate.' in d) > 0 or position('in the debate' in d) > 0 then
    raise exception 'reply notification text not found as expected; nothing changed';
  end if;
  execute d;

  -- 2) Disqualified vote
  d := pg_get_functiondef('public.trigger_vote_convicted_notification'::regproc);
  before := d;
  d := replace(d, ' This affects your voter score.', '');
  if d = before then
    raise exception 'disqualified-vote text not found as expected; nothing changed';
  end if;
  execute d;

  -- 3) Badge earned
  d := pg_get_functiondef('public.trigger_badge_notification'::regproc);
  before := d;
  d := replace(d, $s$' ' || NEW.label,$s$,
    $s$' ' || (CASE NEW.label WHEN 'Top Contributor' THEN 'Top Writer' WHEN 'Top Subject' THEN 'Well Regarded' WHEN 'Top Citizen' THEN 'Top Community Member' ELSE NEW.label END),$s$);
  d := replace(d, $s$'90%+ of your submitted records are kept or never disputed.'$s$,
    $s$'Your records hold up: almost all of them were never challenged, or most people sided with you.'$s$);
  d := replace(d, $s$'Your subject score is 90 or above — your reputation is spotless.'$s$,
    $s$'Records about you hold up really well with the community.'$s$);
  d := replace(d, $s$'Your contributions generate strong and divided community reactions.'$s$,
    $s$'What you post gets strong reactions on both sides.'$s$);
  d := regexp_replace(d, 'BEGIN(\s+)INSERT INTO public\.notifications',
    E'BEGIN\\1IF NEW.label = ''Expert'' THEN RETURN NEW; END IF;\\1INSERT INTO public.notifications', 'i');
  if d = before
     or position('kept or never disputed' in d) > 0
     or position('subject score' in d) > 0
     or position($s$IF NEW.label = 'Expert'$s$ in d) = 0 then
    raise exception 'badge notification text not found as expected; nothing changed';
  end if;
  execute d;
end
$do$;

commit;
