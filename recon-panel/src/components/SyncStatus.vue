<script setup>
import AppIcon from './AppIcon.vue'

// Small note next to the scan button: "Syncing data…" while the panel refreshes
// the deal list, then "Up to date" for a moment.
defineProps({
	syncing: { type: Boolean, default: false },
	// The parent sets this just before it removes the note, so it can fade out.
	fading: { type: Boolean, default: false },
})
</script>

<template>
	<div
		class="sync-status"
		:class="{ 'is-syncing': syncing, 'is-fading': fading }"
		role="status"
		aria-live="polite"
	>
		<AppIcon class="sync-status__icon" :name="syncing ? 'sync' : 'check'" />
		<span>{{ syncing ? 'Syncing data…' : 'Up to date' }}</span>
	</div>
</template>

<style scoped lang="scss">
.sync-status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: $control-height;
	color: $color-text-subtle;
	font-size: $font-size-small;
	transition: opacity 0.3s ease;

	&.is-syncing {
		color: $color-text;
	}

	&.is-syncing &__icon {
		color: $color-accent;
		animation: rc-sync 1.4s ease-in-out infinite;
	}

	&.is-fading {
		opacity: 0;
	}
}
</style>
