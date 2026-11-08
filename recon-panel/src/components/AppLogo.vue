<script setup>
// Recon logo. The artwork lives in assets, this component puts it on the page
// inline so the centre star can be animated with CSS.
import logo from '@/assets/logo.svg?raw'

defineProps({
	size: { type: Number, default: 30 },
})
</script>

<template>
	<!-- eslint-disable-next-line vue/no-v-html -->
	<span class="app-logo" :style="{ width: size + 'px', height: size + 'px' }" v-html="logo" />
</template>

<style scoped lang="scss">
.app-logo {
	display: inline-flex;
	flex: none;
	color: $color-dark;

	:deep(svg) {
		width: 100%;
		height: 100%;
	}

	// The star turns around its vertical axis, like a coin.
	:deep(.logo-star) {
		fill: $color-accent;
		transform-box: fill-box;
		transform-origin: center;
		animation: rc-flip 2.8s infinite;
	}
}
</style>
