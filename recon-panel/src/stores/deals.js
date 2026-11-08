import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildMockData, mockClearScanning, mockMarkScanning, mockScanOne } from '@/mocks/deals'
import { useScanStore } from './scan'

// Deal list, summary numbers, sync state and the chosen CRM source.
// For now the data comes from src/mocks. Later the same getters will be fed by n8n,
// and the components will not need to change.

const SYNC_MS = 4000 // simulated sync time
const NOTE_MS = 2000 // how long "Up to date" stays
const FADE_MS = 300 // fade-out before the note is removed

let syncTimer = null

export const useDealsStore = defineStore('deals', () => {
	// Which CRM the panel shows: 'hubspot' or 'salesforce'. Sources are never mixed.
	const source = ref('hubspot')

	// Working copy of the sample data, so the scan simulation can change it.
	const data = ref(buildMockData())

	// Sync note next to the scan button: 'on' | 'fading' | 'off'.
	const syncing = ref(false)
	const syncNote = ref('off')
	let syncedOnce = false

	// Text typed into "Search deals".
	const search = ref('')

	// Summary numbers for the chosen source (the four tiles on the list screen).
	const stats = computed(() => data.value[source.value].stats)

	// All deals of the chosen source.
	const list = computed(() => data.value[source.value].deals)

	// Deals that match the search box.
	const filtered = computed(() => {
		const term = search.value.trim().toLowerCase()
		if (!term) return list.value
		return list.value.filter((deal) => {
			const text = [deal.name, deal.company, deal.contractFile, deal.statusLabel].join(' ')
			return text.toLowerCase().includes(term)
		})
	})

	// One deal of the chosen source, or undefined.
	function getDeal(id) {
		return list.value.find((deal) => deal.id === id)
	}

	// Invoices of one deal, newest first.
	function getInvoices(id) {
		return data.value[source.value].invoices[id] ?? []
	}

	// A deal opened straight from its address may belong to the other source
	// (for example after a page refresh). Show that source then.
	function showSourceOf(id) {
		const found = Object.keys(data.value).find((name) =>
			data.value[name].deals.some((deal) => deal.id === id),
		)
		if (found && found !== source.value) source.value = found
	}

	// Refresh the deal list from the CRM. Simulated with timers for now.
	function sync() {
		clearTimeout(syncTimer)
		syncing.value = true
		syncNote.value = 'on'
		syncTimer = setTimeout(() => {
			syncing.value = false
			syncTimer = setTimeout(() => {
				syncNote.value = 'fading'
				syncTimer = setTimeout(() => {
					syncNote.value = 'off'
				}, FADE_MS)
			}, NOTE_MS)
		}, SYNC_MS)
	}

	// Sync once when the panel opens, not on every return to the list.
	function ensureSynced() {
		if (syncedOnce) return
		syncedOnce = true
		sync()
	}

	// Switching the source stops a running scan, clears the search and syncs again.
	function setSource(next) {
		if (source.value === next) return
		useScanStore().stop()
		source.value = next
		search.value = ''
		sync()
	}

	// Used by the scan store while the scan is simulated.
	function markScanning(dealId = null) {
		mockMarkScanning(data.value[source.value], dealId)
	}
	function scanOne() {
		mockScanOne(data.value[source.value])
	}
	function clearScanning() {
		mockClearScanning(data.value[source.value])
	}

	return {
		source,
		stats,
		list,
		filtered,
		search,
		syncing,
		syncNote,
		getDeal,
		getInvoices,
		showSourceOf,
		sync,
		ensureSynced,
		setSource,
		markScanning,
		scanOne,
		clearScanning,
	}
})
