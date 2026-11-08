<script setup>
import AppPagination from '@/components/AppPagination.vue'
import InvoiceDetail from '@/components/InvoiceDetail.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useDealStore } from '@/stores/deal'
import { formatDifference, formatMoney } from '@/utils/format'
import { invoiceStatusLabel } from '@/utils/status'

// "Invoices" tab: status filters, the invoice table, pagination and the details box.
const store = useDealStore()

const dash = '—'
</script>

<template>
	<section class="single-invoices" aria-label="Invoices">
		<div class="single-invoices__filters">
			<button
				v-for="item in store.filters"
				:key="item.id"
				type="button"
				class="single-invoices__filter"
				:class="{ 'is-active': store.filter === item.id }"
				:aria-pressed="store.filter === item.id"
				@click="store.setFilter(item.id)"
			>
				<span>{{ item.label }}</span>
				<span class="single-invoices__count mono">{{ item.count }}</span>
			</button>
		</div>

		<div class="single-invoices__scroll">
			<div class="single-invoices__table">
				<div class="single-invoices__row single-invoices__row--head">
					<div>Invoice</div>
					<div>Period</div>
					<div class="is-right">Invoiced</div>
					<div class="is-right">Expected</div>
					<div class="is-right">Difference</div>
					<div class="is-right">Status</div>
				</div>

				<button
					v-for="invoice in store.rows"
					:key="invoice.number"
					type="button"
					class="single-invoices__row single-invoices__row--invoice"
					:class="{ 'is-active': store.selected === invoice.number }"
					:aria-expanded="store.selected === invoice.number"
					@click="store.toggleInvoice(invoice.number)"
				>
					<span class="is-number mono">{{ invoice.number }}</span>
					<span>{{ invoice.period }}</span>
					<span class="is-right mono">{{ formatMoney(invoice.invoiced) }}</span>
					<span class="is-right is-soft mono">
						{{ invoice.expected === null ? dash : formatMoney(invoice.expected) }}
					</span>
					<span
						class="is-right mono"
						:class="{ 'is-difference': invoice.status === 'mismatch' }"
					>
						{{
							invoice.difference === null ? dash : formatDifference(invoice.difference)
						}}
					</span>
					<span class="is-right">
						<StatusTag
							:status="invoice.status"
							:label="invoiceStatusLabel(invoice.status)"
						/>
					</span>
				</button>

				<div v-if="store.rows.length === 0" class="single-invoices__empty">
					{{
						store.search.trim()
							? 'No invoices match your search.'
							: 'No invoices with this status.'
					}}
				</div>
			</div>
		</div>

		<AppPagination
			v-if="store.hasPages"
			class="single-invoices__pagination"
			:page="store.currentPage"
			:page-count="store.pageCount"
			:info="store.pageInfo"
			@change="store.setPage"
		/>

		<InvoiceDetail v-if="store.selectedInvoice" :invoice="store.selectedInvoice" />
	</section>
</template>

<style scoped lang="scss">
// Column widths shared by the header row and the invoice rows.
$columns: minmax(130px, 1.3fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)
	minmax(130px, 1.2fr) minmax(150px, 1.3fr);

.single-invoices {
	&__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 16px 20px;
	}

	&__filter {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: $control-height-small;
		padding: 0 10px;
		border: 1px solid $color-border-strong;
		border-radius: $radius-pill;
		background: $color-surface;
		color: $color-text;
		font-size: $font-size-small;
		font-weight: 500;

		&.is-active {
			border-color: $color-dark;
			background: $color-dark;
			color: $color-surface;
		}
	}

	&__count {
		font-size: $font-size-tiny;
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
		min-width: 720px;
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
		}

		// The whole row is a button: hover highlights it, a click opens its details
		// and the open row stays highlighted.
		&--invoice {
			width: 100%;
			min-height: 44px;
			border: 0;
			border-top: 1px solid $color-border-soft;
			background: $color-surface;
			color: $color-text;
			font-size: $font-size-table;
			text-align: left;

			&:hover {
				background: $color-row-hover;
			}

			&.is-active,
			&.is-active:hover {
				background: $color-row-active;
			}
		}
	}

	&__empty {
		padding: 20px;
		border-top: 1px solid $color-border-soft;
		color: $color-text-muted;
	}

	&__pagination {
		padding: 20px 20px 10px;
		border-top: 1px solid $color-border-soft;
	}
}

.is-right {
	text-align: right;
}

// The invoice number is plain text in the link colour, not a link:
// there is no document behind it.
.is-number {
	color: $color-link;
	font-weight: 500;
}

.is-soft {
	color: $color-text-soft;
}

.is-difference {
	color: $color-accent;
	font-weight: 600;
}
</style>
