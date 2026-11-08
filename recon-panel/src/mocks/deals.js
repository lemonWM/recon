import { buildInvoices } from './invoices'

// Hardcoded sample data, in the shape n8n will return later.
// One block per CRM source. Numbers are ready-made: the panel does not calculate them.
//
// contract: 'read' = the contract was read and invoices can be scanned,
//           'missing' = no contract attached to the deal.

const hubspotDeal = (crmId) =>
	`https://app-eu1.hubspot.com/contacts/149521488/record/0-3/${crmId}`
const salesforceDeal = (crmId) =>
	`https://recon-dev.lightning.force.com/lightning/r/Opportunity/${crmId}/view`

const ALL_COMPLIANT = { status: 'compliant', statusLabel: 'All compliant' }

export function buildMockData() {
	const invoices = buildInvoices()

	return {
		hubspot: {
			stats: {
				toRecover: 1350,
				mismatches: 6,
				invoicesScanned: 41,
				invoicesTotal: 83,
				invoicesReady: 7,
				contractsReady: 4,
				contractsTotal: 5,
			},
			deals: [
				{
					id: 'd1',
					name: 'Halden Freight · Platform subscription',
					company: 'Halden Freight Ltd',
					contract: 'read',
					contractFile: 'MSA-2025-014.pdf',
					clauses: 14,
					crmUrl: hubspotDeal('525865702598'),
					invoicesScanned: 21,
					invoicesTotal: 22,
					invoicesReady: 1,
					mismatches: 6,
					toRecover: 1350,
					status: 'mismatch',
					statusLabel: '6 mismatches',
				},
				{
					id: 'd2',
					name: 'Brightwater Clinics · Support',
					company: 'Brightwater Clinics',
					contract: 'read',
					contractFile: 'SA-2024-031.pdf',
					clauses: 9,
					crmUrl: hubspotDeal('525865711823'),
					invoicesScanned: 20,
					invoicesTotal: 20,
					invoicesReady: 0,
					mismatches: 0,
					toRecover: 0,
					...ALL_COMPLIANT,
				},
				{
					id: 'd3',
					name: 'Ostrava Tooling · Fleet tracking licence',
					company: 'Ostrava Tooling s.r.o.',
					contract: 'read',
					contractFile: 'LA-2026-002.pdf',
					clauses: 11,
					crmUrl: hubspotDeal('525864985795'),
					invoicesScanned: 18,
					invoicesTotal: 24,
					invoicesReady: 6,
					mismatches: 0,
					toRecover: 0,
					status: 'ready',
					statusLabel: 'Ready to scan',
					scanDone: ALL_COMPLIANT,
				},
				{
					id: 'd4',
					name: 'Kessler & Byrne · Data room hosting',
					company: 'Kessler & Byrne LLP',
					contract: 'missing',
					contractFile: null,
					clauses: null,
					crmUrl: hubspotDeal('525865702626'),
					invoicesScanned: 0,
					invoicesTotal: 17,
					invoicesReady: 0,
					mismatches: null,
					toRecover: null,
					status: 'nocontract',
					statusLabel: 'No contract',
				},
				{
					id: 'd5',
					name: 'Lumen Retail · Loyalty platform',
					company: 'Lumen Retail Group',
					contract: 'read',
					contractFile: 'LRG-2026-118.pdf',
					clauses: 12,
					crmUrl: hubspotDeal('525865702633'),
					invoicesScanned: 0,
					invoicesTotal: 0,
					invoicesReady: 0,
					mismatches: 0,
					toRecover: 0,
					status: 'ready',
					statusLabel: 'Nothing billed yet',
				},
			],
			invoices: { d1: invoices.d1, d2: invoices.d2, d3: invoices.d3, d4: invoices.d4 },
			scanning: null,
		},
		salesforce: {
			stats: {
				toRecover: 0,
				mismatches: 0,
				invoicesScanned: 14,
				invoicesTotal: 20,
				invoicesReady: 6,
				contractsReady: 2,
				contractsTotal: 3,
			},
			deals: [
				{
					id: 's1',
					name: 'Northgate Dental · Practice suite',
					company: 'Northgate Dental Group',
					contract: 'read',
					contractFile: 'MSA-2025-207.pdf',
					clauses: 12,
					crmUrl: salesforceDeal('006Qy00000A1bC2IAJ'),
					invoicesScanned: 10,
					invoicesTotal: 10,
					invoicesReady: 0,
					mismatches: 0,
					toRecover: 0,
					...ALL_COMPLIANT,
				},
				{
					id: 's2',
					name: 'Vireo Logistics · Route planning licence',
					company: 'Vireo Logistics BV',
					contract: 'read',
					contractFile: 'LA-2026-018.pdf',
					clauses: 8,
					crmUrl: salesforceDeal('006Qy00000A1bC3IAJ'),
					invoicesScanned: 18,
					invoicesTotal: 24,
					invoicesReady: 6,
					mismatches: 0,
					toRecover: 0,
					status: 'ready',
					statusLabel: 'Ready to scan',
					scanDone: ALL_COMPLIANT,
				},
				{
					id: 's3',
					name: 'Castellan Hotels · Booking engine',
					company: 'Castellan Hotels SA',
					contract: 'missing',
					contractFile: null,
					clauses: null,
					crmUrl: salesforceDeal('006Qy00000A1bC4IAJ'),
					invoicesScanned: null,
					invoicesTotal: null,
					invoicesReady: 0,
					mismatches: null,
					toRecover: null,
					status: 'nocontract',
					statusLabel: 'No contract',
				},
			],
			invoices: { s1: invoices.s1, s2: invoices.s2 },
			scanning: null,
		},
	}
}

