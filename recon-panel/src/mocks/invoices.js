// Sample invoices for each deal, newest first, in the shape n8n will return later.

const MONTHS = ['Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan']
const pad = (n) => String(n).padStart(2, '0')
const euro = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n)

// Text shown in the details of an invoice that matches the contract.
function compliantDetail(file, fee) {
	return {
		summary: `Matches the contract. The monthly fee in force on the invoice date is ${euro(fee)}.`,
		source: `${file} · contract version in force on the invoice date`,
	}
}

function compliant(number, period, fee, file) {
	return {
		number,
		period,
		status: 'compliant',
		invoiced: fee,
		expected: fee,
		difference: 0,
		ticket: null,
		detail: compliantDetail(file, fee),
	}
}

// Not scanned yet. scanResult is what the simulated scan will find.
function ready(number, period, fee, file) {
	return {
		number,
		period,
		status: 'ready',
		invoiced: fee,
		expected: null,
		difference: null,
		ticket: null,
		detail: null,
		scanResult: {
			status: 'compliant',
			expected: fee,
			difference: 0,
			detail: compliantDetail(file, fee),
		},
	}
}

// Halden Freight: the 4% increase from January 2026 was missed for three months.
function haldenInvoices() {
	const file = 'MSA-2025-014.pdf'
	const fee = 5200
	const statuses = [
		'ready',
		'nobasis',
		'compliant',
		'compliant',
		'compliant',
		'compliant',
		'compliant',
		'mismatch',
		'mismatch',
		'mismatch',
	]
	const tickets = {
		7: { number: '#1042', status: 'New' },
		8: { number: '#1041', status: 'New' },
		9: { number: '#1040', status: 'In review' },
	}

	const rows = MONTHS.map((month, i) => {
		const number = `INV-2026-0${pad(10 - i)}`
		const period = `${month} 2026`
		const status = statuses[i]

		if (status === 'ready') return ready(number, period, fee, file)
		if (status === 'compliant') return compliant(number, period, fee, file)

		if (status === 'nobasis') {
			return {
				number,
				period,
				status,
				invoiced: 5680,
				expected: null,
				difference: null,
				ticket: null,
				detail: {
					summary: 'One line has no basis in the contract.',
					body: 'The invoice includes “Additional user licences (12)” for €480.00. The contract has no clause that sets a price for additional users, so Recon can neither confirm nor dispute this line. The base fee of €5,200.00 matches §4.1 and §4.2.',
					note: 'No ticket was created. This line needs a person to decide.',
				},
			}
		}

		return {
			number,
			period,
			status: 'mismatch',
			invoiced: 5000,
			expected: fee,
			difference: -200,
			ticket: { ...tickets[i], url: '#' },
			detail: {
				summary:
					'Billed at the 2025 monthly fee. The 4% increase due from 1 January 2026 was not applied.',
				clauses: [
					{
						ref: '§4.1',
						text: 'The Customer shall pay a Monthly Fee of EUR 5,000.00 for the Services, invoiced monthly in arrears.',
					},
					{
						ref: '§4.2',
						text: 'With effect from 1 January of each calendar year, the Monthly Fee shall be increased by four percent (4%) over the Monthly Fee applicable in the preceding calendar year.',
					},
				],
				source: `${file} · page 3 · contract version in force on the invoice date`,
			},
		}
	})

	// The contract started in January 2025, so there is a full earlier year at the old fee.
	const older = ['Dec', 'Nov', ...MONTHS].map((month, i) =>
		compliant(`INV-2025-0${pad(12 - i)}`, `${month} 2025`, 5000, file),
	)

	return [...rows, ...older]
}

// Monthly periods counted back from October 2026, newest first.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function backMonths(count, fromYear = 2026, fromMonth = 10) {
	const out = []
	for (let i = 0; i < count; i++) {
		const total = fromYear * 12 + (fromMonth - 1) - i
		out.push({ month: MONTH_NAMES[total % 12], year: Math.floor(total / 12) })
	}
	return out
}

// A run of monthly invoices at one fee. The newest `readyCount` are not scanned yet.
function series(prefix, fee, file, count, readyCount = 0) {
	return backMonths(count).map((p, i) => {
		const number = `INV-${p.year}-${prefix}${pad(count - i)}`
		const period = `${p.month} ${p.year}`
		return i < readyCount
			? ready(number, period, fee, file)
			: compliant(number, period, fee, file)
	})
}

// Invoices on a deal with no contract on file: nothing to compare them against.
function noBasisSeries(prefix, fee, count) {
	return backMonths(count).map((p, i) => ({
		number: `INV-${p.year}-${prefix}${pad(count - i)}`,
		period: `${p.month} ${p.year}`,
		status: 'nobasis',
		invoiced: fee,
		expected: null,
		difference: null,
		ticket: null,
		detail: {
			summary: 'No contract on file for this deal.',
			body: 'Recon has no document to read, so it cannot say what the agreed rate is. '
				+ 'The invoice is neither confirmed nor disputed until a contract is attached to the deal.',
			note: 'No ticket was created. Attach the contract and run the scan again.',
		},
	}))
}

// Ten monthly invoices for 2026. The newest `readyCount` are not scanned yet.
function monthly(prefix, fee, file, readyCount = 0) {
	return MONTHS.map((month, i) => {
		const number = `INV-2026-${prefix}${pad(10 - i)}`
		const period = `${month} 2026`
		return i < readyCount
			? ready(number, period, fee, file)
			: compliant(number, period, fee, file)
	})
}

export function buildInvoices() {
	return {
		d1: haldenInvoices(),
		d2: series('1', 3400, 'SA-2024-031.pdf', 20),
		d3: series('2', 1950, 'LA-2026-002.pdf', 24, 6),
		// Invoices exist, the contract does not.
		d4: noBasisSeries('5', 1850, 17),
		s1: monthly('3', 4100, 'MSA-2025-207.pdf'),
		s2: monthly('4', 2750, 'LA-2026-018.pdf', 6),
	}
}
