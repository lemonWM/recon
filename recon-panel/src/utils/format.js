// Display helpers. They only format ready values, they never calculate business numbers.

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

// 600 -> "€600.00"
export function formatMoney(amount) {
	return money.format(amount)
}

// Difference column: -200 -> "−€200.00", 0 -> "€0.00"
export function formatDifference(amount) {
	return amount < 0 ? `−${money.format(-amount)}` : money.format(amount)
}

// (36, 43) -> "36 of 43"
export function formatOf(part, total) {
	return `${part} of ${total}`
}

// Label of the scan button: 0 -> "Nothing to scan", 1 -> "Scan 1 invoice", 7 -> "Scan 7 invoices"
export function scanLabel(count) {
	if (!count) return 'Nothing to scan'
	return count === 1 ? 'Scan 1 invoice' : `Scan ${count} invoices`
}
