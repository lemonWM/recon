// Writes generated invoices into Supabase.
// Contracts are not created here: they already exist, synced from HubSpot deals.
// This script only matches terms to those rows by crm_id and fills in the invoices.
//
// Safe to run repeatedly: invoices upsert on (contract_id, number), lines on (invoice_id, line_no).

import { pool } from './db.js'
import { CONTRACTS } from './terms.js'
import { buildInvoices } from './invoices.js'

const MONTHS = 24

async function contractIdFor(crmId) {
	const { rows } = await pool.query(
		`select id from contracts where crm_source = 'hubspot' and crm_id = $1`,
		[crmId],
	)
	return rows[0]?.id ?? null
}

async function upsertInvoice(contractId, inv) {
	const { rows } = await pool.query(
		`insert into invoices
			(contract_id, number, issue_date, period_start, period_end, currency, total_amount)
		 values ($1, $2, $3, $4, $5, $6, $7)
		 on conflict (contract_id, number) do update
			set issue_date   = excluded.issue_date,
				period_start = excluded.period_start,
				period_end   = excluded.period_end,
				currency     = excluded.currency,
				total_amount = excluded.total_amount,
				updated_at   = now()
		 returning id`,
		[
			contractId,
			inv.number,
			inv.issueDate,
			inv.periodStart,
			inv.periodEnd,
			inv.currency,
			inv.totalAmount,
		],
	)
	return rows[0].id
}

async function upsertLines(invoiceId, lines) {
	// Drop lines that are no longer part of the invoice, then write the current ones.
	await pool.query(
		`delete from invoice_lines where invoice_id = $1 and line_no > $2`,
		[invoiceId, lines.length],
	)

	for (const line of lines) {
		await pool.query(
			`insert into invoice_lines
				(invoice_id, line_no, description, quantity, unit_price, amount)
			 values ($1, $2, $3, $4, $5, $6)
			 on conflict (invoice_id, line_no) do update
				set description = excluded.description,
					quantity    = excluded.quantity,
					unit_price  = excluded.unit_price,
					amount      = excluded.amount`,
			[invoiceId, line.lineNo, line.description, line.quantity, line.unitPrice, line.amount],
		)
	}
}

async function main() {
	let written = 0
	let skipped = 0

	for (const terms of CONTRACTS) {
		const contractId = await contractIdFor(terms.crmId)

		if (!contractId) {
			console.log(`skip  ${terms.customer} — no contract row for crm_id ${terms.crmId}`)
			skipped++
			continue
		}

		const invoices = buildInvoices(terms, { months: MONTHS })

		for (const inv of invoices) {
			const invoiceId = await upsertInvoice(contractId, inv)
			await upsertLines(invoiceId, inv.lines)
			written++
		}

		const planted = invoices.filter((i) => i.truth.hasError).length
		console.log(`ok    ${terms.customer} — ${invoices.length} invoices, ${planted} with a planted error`)
	}

	console.log(`\n${written} invoices written, ${skipped} contracts skipped`)
	await pool.end()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
