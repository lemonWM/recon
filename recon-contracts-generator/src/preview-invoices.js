// Prints the fee schedule and planted errors for one contract, so the numbers can be
// checked by hand before anything is written to the database.
// Usage: node src/preview-invoices.js 2

import { CONTRACTS } from './terms.js'
import { buildInvoices } from './invoices.js'

const index = Number(process.argv[2] ?? 0)
const terms = CONTRACTS[index]

if (!terms) {
	console.error(`No contract at index ${index}. Available: 0..${CONTRACTS.length - 1}`)
	process.exit(1)
}

const invoices = buildInvoices(terms, { months: 24 })

console.log(`${terms.customer} — ${terms.reference}`)
console.log(`effective ${terms.effectiveFrom}, base ${terms.baseFee} ${terms.currency}`)
console.log('')
console.log('INV number          period   billed    expected  diff      note')

for (const inv of invoices) {
	const t = inv.truth
	const note = t.hasError ? t.errorKind : ''
	console.log(
		[
			inv.number.padEnd(20),
			inv.periodStart.slice(0, 7).padEnd(9),
			String(inv.totalAmount).padEnd(10),
			String(t.expectedTotal).padEnd(10),
			String(t.difference).padEnd(10),
			note,
		].join(''),
	)
}

const planted = invoices.filter((i) => i.truth.hasError)
console.log('')
console.log(`${invoices.length} invoices, ${planted.length} with a planted error, `
	+ `${planted.reduce((s, i) => s + i.truth.difference, 0).toFixed(2)} ${terms.currency} to recover`)
