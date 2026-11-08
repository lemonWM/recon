<script setup>
import { computed } from 'vue'
import AiButton from '@/components/AiButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import StatTile from '@/components/StatTile.vue'
import StatusTag from '@/components/StatusTag.vue'
import SyncStatus from '@/components/SyncStatus.vue'
import { useDealStore } from '@/stores/deal'
import { useDealsStore } from '@/stores/deals'
import { useScanStore } from '@/stores/scan'
import { formatMoney, formatOf, scanLabel } from '@/utils/format'

// First card of the deal screen: name, status, link to the CRM, scan button and numbers.
// When the contract is missing or unreadable it explains what to do instead.
const store = useDealStore()
const deals = useDealsStore()
const scan = useScanStore()

const deal = computed(() => store.deal)

// Line under the name: company, contract file and how many clauses were read.
const meta = computed(() => {
	const { company, contract, contractFile, clauses } = deal.value
	if (contract === 'missing') return `${company} · no PDF attached to the deal`
	if (contract === 'unreadable') return `${company} · ${contractFile}`
	return `${company} · ${contractFile} · ${clauses} clauses`
})

// This deal has an invoice in progress.
const busy = computed(() => deal.value.status === 'scanning')

const label = computed(() => (busy.value ? 'Scanning…' : scanLabel(deal.value.invoicesReady)))

// Greyed out when nothing waits here, or when another deal is being scanned.
const disabled = computed(() => !deal.value.invoicesReady || (scan.busy && !busy.value))
</script>

<template>
	<section class="single-summary card">
		<div class="single-summary__top">
			<div class="single-summary__text">
				<div class="single-summary__title">
					<h1>{{ deal.name }}</h1>
					<StatusTag :status="deal.status" :label="deal.statusLabel" />
				</div>
				<div class="single-summary__meta">{{ meta }}</div>
				<div>
					<a class="single-summary__crm" :href="deal.crmUrl" target="_blank" rel="noopener">
						<span>View this deal in CRM</span>
						<AppIcon name="external" />
					</a>
				</div>
			</div>

			<AiButton
				v-if="deal.contract === 'read'"
				class="single-summary__scan"
				:busy="busy"
				:disabled="disabled"
				@click="scan.start(deal.id)"
			>
				{{ label }}
			</AiButton>
		</div>

		<div v-if="deal.contract === 'read'" class="single-summary__stats">
			<StatTile
				label="Invoices scanned"
				:value="formatOf(deal.invoicesScanned, deal.invoicesTotal)"
			/>
			<StatTile label="Mismatches" :value="deal.mismatches" />
			<StatTile
				label="To recover"
				:value="formatMoney(deal.toRecover)"
				:accent="deal.toRecover > 0"
			/>
		</div>

		<div v-else-if="deal.contract === 'missing'" class="single-summary__notice">
			<h2>No contract on this deal yet</h2>
			<p>
				Attach the signed contract to the deal as a PDF. Recon reads it on its own. After
				that its invoices are ready to scan.
			</p>
			<p class="single-summary__hint">One PDF per deal. That file is read as the contract.</p>
			<div class="single-summary__actions">
				<AppButton :disabled="deals.syncing" @click="deals.sync()">
					Look for an attachment now
				</AppButton>
				<SyncStatus
					v-if="deals.syncNote !== 'off'"
					:syncing="deals.syncing"
					:fading="deals.syncNote === 'fading'"
				/>
			</div>
		</div>

		<div v-else class="single-summary__notice">
			<h2>The contract could not be read</h2>
			<p>
				<span class="mono">{{ deal.contractFile }}</span> looks like a scanned image with no
				text in it. Replace it on the deal with a text-based PDF. Recon reads the new file
				on its own.
			</p>
			<p class="single-summary__hint">
				Invoices cannot be scanned until the contract can be read.
			</p>
		</div>
	</section>
</template>

<style scoped lang="scss">
.single-summary {
	display: flex;
	flex-direction: column;
	gap: $gap;
	padding: 20px;

	&__top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	&__text {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	&__title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;

		h1 {
			font-size: 22px;
			font-weight: 600;
			line-height: 1.25;
		}
	}

	&__meta {
		color: $color-text-muted;
	}

	&__crm {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
	}

	&__scan {
		min-width: 140px;
	}

	&__stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
		gap: $gap-small;
	}

	&__notice {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 560px;
		padding: 12px 0;

		h2 {
			font-size: $font-size-heading;
			font-weight: 600;
		}
	}

	&__hint {
		color: $color-text-muted;
		font-size: $font-size-small;
	}

	&__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
	}
}
</style>
