-- Ties and no-vote results (2026-10-23)
--   most voters sided with the writer   -> final_outcome = 'keep'
--   most voters sided with the subject  -> final_outcome = 'delete'  (record still stays)
--   equal votes                         -> final_outcome = 'tie'     ("It's a tie — people couldn't decide who to side with")
--   no votes at all                     -> final_outcome = null      (no result label shown)
-- Then recalculates every record that already has results, with the same rule.
-- Run as one block. If anything errors, nothing changes.

begin;

create or replace function public.records_finalize_outcome_from_votes()
returns trigger
language plpgsql
as $$
declare
  v_contributor bigint;
  v_subject     bigint;
begin
  if new.status::text = 'decision'
     and new.decision_made_at is not null
     and (old.decision_made_at is distinct from new.decision_made_at or old.status is distinct from new.status)
  then
    select t.contributor_count, t.subject_count
      into v_contributor, v_subject
      from public.vote_tally(new.id) t;

    v_contributor := coalesce(v_contributor, 0);
    v_subject := coalesce(v_subject, 0);

    if v_contributor = 0 and v_subject = 0 then
      new.final_outcome := null;        -- nobody voted: no result label
    elsif v_subject > v_contributor then
      new.final_outcome := 'delete';    -- most voters sided with the subject; record stays
    elsif v_contributor > v_subject then
      new.final_outcome := 'keep';      -- most voters sided with the writer
    else
      new.final_outcome := 'tie';       -- evenly split
    end if;

    -- The record stays on DNounce whatever the outcome.
    new.is_published := true;
    if new.published_at is null then
      new.published_at := now();
    end if;
    new.finalized_at := now();
  end if;
  return new;
end;
$$;

-- Recalculate records that already have results (direct update; the trigger above
-- only runs when decision_made_at changes).
update public.records r
set final_outcome = case
      when coalesce(t.contributor_count, 0) = 0 and coalesce(t.subject_count, 0) = 0 then null
      when t.subject_count > t.contributor_count then 'delete'
      when t.contributor_count > t.subject_count then 'keep'
      else 'tie'
    end
from public.records r2
cross join lateral public.vote_tally(r2.id) t
where r.id = r2.id
  and r.status = 'decision'
  and r.decision_made_at is not null;

commit;
