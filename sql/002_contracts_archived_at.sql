-- Recon 002: soft delete for contracts
-- A deal removed in the CRM, or with deal_recon unchecked, must disappear from the panel
-- without losing its invoices and findings. Soft, so it can come back.

alter table contracts
	add column archived_at timestamptz;

-- The panel always asks for live contracts, so index that path.
create index contracts_live_idx on contracts (crm_source) where archived_at is null;
