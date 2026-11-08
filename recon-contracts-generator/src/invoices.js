// Issues invoices against a contract, and records what the correct amount should have been.
// The fee schedule here is the single source of truth for both the invoices and the
// ground truth file — they are derived from the same function, never written twice.

function addMonths(iso, months) {
	const [y, m, d] = iso.split('-').map(Number)
	return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10)
}

function lastDayOfMonth(iso) {
	const [y, m] = iso.split('-').map(Number)
	return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

function round2(n) {
	return Math.round(n * 100) / 100
}

// The rate in force for a billing period, before any discount.
// Walks the fee-changing events in date order: an amendment replaces the fee outright,
// an anniversary raises whatever fee is in force at that moment. That ordering is what
// makes the Ostrava case hard — the anniversary compounds on the amended fee.
export function feeForPeriod(t, periodStart) {
	const events = []

	if (t.increase && t.increase.type === 'anniversary') {
		for (let year = 1; year <= 10; year++) {
			const date = addMonths(t.effectiveFrom, 12 * year)
			if (date <= periodStart) {
				events.push({ date, kind: 'anniversary' })
			}
		}
	}

	if (t.amendment && t.amendment.effectiveFrom <= periodStart) {
		events.push({ date: t.amendment.effectiveFrom, kind: 'amendment' })
	}

	events.sort((a, b) => (a.date < b.date ? -1 : 1))

	let fee = t.baseFee
	for (const event of events) {
		if (event.kind === 'amendment') {
			fee = t.amendment.newFee
		} else {
			fee = fee * (1 + t.increase.percent / 100)
		}
	}

	return round2(fee)
}

// Is this billing period still inside the onboarding discount window?
function discountForPeriod(t, periodIndex) {
	const d = t.decoys.onboardingDiscount
	if (!d || periodIndex >= d.months) return null
	return d
}

// How many billing periods have actually happened by `today`.
// Without this the generator happily issues invoices dated next year.
function periodsSoFar(effectiveFrom, today) {
	const [ey, em] = effectiveFrom.split('-').map(Number)
	const [ty, tm] = today.split('-').map(Number)
	return (ty - ey) * 12 + (tm - em) + 1
}

export function buildInvoices(t, { months = 24, today = new Date().toISOString().slice(0, 10) } = {}) {
	const invoices = []
	const count = Math.max(0, Math.min(months, periodsSoFar(t.effectiveFrom, today)))

	for (let i = 0; i < count; i++) {
		const periodStart = addMonths(t.effectiveFrom, i)
		const periodEnd = lastDayOfMonth(periodStart)
		const period = periodStart.slice(0, 7)

		const rate = feeForPeriod(t, periodStart)
		const discount = discountForPeriod(t, i)

		// What a correct invoice would say.
		const correctLines = [
			{
				lineNo: 1,
				description: `Subscription — ${period}`,
				quantity: 1,
				unitPrice: rate,
				amount: rate,
			},
		]
		if (discount) {
			correctLines.push({
				lineNo: 2,
				description: `Onboarding discount (${discount.percent}%)`,
				quantity: 1,
				unitPrice: round2(-rate * discount.percent / 100),
				amount: round2(-rate * discount.percent / 100),
			})
		}
		const correctTotal = round2(correctLines.reduce((sum, l) => sum + l.amount, 0))

		// Was an error deliberately planted in this period?
		const planted = (t.errors ?? []).find((e) => e.period === period) ?? null

		let lines = correctLines
		let total = correctTotal

		if (planted) {
			const wrongTotal = round2(planted.billedRate)

			if (planted.kind === 'expired_discount') {
				// The point of this error is that a discount is still being applied.
				// Collapsing it into one line would hide the very thing Recon must spot.
				const d = t.decoys.onboardingDiscount
				const off = round2(-rate * d.percent / 100)
				lines = [
					{
						lineNo: 1,
						description: `Subscription — ${period}`,
						quantity: 1,
						unitPrice: rate,
						amount: rate,
					},
					{
						lineNo: 2,
						description: `Onboarding discount (${d.percent}%)`,
						quantity: 1,
						unitPrice: off,
						amount: off,
					},
				]
				total = round2(rate + off)
			} else {
				lines = [
					{
						lineNo: 1,
						description: `Subscription — ${period}`,
						quantity: 1,
						unitPrice: wrongTotal,
						amount: wrongTotal,
					},
				]
				total = wrongTotal
			}
		}

		invoices.push({
			number: `INV-${period.replace('-', '-')}`,
			issueDate: periodStart,
			periodStart,
			periodEnd,
			currency: t.currency,
			totalAmount: total,
			lines,
			// Everything below is answer key, never written to the tables Recon reads.
			truth: {
				expectedTotal: correctTotal,
				expectedRate: rate,
				hasError: Boolean(planted),
				errorKind: planted ? planted.kind : null,
				difference: planted ? round2(correctTotal - total) : 0,
			},
		})
	}

	return invoices
}
