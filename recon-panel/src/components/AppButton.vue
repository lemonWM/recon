<script setup>
// Plain dark button for actions that are not AI features.
defineProps({
	disabled: { type: Boolean, default: false },
})
</script>

<template>
	<button type="button" class="app-button" :disabled="disabled">
		<slot />
	</button>
</template>

<style scoped lang="scss">
.app-button {
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

	&:disabled {
		border-color: $color-disabled;
		background: $color-disabled;
		cursor: not-allowed;
	}
}
</style>
