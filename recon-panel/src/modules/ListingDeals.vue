<script setup>
import { RouterLink } from 'vue-router'
import SearchInput from '@/components/SearchInput.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useDealsStore } from '@/stores/deals'
import { formatMoney, formatOf } from '@/utils/format'

// "Deals list" card: search box and the table. A click on a row opens the deal.
const deals = useDealsStore()

const dash = '—'
</script>

<template>
	<section class="listing-deals">
		<header class="listing-deals__head">
			<h2 class="listing-deals__title">Deals list</h2>
			<SearchInput v-model="deals.search" label="Search deals" />
		</header>

		<div class="listing-deals__scroll">
			<div class="listing-deals__table">
				<div class="listing-deals__row listing-deals__row--head">
					<div>Deal</div>
					<div>Company</div>
					<div class="is-right">Invoices scanned</div>
					<div class="is-right is-spaced">To recover</div>
					<div>Contract</div>
					<div class="is-right">Status</div>
				</div>

				<RouterLink
					v-for="deal in deals.filtered"
					:key="deal.id"
					class="listing-deals__row listing-deals__row--deal"
					:to="{ name: 'deal', params: { id: deal.id } }"
				>
					<span class="is-name is-cut">{{ deal.name }}</span>
					<span class="is-cut">{{ deal.company }}</span>
					<span class="is-right mono">
						{{
							deal.invoicesTotal === null
								? dash
								: formatOf(deal.invoicesScanned, deal.invoicesTotal)
						}}
					</span>
					<span class="is-right is-spaced mono" :class="{ 'is-strong': deal.toRecover > 0 }">
						{{ deal.toRecover === null ? dash : formatMoney(deal.toRecover) }}
					</span>
					<span class="is-file is-cut mono">{{ deal.contractFile ?? dash }}</span>
					<span class="is-right">
						<StatusTag :status="deal.status" :label="deal.statusLabel" />
					</span>
				</RouterLink>

				<div v-if="deals.filtered.length === 0" class="listing-deals__empty">
					No deals match your search.
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped lang="scss">
// Column widths shared by the header row and the deal rows.
$columns: minmax(250px, 2.2fr) minmax(160px, 1.3fr) minmax(120px, 0.9fr) minmax(140px, 1fr)
	minmax(190px, 1.4fr) minmax(150px, 1.1fr);

.listing-deals {
	overflow: hidden;
	background: $color-surface;
	border: 1px solid $color-border;
	border-radius: $radius-card;

	&__head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 20px;
	}

	&__title {
		font-size: $font-size-base;
		font-weight: 600;
	}

	// The table scrolls sideways on narrow screens, without a visible scrollbar.
	&__scroll {
		overflow-x: auto;
		scrollbar-width: none;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	&__table {
		min-width: 1100px;
	}

	&__row {
		display: grid;
		grid-template-columns: $columns;
		column-gap: 12px;
		align-items: center;
		padding: 0 20px;

		&--head {
			padding-top: 10px;
			padding-bottom: 10px;
			border-top: 1px solid $color-border;
			background: $color-page;
			color: $color-text-soft;
			font-size: $font-size-small;
			font-weight: 600;
			white-space: nowrap;
		}

		// The whole row is one link: hover highlights it, click opens the deal.
		&--deal {
			min-height: 46px;
			border-top: 1px solid $color-border-soft;
			background: $color-surface;
			color: $color-text;
			font-size: $font-size-table;

			&:hover {
				background: $color-row-hover;
				color: $color-text;
			}
		}
	}

	&__empty {
		padding: 16px 20px;
		border-top: 1px solid $color-border-soft;
		color: $color-text-muted;
		font-size: $font-size-table;
	}
}

.is-right {
	text-align: right;
}

// Extra room between the amount and the status column.
.is-spaced {
	padding-right: 32px;
}

// Long text is cut with an ellipsis, on one line.
.is-cut {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.is-name {
	color: $color-link;
	font-weight: 500;
}

.is-file {
	color: $color-text-soft;
}

.is-strong {
	font-weight: 600;
}
</style>
