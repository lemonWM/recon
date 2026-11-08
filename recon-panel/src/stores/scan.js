import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useDealsStore } from './deals'

// Scan queue. Invoices are scanned one by one, and only after a button is clicked.
// The scan lives in a store so it keeps running when the user moves between screens.

const INVOICE_MS = 3000 // simulated time for one invoice

let timer = null

export const useScanStore = defineStore('scan', () => {
	// How many invoices are still waiting in the current scan.
	const remaining = ref(0)

	// null = every deal of the source, otherwise the id of the one deal being scanned.
	const scope = ref(null)

	const busy = computed(() => remaining.value > 0)

	function step() {
		const deals = useDealsStore()
		deals.markScanning(scope.value)
		timer = setTimeout(() => {
			deals.scanOne()
			remaining.value -= 1
			if (remaining.value > 0) step()
		}, INVOICE_MS)
	}

	// Start a scan: one deal when dealId is given, otherwise everything that is ready.
	// The list button waits for the sync, because the list may still change.
	function start(dealId = null) {
		const deals = useDealsStore()
		if (busy.value) return
		if (!dealId && deals.syncing) return

		const count = dealId ? deals.getDeal(dealId)?.invoicesReady : deals.stats.invoicesReady
		if (!count) return

		scope.value = dealId
		remaining.value = count
		step()
	}

	function stop() {
		if (!busy.value) return
		clearTimeout(timer)
		remaining.value = 0
		useDealsStore().clearScanning()
	}

	return { remaining, scope, busy, start, stop }
})
