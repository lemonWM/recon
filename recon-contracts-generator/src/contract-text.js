// Builds the English contract text from a terms object.
// Most sections are deliberate noise: without them the retrieval task is trivial
// and the measurements come out flattering and meaningless.

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
]

function longDate(iso) {
	const [y, m, d] = iso.split('-').map(Number)
	return `${d} ${MONTHS[m - 1]} ${y}`
}

function money(amount, currency) {
	return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function addMonths(iso, months) {
	const [y, m, d] = iso.split('-').map(Number)
	const base = new Date(Date.UTC(y, m - 1 + months, d))
	return base.toISOString().slice(0, 10)
}

export function buildContractText(t) {
	const endDate = addMonths(t.effectiveFrom, t.termMonths)
	const s = []

	s.push(`MASTER SERVICES AGREEMENT`)
	s.push(`Reference: ${t.reference}`)
	s.push(``)
	s.push(`This Agreement is made between Northwind Systems B.V. ("Provider") and `
		+ `${t.customer} ("Customer") and is effective from ${longDate(t.effectiveFrom)} `
		+ `(the "Effective Date").`)
	s.push(``)

	s.push(`1. DEFINITIONS`)
	s.push(`1.1 "Services" means the ${t.service} made available by the Provider under this `
		+ `Agreement, together with any documentation supplied with it.`)
	s.push(`1.2 "Billing Period" means a calendar month, unless the parties agree otherwise `
		+ `in writing.`)
	s.push(`1.3 "Business Day" means a day other than a Saturday, Sunday or public holiday `
		+ `in the Netherlands.`)
	s.push(``)

	s.push(`2. SCOPE OF SERVICES`)
	s.push(`2.1 The Provider shall supply the Services with reasonable skill and care and in `
		+ `accordance with the service levels set out in Section 8.`)
	s.push(`2.2 The Provider may improve or modify the Services provided that no such change `
		+ `materially reduces their functionality during the Term.`)
	s.push(``)

	s.push(`3. TERM AND RENEWAL`)
	s.push(`3.1 This Agreement commences on the Effective Date and continues for `
		+ `${t.termMonths} months, ending on ${longDate(endDate)} (the "Initial Term").`)
	s.push(`3.2 After the Initial Term this Agreement renews automatically for successive `
		+ `periods of twelve months unless either party gives ninety days written notice.`)
	s.push(``)

	s.push(`4. FEES`)
	s.push(`4.1 The Customer shall pay a subscription fee of `
		+ `${money(t.baseFee, t.currency)} per month for the Services.`)
	s.push(`4.2 All fees are exclusive of value added tax, which shall be added at the `
		+ `applicable rate.`)
	if (t.decoys.onboardingDiscount) {
		const d = t.decoys.onboardingDiscount
		s.push(`4.3 A one-off onboarding discount of ${d.percent}% applies to the first `
			+ `${d.months} Billing Periods following the Effective Date. The discount `
			+ `expires automatically thereafter and shall not be applied to any later `
			+ `Billing Period.`)
	}
	s.push(``)

	s.push(`5. FEE ADJUSTMENT`)
	if (t.increase && t.increase.type === 'anniversary') {
		s.push(`5.1 On each anniversary of the Effective Date the subscription fee shall `
			+ `increase by ${t.increase.percent}% of the fee applicable immediately before `
			+ `that anniversary. The adjusted fee applies to every Billing Period beginning `
			+ `on or after that anniversary.`)
		s.push(`5.2 The Provider is not required to give separate notice of an adjustment `
			+ `made under Section 5.1.`)
	} else {
		s.push(`5.1 The subscription fee is fixed for the Initial Term. Any change to the `
			+ `fee requires the written agreement of both parties.`)
	}
	s.push(``)

	s.push(`6. INVOICING AND PAYMENT`)
	s.push(`6.1 The Provider shall invoice the Customer monthly in advance for each Billing `
		+ `Period.`)
	s.push(`6.2 Invoices are payable within thirty days of the invoice date.`)
	s.push(`6.3 Late payment may attract interest at the statutory rate.`)
	s.push(``)

	s.push(`7. USAGE LIMITS AND OVERAGE`)
	const o = t.decoys.overage
	s.push(`7.1 The subscription includes up to ${o.includedUnits} active units per Billing `
		+ `Period.`)
	s.push(`7.2 Where usage exceeds the included allowance, the Provider may charge `
		+ `${money(o.unitFee, t.currency)} for each additional unit. Any such charge shall be `
		+ `itemised separately on the relevant invoice.`)
	s.push(``)

	s.push(`8. SERVICE LEVELS`)
	s.push(`8.1 The Provider shall use reasonable endeavours to maintain availability of `
		+ `99.5% measured monthly, excluding scheduled maintenance.`)
	s.push(`8.2 Scheduled maintenance shall be notified at least five Business Days in `
		+ `advance.`)
	s.push(``)

	s.push(`9. SUPPORT`)
	s.push(`9.1 Support is available on Business Days between 09:00 and 17:00 Central `
		+ `European Time.`)
	s.push(`9.2 The Provider shall acknowledge support requests within one Business Day.`)
	s.push(``)

	s.push(`10. DATA PROTECTION`)
	s.push(`10.1 Each party shall comply with applicable data protection law in respect of `
		+ `personal data processed under this Agreement.`)
	s.push(`10.2 The Provider shall not transfer personal data outside the European Economic `
		+ `Area without the prior written consent of the Customer.`)
	s.push(``)

	s.push(`11. CONFIDENTIALITY`)
	s.push(`11.1 Neither party shall disclose the other party's confidential information to `
		+ `any third party without prior written consent.`)
	s.push(`11.2 This Section survives termination of this Agreement for a period of three `
		+ `years.`)
	s.push(``)

	s.push(`12. LIABILITY`)
	s.push(`12.1 Neither party excludes liability for death or personal injury caused by its `
		+ `negligence, or for fraud.`)
	s.push(`12.2 Subject to Section 12.1, the total liability of either party in any contract `
		+ `year shall not exceed the fees paid in that year.`)
	s.push(``)

	s.push(`13. TERMINATION`)
	s.push(`13.1 Either party may terminate this Agreement with immediate effect if the other `
		+ `commits a material breach which is not remedied within thirty days of notice.`)
	s.push(`13.2 Termination does not affect fees already due.`)
	s.push(``)

	s.push(`14. GOVERNING LAW`)
	s.push(`14.1 This Agreement is governed by the laws of the Netherlands.`)
	s.push(`14.2 The courts of Amsterdam have exclusive jurisdiction.`)
	s.push(``)

	s.push(`15. MISCELLANEOUS`)
	s.push(`15.1 This Agreement constitutes the entire agreement between the parties.`)
	s.push(`15.2 No variation is effective unless made in writing and signed by both parties.`)

	if (t.amendment) {
		const a = t.amendment
		s.push(``)
		s.push(`AMENDMENT No. 1`)
		s.push(``)
		s.push(`This Amendment to agreement ${t.reference} is effective from `
			+ `${longDate(a.effectiveFrom)}.`)
		s.push(`A.1 Section 4.1 is replaced in its entirety by the following: "The Customer `
			+ `shall pay a subscription fee of ${money(a.newFee, t.currency)} per month for `
			+ `the Services."`)
		s.push(`A.2 The adjusted fee applies to every Billing Period beginning on or after `
			+ `${longDate(a.effectiveFrom)}. Billing Periods before that date remain governed `
			+ `by the fee previously in force.`)
		s.push(`A.3 All other terms of the Agreement remain unchanged and in full force.`)
	}

	return s.join('\n')
}
