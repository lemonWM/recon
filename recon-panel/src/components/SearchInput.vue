<script setup>
import AppIcon from './AppIcon.vue'

// Small search field with a magnifier. Works with v-model.
const model = defineModel({ type: String, default: '' })

defineProps({
	// Used as the placeholder and as the name read by screen readers.
	label: { type: String, required: true },
})
</script>

<template>
	<div class="search-input">
		<AppIcon class="search-input__icon" name="search" :size="12" />
		<input
			v-model="model"
			class="search-input__field"
			type="text"
			:aria-label="label"
			:placeholder="label"
		/>
	</div>
</template>

<style scoped lang="scss">
.search-input {
	position: relative;
	flex: 0 0 $search-width;
	width: $search-width;

	&__icon {
		position: absolute;
		top: 8px;
		left: 8px;
		color: $color-text-muted;
		pointer-events: none;
	}

	&__field {
		width: 100%;
		height: $control-height-input;
		padding: 0 8px 0 26px;
		border: 1px solid $color-border-strong;
		border-radius: $radius;
		background: $color-surface;
		color: $color-text;
		font-size: $font-size-small;
	}
}
</style>
