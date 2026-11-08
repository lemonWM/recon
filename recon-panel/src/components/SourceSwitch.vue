<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useDealsStore } from '@/stores/deals'

// Two-segment switch in the header: HubSpot / Salesforce.
const deals = useDealsStore()
const route = useRoute()
const router = useRouter()

// A deal belongs to one CRM, so switching the source always leads back to the list.
function pick(id) {
	deals.setSource(id)
	if (route.name !== 'deals') router.push({ name: 'deals' })
}

const sources = [
	{ id: 'hubspot', label: 'HubSpot' },
	{ id: 'salesforce', label: 'Salesforce' },
]
</script>

<template>
	<div class="source-switch" role="group" aria-label="CRM source">
		<button
			v-for="item in sources"
			:key="item.id"
			type="button"
			class="source-switch__option"
			:class="{ 'is-active': deals.source === item.id }"
			:aria-pressed="deals.source === item.id"
			@click="pick(item.id)"
		>
			{{ item.label }}
		</button>
	</div>
</template>

<style scoped lang="scss">
.source-switch {
	display: inline-flex;
	overflow: hidden;
	border: 1px solid $color-header-line;
	border-radius: $radius;

	&__option {
		min-height: $control-height-switch;
		padding: 0 9px;
		border: 0;
		background: transparent;
		color: $color-header-muted;
		font-size: $font-size-tiny;
		font-weight: 500;

		& + & {
			border-left: 1px solid $color-header-line;
		}

		&.is-active {
			background: $color-surface;
			color: $color-dark;
		}
	}
}
</style>
