<script setup>
import { watch } from 'vue'
import BackLink from '@/components/BackLink.vue'
import SingleSummary from '@/modules/SingleSummary.vue'
import SingleWorkspace from '@/modules/SingleWorkspace.vue'
import { useDealStore } from '@/stores/deal'
import { useDealsStore } from '@/stores/deals'

// Deal details. The id comes from the address: /deals/:id
const props = defineProps({
	id: { type: String, required: true },
})

const store = useDealStore()
const deals = useDealsStore()

// Runs on the first visit and again when the address changes to another deal.
watch(
	() => props.id,
	(id) => {
		deals.showSourceOf(id)
		store.open(id)
	},
	{ immediate: true },
)
</script>

<template>
	<div class="panel-single__wrapper">
		<div>
			<BackLink :to="{ name: 'deals' }">All deals</BackLink>
		</div>

		<template v-if="store.deal">
			<SingleSummary />
			<!-- Invoices are shown even with no contract: they exist, they just cannot be checked. -->
			<SingleWorkspace v-if="store.deal.contract === 'read' || store.invoices.length" />
		</template>

		<p v-else class="panel-single__missing">This deal does not exist in the panel.</p>
	</div>
</template>

<style scoped lang="scss">
// The view only stacks modules and sets the space between them.
.panel-single__wrapper {
	display: flex;
	flex-direction: column;
	gap: $gap;
}

.panel-single__missing {
	color: $color-text-muted;
}
</style>
