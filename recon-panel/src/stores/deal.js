import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useDealsStore } from './deals'
import { formatDifference, formatMoney } from '@/utils/format'
import { INVOICE_FILTERS, invoiceStatusLabel, matchesFilter } from '@/utils/status'

// State of the deal details screen: which deal is open, the chosen tab,
// and everything about its invoice table (filter, search, page, selected row).

const PAGE_SIZE = 10

export const useDealStore = defineStore('deal', () => {
	const deals = useDealsStore()

	const id = ref(null)
	const tab = ref('invoices') // 'invoices' | 'reactiveAI'
	const filter = ref('all')
	const search = ref('')
	const page = ref(1)
	const selected = ref('') // number of the invoice whose details are open

	const deal = computed(() => deals.getDeal(id.value))
	const invoices = computed(() => deals.getInvoices(id.value))

	// Invoices that match the search box. Filter counts are based on these.
	const searched = computed(() => {
		const term = search.value.trim().toLowerCase()
		if (!term) return invoices.value
		return invoices.value.filter((invoice) => {
			const text = [
				invoice.number,
				invoice.period,
				formatMoney(invoice.invoiced),
				invoice.expected === null ? '' : formatMoney(invoice.expected),
				invoice.difference === null ? '' : formatDifference(invoice.difference),
				invoiceStatusLabel(invoice.status),
			].join(' ')
			return text.toLowerCase().includes(term)
		})
	})

	// Filter pills with the number of invoices behind each one.
	const filters = computed(() =>
		INVOICE_FILTERS.map((item) => ({
			...item,
			count: searched.value.filter((invoice) => matchesFilter(invoice, item.id)).length,
		})),
	)

	const filtered = computed(() =>
		searched.value.filter((invoice) => matchesFilter(invoice, filter.value)),
	)

	const hasPages = computed(() => filtered.value.length > PAGE_SIZE)
	const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
	const currentPage = computed(() => Math.min(Math.max(1, page.value), pageCount.value))

	// The ten (or fewer) invoices on the current page.
	const rows = computed(() => {
		const start = (currentPage.value - 1) * PAGE_SIZE
		return filtered.value.slice(start, start + PAGE_SIZE)
	})

	// "Showing 1–10 of 22", or "Showing 11 of 11" for a single row.
	const pageInfo = computed(() => {
		const start = (currentPage.value - 1) * PAGE_SIZE
		const count = rows.value.length
		const range = count > 1 ? `${start + 1}–${start + count}` : `${start + 1}`
		return `Showing ${range} of ${filtered.value.length}`
	})

	// The details box shows only an invoice that is visible on the current page.
	const selectedInvoice = computed(() =>
		rows.value.find((invoice) => invoice.number === selected.value),
	)

	// Open a deal: every visit starts from a clean table.
	function open(dealId) {
		id.value = dealId
		tab.value = 'invoices'
		filter.value = 'all'
		search.value = ''
		page.value = 1
		selected.value = ''
	}

	// Changing the filter, the page or the search always closes the details box.
	function setFilter(next) {
		filter.value = next
		page.value = 1
		selected.value = ''
	}

	function setPage(next) {
		page.value = next
		selected.value = ''
	}

	function setSearch(text) {
		search.value = text
		page.value = 1
		selected.value = ''
	}

	// Click on a row opens its details, a second click closes them.
	function toggleInvoice(number) {
		selected.value = selected.value === number ? '' : number
	}

	return {
		id,
		tab,
		filter,
		search,
		deal,
		invoices,
		filters,
		filtered,
		rows,
		hasPages,
		pageCount,
		currentPage,
		pageInfo,
		selected,
		selectedInvoice,
		open,
		setFilter,
		setPage,
		setSearch,
		toggleInvoice,
	}
})
