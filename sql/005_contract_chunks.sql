-- Clause-level chunks of contract PDFs, used for retrieval (RAG).
-- One row = one clause with its metadata and (later) its embedding.
create table contract_chunks (
	id              bigint generated always as identity primary key,
	contract_id     bigint not null references contracts (id) on delete cascade,
	chunk_index     integer not null,
	part            text not null,                 -- 'base' or 'amendment-1', 'amendment-2'…
	section_title   text,                          -- e.g. 'FEE ADJUSTMENT'
	clause_no       text not null,                 -- e.g. '5.1', 'A.1', 'PREAMBLE'
	valid_from      date,                          -- effective date of this part of the document
	page_start      integer not null,
	page_end        integer not null,
	text            text not null,
	embedding       extensions.vector(1024),       -- filled in the embedding step
	embedding_model text,                          -- e.g. 'voyage-4-lite'
	created_at      timestamptz not null default now(),

	unique (contract_id, chunk_index)
);

-- Retrieval always filters by contract first
create index contract_chunks_contract_id_idx on contract_chunks (contract_id);