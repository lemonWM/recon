// Contract terms as data, not prose.
// The same object drives three things: the contract text, the invoices issued against it,
// and the ground truth file. Keeping them in one place is what stops them drifting apart.
//
// crmId maps each set of terms to a deal already synced from HubSpot into `contracts`.

export const CONTRACTS = [
	{
		crmId: '525865702598',
		customer: 'Halden Freight Ltd',
		customerShort: 'Halden',
		reference: 'MSA-2025-014',
		fileName: 'MSA-2025-014.pdf',
		service: 'fleet platform subscription',
		effectiveFrom: '2025-01-01',
		termMonths: 36,
		baseFee: 4500,
		currency: 'EUR',
		// Fee goes up on each anniversary of the effective date.
		increase: { type: 'anniversary', percent: 3 },
		amendment: null,
		decoys: {
			// Looks like grounds to question an invoice, but never triggers.
			overage: { includedUnits: 500, unitFee: 2 },
			// Discount that has already expired by the time invoices are issued.
			onboardingDiscount: { percent: 15, months: 3 },
		},
		// Planted errors. Correct rate from 2026-01 is 4635 (4500 + 3%).
		errors: [
			// Discount kept running three periods past its expiry.
			{ period: '2025-05', kind: 'expired_discount', billedRate: 3825 },
			{ period: '2026-02', kind: 'missed_increase', billedRate: 4500 },
			{ period: '2026-03', kind: 'missed_increase', billedRate: 4500 },
			{ period: '2026-06', kind: 'missed_increase', billedRate: 4500 },
			{ period: '2026-08', kind: 'missed_increase', billedRate: 4500 },
			{ period: '2026-09', kind: 'missed_increase', billedRate: 4500 },
		],
	},
	{
		crmId: '525865711823',
		customer: 'Brightwater Clinics',
		customerShort: 'Brightwater',
		reference: 'SA-2024-031',
		fileName: 'SA-2024-031.pdf',
		service: 'clinic support service',
		effectiveFrom: '2025-03-01',
		termMonths: 24,
		baseFee: 2800,
		currency: 'EUR',
		// No increase clause at all — the honest answer to "what is the 2026 rate?"
		// is that the contract does not say.
		increase: null,
		amendment: null,
		decoys: {
			overage: { includedUnits: 50, unitFee: 25 },
			onboardingDiscount: null,
		},
		// Inverse case: the contract fixes the fee, so any change is the mismatch.
		errors: [
			{ period: '2025-08', kind: 'underbilled', billedRate: 2600 },
			{ period: '2025-11', kind: 'increase_without_basis', billedRate: 2940 },
			{ period: '2026-04', kind: 'increase_without_basis', billedRate: 2884 },
			{ period: '2026-07', kind: 'increase_without_basis', billedRate: 2884 },
		],
	},
	{
		crmId: '525864985795',
		customer: 'Ostrava Tooling s.r.o.',
		customerShort: 'Ostrava',
		reference: 'LA-2026-002',
		fileName: 'LA-2026-002.pdf',
		service: 'fleet tracking licence',
		effectiveFrom: '2024-10-01',
		termMonths: 36,
		baseFee: 3200,
		currency: 'EUR',
		increase: { type: 'anniversary', percent: 5 },
		// The hard case: a second, equally authoritative statement about the fee.
		// Only the invoice date decides which one applies.
		amendment: { effectiveFrom: '2025-07-01', newFee: 3900 },
		decoys: {
			overage: { includedUnits: 120, unitFee: 8 },
			onboardingDiscount: { percent: 10, months: 2 },
		},
		// Correct: 3900 from 2025-07, 4095 from 2025-10 (anniversary on the amended fee).
		errors: [
			{ period: '2025-08', kind: 'missed_amendment', billedRate: 3200 },
			{ period: '2025-09', kind: 'missed_amendment', billedRate: 3200 },
			{ period: '2025-11', kind: 'missed_increase', billedRate: 3900 },
			{ period: '2025-12', kind: 'missed_increase', billedRate: 3900 },
			{ period: '2026-02', kind: 'missed_increase', billedRate: 3900 },
			{ period: '2026-05', kind: 'missed_increase', billedRate: 3900 },
		],
	},
	{
		// Contract signed, nothing billed yet: the effective date is still ahead of today,
		// so the generator produces no invoices. The empty list comes from the date,
		// not from a special case in the code.
		crmId: '525865702633',
		customer: 'Lumen Retail Group',
		customerShort: 'Lumen',
		reference: 'LRG-2026-118',
		fileName: 'LRG-2026-118.pdf',
		service: 'loyalty platform licence',
		effectiveFrom: '2026-11-01',
		termMonths: 24,
		baseFee: 5200,
		currency: 'EUR',
		increase: { type: 'anniversary', percent: 4 },
		amendment: null,
		decoys: {
			overage: { includedUnits: 10000, unitFee: 0.04 },
			onboardingDiscount: null,
		},
		// No invoices exist yet, so there is nothing to plant an error in.
		errors: [],
	},
	{
		// Invoices without a contract on file. `fileName: null` means no document is
		// generated and none is attached to the deal, so Recon has nothing to compare
		// against and must say so instead of guessing.
		crmId: '525865702626',
		customer: 'Kessler & Byrne LLP',
		customerShort: 'Kessler',
		reference: 'KB-2025-047',
		fileName: null,
		service: 'data room hosting',
		effectiveFrom: '2025-06-01',
		termMonths: 36,
		baseFee: 1850,
		currency: 'EUR',
		increase: null,
		amendment: null,
		decoys: {
			overage: null,
			onboardingDiscount: null,
		},
		// Nothing planted: with no contract there is no correct rate to deviate from.
		errors: [],
	},
]
