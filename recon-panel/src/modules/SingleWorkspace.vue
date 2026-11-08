<script setup>
import { computed } from 'vue'
import IconAi from '@/components/IconAi.vue'
import SearchInput from '@/components/SearchInput.vue'
import SingleAsk from './SingleAsk.vue'
import SingleInvoices from './SingleInvoices.vue'
import { useDealStore } from '@/stores/deal'

// Second card of the deal screen: two tabs and what is under them.
// The invoice search sits in the tab row, on the right, and only on the "Invoices" tab.
const store = useDealStore()

// With no contract on the deal there is nothing to ask, so that tab is not offered.
const canAsk = computed(() => store.deal?.contract === 'read')

const tabs = computed(() =>
	canAsk.value
		? [
				{ id: 'invoices', label: 'Invoices', ai: false },
				{ id: 'reactiveAI', label: 'Ask the contract', ai: true },
			]
		: [{ id: 'invoices', label: 'Invoices', ai: false }],
)

// A tab left over from another deal must not survive into one without a contract.
const activeTab = computed(() => (canAsk.value ? store.tab : 'invoices'))
</script>

<template>
	<section class="single-workspace card">
		<div class="single-workspace__bar">
			<div class="single-workspace__tabs" role="tablist">
				<button
					v-for="item in tabs"
					:key="item.id"
					type="button"
					role="tab"
					class="single-workspace__tab"
					:class="{ 'is-active': activeTab === item.id }"
					:aria-selected="activeTab === item.id"
					@click="store.tab = item.id"
				>
					<IconAi v-if="item.ai" :size="16" />
					<span>{{ item.label }}</span>
				</button>
			</div>

			<SearchInput
				v-if="activeTab === 'invoices'"
				class="single-workspace__search"
				label="Search invoices"
				:model-value="store.search"
				@update:model-value="store.setSearch"
			/>
		</div>

		<SingleInvoices v-if="activeTab === 'invoices'" />
		<SingleAsk v-else />
	</section>
</template>

<style scoped lang="scss">
.single-workspace {
	&__bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 0 20px;
		border-bottom: 1px solid $color-border;
	}

	&__tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
	}

	// The chosen tab is bolder and has a dark line under it.
	&__tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 48px;
		padding: 0;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: $color-text-muted;

		&.is-active {
			border-bottom-color: $color-dark;
			color: $color-text;
			font-weight: 600;
		}
	}

	&__search {
		margin: 10px 0;
	}
}
</style>
