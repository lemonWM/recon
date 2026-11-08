// Names shown for invoice statuses. One vocabulary everywhere: the action is "scan".
const INVOICE_STATUS_LABELS = {
	ready: 'Ready to scan',
	scanning: 'Scanning…',
	compliant: 'Compliant',
	mismatch: 'Mismatch',
	nobasis: 'No contract basis',
}

export function invoiceStatusLabel(status) {
	return INVOICE_STATUS_LABELS[status] ?? status
}

// Filters above the invoice table, in display order.
// "ready" also covers the invoice that is being scanned right now.
export const INVOICE_FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: 'mismatch', label: 'Mismatch' },
	{ id: 'nobasis', label: 'No contract basis' },
	{ id: 'compliant', label: 'Compliant' },
	{ id: 'ready', label: 'Ready to scan' },
]

export function matchesFilter(invoice, filter) {
	if (filter === 'all') return true
	if (filter === 'ready') return invoice.status === 'ready' || invoice.status === 'scanning'
	return invoice.status === filter
}
