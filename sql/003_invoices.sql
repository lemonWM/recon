-- Recon 003: invoices + invoice lines
-- Invoices live only in Supabase; the generator plays the role of the accounting system.
-- They are not sent to the RAG side: an invoice is numbers and fields, so plain SQL.
-- Money is numeric, never float — a tool that finds a missing 200 must not invent cents.

create table invoices (
	id            bigint generated always as identity primary key,
	contract_id   bigint not null references contracts(id),
	number        text not null,
	issue_date    date not null,
	period_start  date not null,
	period_end    date not null,
	currency      char(3) not null default 'EUR',
	total_amount  numeric(14,2) not null,
	status        text not null default 'ready'
		check (status in ('ready', 'scanning', 'compliant', 'mismatch', 'no_basis', 'error')),
	scanned_at    timestamptz,
	created_at    timestamptz not null default now(),
	updated_at    timestamptz not null default now(),
	unique (contract_id, number)
);

create table invoice_lines (
	id          bigint generated always as identity primary key,
	invoice_id  bigint not null references invoices(id) on delete cascade,
	line_no     integer not null,
	description text not null,
	quantity    numeric(12,3) not null default 1,
	unit_price  numeric(14,4) not null,
	amount      numeric(14,2) not null,
	unique (invoice_id, line_no)
);

create index invoices_contract_idx on invoices (contract_id);

-- The scan flow asks this one most often: what is still waiting on this contract.
create index invoices_to_scan_idx on invoices (contract_id) where status = 'ready';