// ---------- Scan simulation ----------
// Only for the mock. With n8n the panel will ask for fresh data after each scanned
// invoice instead of changing numbers by itself.
// `data` is the block of one source. `data.scanning` points at the invoice in progress.

// Pick the next invoice (oldest first) and show "Scanning…" on it and on its deal.
// With a dealId only that deal is scanned, otherwise every deal of the source.
export function mockMarkScanning(data, dealId = null) {
	if (data.scanning) return
	const deals = dealId ? data.deals.filter((deal) => deal.id === dealId) : data.deals

	for (const deal of deals) {
		// Invoices are sorted newest first, so the oldest waiting one is the last match.
		const invoice = (data.invoices[deal.id] ?? []).findLast((item) => item.status === 'ready')
		if (!invoice) continue

		invoice.status = 'scanning'
		deal.idle = { status: deal.status, statusLabel: deal.statusLabel }
		deal.status = 'scanning'
		deal.statusLabel = 'Scanning…'
		data.scanning = { dealId: deal.id, number: invoice.number }
		return
	}
}

// The invoice in progress is finished: write its result and move the counters.
export function mockScanOne(data) {
	if (!data.scanning) return
	const deal = data.deals.find((item) => item.id === data.scanning.dealId)
	const invoice = data.invoices[deal.id].find((item) => item.number === data.scanning.number)

	Object.assign(invoice, invoice.scanResult)
	delete invoice.scanResult

	deal.invoicesReady -= 1
	deal.invoicesScanned += 1
	data.stats.invoicesReady -= 1
	data.stats.invoicesScanned += 1

	const next = deal.invoicesReady === 0 ? (deal.scanDone ?? deal.idle) : deal.idle
	deal.status = next.status
	deal.statusLabel = next.statusLabel
	delete deal.idle
	data.scanning = null
}

// Scan interrupted: the invoice in progress waits again, its deal gets its status back.
export function mockClearScanning(data) {
	if (!data.scanning) return
	const deal = data.deals.find((item) => item.id === data.scanning.dealId)
	const invoice = data.invoices[deal.id].find((item) => item.number === data.scanning.number)

	invoice.status = 'ready'
	deal.status = deal.idle.status
	deal.statusLabel = deal.idle.statusLabel
	delete deal.idle
	data.scanning = null
}
