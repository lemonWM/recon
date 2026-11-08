-- Recon 001: customers + contracts
-- Mirror of CRM data (HubSpot companies and deals), copied in by the sync flow.
-- Neutral naming so Salesforce lands in the same tables (agent.md, section 5).

create table customers (
	id              bigint generated always as identity primary key,
	crm_source      text not null check (crm_source in ('hubspot', 'salesforce')),
	crm_id          text not null,
	name            text not null,
	created_at      timestamptz not null default now(),
	updated_at      timestamptz not null default now(),
	unique (crm_source, crm_id)
);

create table contracts (
	id                  bigint generated always as identity primary key,
	customer_id         bigint not null references customers(id),
	crm_source          text not null check (crm_source in ('hubspot', 'salesforce')),
	crm_id              text not null,
	name                text not null,
	crm_url             text,
	contract_start_date date,
	last_checked_at     timestamptz,
	file_name           text,
	file_path           text,
	status              text not null default 'no_contract'
		check (status in ('no_contract', 'unreadable', 'read')),
	created_at          timestamptz not null default now(),
	updated_at          timestamptz not null default now(),
	unique (crm_source, crm_id)
);

-- Deals are always read per source, so the lookup follows that shape.
create index contracts_customer_idx on contracts (customer_id);
