<script setup>
import { computed } from 'vue'
import AiButton from '@/components/AiButton.vue'
import AppLogo from '@/components/AppLogo.vue'
import SyncStatus from '@/components/SyncStatus.vue'
import { useDealsStore } from '@/stores/deals'
import { useScanStore } from '@/stores/scan'
import { scanLabel } from '@/utils/format'

// Top of the list screen: logo and title on the left, sync note and scan button on the right.
const deals = useDealsStore()
const scan = useScanStore()

const label = computed(() => (scan.busy ? 'Scanning…' : scanLabel(deals.stats.invoicesReady)))

// No scanning while the list is still syncing or when nothing is waiting.
const disabled = computed(() => deals.syncing || !deals.stats.invoicesReady)
</script>

<template>
	<section class="listing-intro">
		<div class="listing-intro__text">
			<div class="listing-intro__title">
				<AppLogo />
				<h1>Recon</h1>
			</div>
			<p class="listing-intro__lead">
				Scans the invoices you issue against the contract on each won deal.
			</p>
		</div>

		<div class="listing-intro__actions">
			<SyncStatus
				v-if="deals.syncNote !== 'off'"
				:syncing="deals.syncing"
				:fading="deals.syncNote === 'fading'"
			/>
			<AiButton
				class="listing-intro__scan"
				:busy="scan.busy"
				:disabled="disabled"
				@click="scan.start()"
			>
				{{ label }}
			</AiButton>
		</div>
	</section>
</template>

<style scoped lang="scss">
.listing-intro {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;

	&__text {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	&__title {
		display: flex;
		align-items: center;
		gap: 2px;

		h1 {
			font-size: $font-size-title;
			font-weight: 600;
			line-height: 1.25;
		}
	}

	&__lead {
		padding-bottom: 20px;
		color: $color-text-muted;
	}

	&__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 14px;
	}

	&__scan {
		min-width: 140px;
	}
}
</style>
