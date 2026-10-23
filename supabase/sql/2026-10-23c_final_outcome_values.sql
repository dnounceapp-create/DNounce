-- Allow the outcome values the results step writes (keep / delete / tie).
-- The old rule only allowed sided_with_*; the results step failed and stopped the
-- whole 15-minute stage run (seen at 13:15 and 13:30 on 2026-10-23).
begin;
alter table public.records drop constraint if exists records_final_outcome_check;
alter table public.records add constraint records_final_outcome_check
  check (final_outcome in ('keep', 'delete', 'tie', 'sided_with_contributor', 'sided_with_subject'));
commit;
