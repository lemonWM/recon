<script setup>
import StatTile from '@/components/StatTile.vue'
import { useDealsStore } from '@/stores/deals'
import { formatMoney, formatOf } from '@/utils/format'

// Four summary tiles for the chosen CRM source.
const deals = useDealsStore()
</script>

<template>
	<section class="listing-stats" aria-label="Summary">
		<StatTile label="To recover" :value="formatMoney(deals.stats.toRecover)" accent />
		<StatTile label="Mismatches" :value="deals.stats.mismatches" />
		<StatTile
			label="Invoices scanned"
			:value="formatOf(deals.stats.invoicesScanned, deals.stats.invoicesTotal)"
		/>
		<StatTile
			label="Contracts ready"
			:value="formatOf(deals.stats.contractsReady, deals.stats.contractsTotal)"
		/>
	</section>
</template>

<style scoped lang="scss">
.listing-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
	gap: $gap-small;
}
</style>
