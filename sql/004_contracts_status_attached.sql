-- Adds the 'attached' contract status: the file is on the deal but has not been read yet.
-- Drops 'unreadable' (decision 26.10: a contract either exists or it does not).
-- Applied directly in Supabase on 26.10.2026; this file records it in the repository.
alter table contracts drop constraint contracts_status_check;

alter table contracts add constraint contracts_status_check
	check (status in ('no_contract', 'attached', 'read'));

-- One-off backfill: rows synced before this status existed already had a file
update contracts
set status = 'attached', updated_at = now()
where file_path is not null and status = 'no_contract';
