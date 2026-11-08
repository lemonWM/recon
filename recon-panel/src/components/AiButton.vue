<script setup>
import IconAi from './IconAi.vue'

// The one dark AI button, shared by "Scan" and "Ask AI".
// busy = work in progress: the sparkles pulse and the button cannot be clicked.
defineProps({
	busy: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
})
</script>

<template>
	<button
		type="button"
		class="ai-button"
		:class="{ 'is-busy': busy }"
		:disabled="disabled || busy"
	>
		<IconAi :busy="busy" />
		<span><slot /></span>
	</button>
</template>

<style scoped lang="scss">
.ai-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-height: $control-height;
	padding: 0 14px;
	border: 1px solid $color-dark;
	border-radius: $radius;
	background: $color-dark;
	color: $color-surface;
	font-size: $font-size-button;
	font-weight: 500;

	// Nothing to do: greyed out.
	&:disabled {
		border-color: $color-disabled;
		background: $color-disabled;
		cursor: not-allowed;
	}

	// Working: looks the same as the idle button, cursor included.
	&.is-busy {
		border-color: $color-dark;
		background: $color-dark;
		cursor: pointer;
	}
}
</style>
