<script setup>
// One box with a label and a number, used in the summary rows.
defineProps({
	label: { type: String, required: true },
	value: { type: [String, Number], required: true },
	// Accent = the main blue and a bolder number, for "To recover".
	accent: { type: Boolean, default: false },
})
</script>

<template>
	<div class="stat-tile" :class="{ 'stat-tile--accent': accent }">
		<div class="stat-tile__label">{{ label }}</div>
		<div class="stat-tile__value">{{ value }}</div>
	</div>
</template>

<style scoped lang="scss">
.stat-tile {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 12px;
	background: $color-surface;
	border: 1px solid $color-border;
	border-radius: $radius;

	&__label {
		color: $color-text-muted;
		font-size: $font-size-tiny;
	}

	&__value {
		font-family: $font-mono;
		font-size: $font-size-number;
		font-weight: 500;
	}

	&--accent &__value {
		color: $color-accent;
		font-weight: 600;
	}
}
</style>
