<script setup>
import ClauseQuote from './ClauseQuote.vue'
import StatusTag from './StatusTag.vue'
import { formatDifference, formatMoney } from '@/utils/format'
import { invoiceStatusLabel } from '@/utils/status'

// Details of one invoice, shown under the table after a click on its row.
// What appears depends on the status and on what the scan wrote into `detail`.
defineProps({
	invoice: { type: Object, required: true },
})
</script>

<template>
	<div class="invoice-detail" :data-id-inv="invoice.number">
		<div class="invoice-detail__head">
			<div class="invoice-detail__number mono">{{ invoice.number }}</div>
			<div class="invoice-detail__period">{{ invoice.period }}</div>
			<StatusTag :status="invoice.status" :label="invoiceStatusLabel(invoice.status)" />
		</div>

		<p v-if="invoice.status === 'ready'" class="invoice-detail__summary">
			Not scanned yet. Use the Scan button to scan it against the contract.
		</p>

		<p v-else-if="invoice.status === 'scanning'" class="invoice-detail__summary">
			Scanning this invoice against the contract now.
		</p>

		<template v-else-if="invoice.detail">
			<p class="invoice-detail__summary">{{ invoice.detail.summary }}</p>

			<div v-if="invoice.status === 'mismatch'" class="invoice-detail__amounts">
				<div class="invoice-detail__amount">
					<div class="invoice-detail__label">Invoiced</div>
					<div class="mono">{{ formatMoney(invoice.invoiced) }}</div>
				</div>
				<div class="invoice-detail__amount">
					<div class="invoice-detail__label">Expected under the contract</div>
					<div class="mono">{{ formatMoney(invoice.expected) }}</div>
				</div>
				<div class="invoice-detail__amount invoice-detail__amount--accent">
					<div class="invoice-detail__label">Difference</div>
					<div class="mono">{{ formatDifference(invoice.difference) }}</div>
				</div>
			</div>

			<p v-if="invoice.detail.body">{{ invoice.detail.body }}</p>

			<div v-if="invoice.detail.clauses" class="invoice-detail__basis">
				<div class="invoice-detail__basis-title">Contract basis</div>
				<ClauseQuote
					v-for="clause in invoice.detail.clauses"
					:key="clause.ref"
					:reference="clause.ref"
					:text="clause.text"
				/>
				<div v-if="invoice.detail.source" class="invoice-detail__source">
					{{ invoice.detail.source }}
				</div>
			</div>

			<div v-else-if="invoice.detail.source" class="invoice-detail__source">
				{{ invoice.detail.source }}
			</div>

			<div v-if="invoice.ticket" class="invoice-detail__footer">
				<div>
					Ticket <span class="mono">{{ invoice.ticket.number }}</span> ·
					{{ invoice.ticket.status }}
				</div>
				<a class="invoice-detail__link" :href="invoice.ticket.url">Open ticket</a>
			</div>

			<div
				v-if="invoice.detail.note"
				class="invoice-detail__footer invoice-detail__footer--note"
			>
				{{ invoice.detail.note }}
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.invoice-detail {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;
	border-top: 1px solid $color-border;
	background: $color-surface-alt;

	&__head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}

	&__number {
		font-size: 16px;
		font-weight: 600;
	}

	&__period {
		color: $color-text-muted;
	}

	&__summary {
		font-size: 15px;
	}

	&__amounts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
		gap: $gap-small;
	}

	&__amount {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 16px;

		&--accent .mono {
			color: $color-accent;
			font-weight: 600;
		}
	}

	&__label {
		color: $color-text-muted;
		font-size: $font-size-small;
	}

	&__basis {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	&__basis-title {
		color: $color-text-soft;
		font-size: $font-size-small;
		font-weight: 600;
	}

	&__source {
		color: $color-text-muted;
		font-size: $font-size-small;
	}

	&__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding-top: 14px;
		border-top: 1px solid $color-border;

		&--note {
			color: $color-text-soft;
		}
	}

	&__link {
		font-weight: 500;
	}
}
</style>
