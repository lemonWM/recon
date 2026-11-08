<script setup>
// Coloured pill with a status name. Colours come from $status-colors in _variables.scss.
defineProps({
	// ready | scanning | compliant | mismatch | nobasis | nocontract | unreadable
	status: { type: String, required: true },
	label: { type: String, required: true },
})
</script>

<template>
	<span class="status-tag" :class="`status-tag--${status}`">{{ label }}</span>
</template>

<style scoped lang="scss">
@use 'sass:map';

.status-tag {
	display: inline-block;
	padding: 2px 10px;
	border: 1px solid transparent;
	border-radius: $radius-pill;
	font-size: $font-size-small;
	font-weight: 500;
	white-space: nowrap;

	// One modifier class per status, generated from the map.
	@each $name, $colors in $status-colors {
		&--#{$name} {
			background: map.get($colors, bg);
			color: map.get($colors, fg);
			border-color: map.get($colors, border);
		}
	}
}
</style>
