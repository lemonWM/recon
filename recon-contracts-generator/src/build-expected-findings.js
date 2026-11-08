// Writes the answer key: what a correct scan should report, and nothing else.
//
// It is derived from the same buildInvoices() call that produced the invoices in the
// database, so the key cannot drift away from the data it describes.
//
// This file never goes into Supabase. Recon must reach its findings by reading the
// contract PDF; comparing them against this key is how detection rate and false alarms
// are measured afterwards.
//
// Usage: npm run findings

import fs from 'node:fs'
import path from 'node:path'
import { CONTRACTS } from './terms.js'
import { buildInvoices } from './invoices.js'

const OUT_DIR = 'out'

const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })

function collect() {
	const findings = []
	const contracts = []

	for (const terms of CONTRACTS) {
		const invoices = buildInvoices(terms)
		const mine = []

		for (const invoice of invoices) {
			if (!invoice.truth.hasError) continue
			mine.push({
				crmId: terms.crmId,
				customer: terms.customer,
				reference: terms.reference,
				invoiceNumber: invoice.number,
				period: invoice.periodStart.slice(0, 7),
				currency: invoice.currency,
				billed: invoice.totalAmount,
				expected: invoice.truth.expectedTotal,
				difference: invoice.truth.difference,
				kind: invoice.truth.errorKind,
			})
		}

		findings.push(...mine)
		contracts.push({
			crmId: terms.crmId,
			customer: terms.customer,
			reference: terms.reference,
			contractFile: terms.fileName,
			invoices: invoices.length,
			expectedFindings: mine.length,
			expectation: expectationFor(terms, invoices.length, mine.length),
		})
	}

	return { findings, contracts }
}

// One sentence saying what a correct scan should conclude about this contract.
function expectationFor(terms, invoiceCount, findingCount) {
	if (!terms.fileName) {
		return `No contract document. Every invoice should come back as "no basis to check", `
			+ `never as compliant and never as a mismatch.`
	}
	if (invoiceCount === 0) {
		return 'Contract readable, nothing billed yet. No findings of any kind.'
	}
	if (findingCount === 0) {
		return 'All invoices match the contract. Any finding here is a false alarm.'
	}
	if (!terms.increase && !terms.amendment) {
		return `The contract fixes the fee and says nothing about increases, so every `
			+ `departure from ${terms.currency} ${money(terms.baseFee)} is a finding.`
	}
	return `${findingCount} invoices depart from the rate in force on their billing period.`
}

function toMarkdown({ findings, contracts }) {
	const total = findings.reduce((sum, f) => sum + f.difference, 0)
	const lines = []

	lines.push('# Expected findings')
	lines.push('')
	lines.push('What a correct scan should report. Generated from the same source as the')
	lines.push('invoices themselves, by `npm run findings`. Not stored in the database:')
	lines.push('Recon has to reach these conclusions by reading the contract.')
	lines.push('')
	lines.push(`**${findings.length} findings across ${contracts.length} contracts.** `
		+ `Net difference: EUR ${money(total)}.`)
	lines.push('')

	lines.push('## Per contract')
	lines.push('')
	lines.push('| Customer | Contract | Invoices | Findings | What a correct scan concludes |')
	lines.push('| --- | --- | ---: | ---: | --- |')
	for (const c of contracts) {
		lines.push(`| ${c.customer} | ${c.contractFile ?? '—'} | ${c.invoices} `
			+ `| ${c.expectedFindings} | ${c.expectation} |`)
	}
	lines.push('')

	lines.push('## Every expected finding')
	lines.push('')
	lines.push('| Customer | Invoice | Period | Billed | Expected | Difference | Kind |')
	lines.push('| --- | --- | --- | ---: | ---: | ---: | --- |')
	for (const f of findings) {
		lines.push(`| ${f.customer} | ${f.invoiceNumber} | ${f.period} `
			+ `| ${money(f.billed)} | ${money(f.expected)} | ${money(f.difference)} | ${f.kind} |`)
	}
	lines.push('')

	lines.push('## Kinds')
	lines.push('')
	const kinds = {}
	for (const f of findings) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1
	for (const [kind, count] of Object.entries(kinds).sort()) {
		lines.push(`- \`${kind}\` — ${count}`)
	}
	lines.push('')

	return lines.join('\n')
}

function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true })
	const data = collect()

	const json = {
		generatedAt: new Date().toISOString().slice(0, 10),
		note: 'Answer key for Recon. Never load this into the database.',
		totals: {
			contracts: data.contracts.length,
			findings: data.findings.length,
			netDifference: Number(data.findings.reduce((s, f) => s + f.difference, 0).toFixed(2)),
		},
		contracts: data.contracts,
		findings: data.findings,
	}

	fs.writeFileSync(path.join(OUT_DIR, 'expected-findings.json'), JSON.stringify(json, null, '\t') + '\n')
	fs.writeFileSync(path.join(OUT_DIR, 'expected-findings.md'), toMarkdown(data))

	console.log(`expected-findings.json  ${data.findings.length} findings`)
	console.log(`expected-findings.md    ${data.contracts.length} contracts`)
}

main()
