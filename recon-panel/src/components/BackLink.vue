<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'

// Light, small link back to another screen, with a chevron in front.
defineProps({
	to: { type: [String, Object], required: true },
})
</script>

<template>
	<RouterLink class="back-link" :to="to">
		<AppIcon name="chevron-left" :size="12" />
		<span><slot /></span>
	</RouterLink>
</template>

<style scoped lang="scss">
.back-link {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	min-height: 24px;
	padding-right: 6px;
	color: $color-text-muted;
	font-size: $font-size-small;
	font-weight: 500;

	&:hover {
		color: $color-text;
	}
}
</style>
