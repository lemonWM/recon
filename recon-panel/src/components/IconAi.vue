<script setup>
// "Magic" sparkles that mark every AI feature.
// With busy = true the sparkles fill in and pulse in turns.
import icon from '@/assets/icons/ai.svg?raw'

defineProps({
	size: { type: Number, default: 14 },
	busy: { type: Boolean, default: false },
})
</script>

<template>
	<!-- eslint-disable-next-line vue/no-v-html -->
	<span
		class="icon-ai"
		:class="{ 'is-busy': busy }"
		:style="{ width: size + 'px', height: size + 'px' }"
		v-html="icon"
	/>
</template>

<style scoped lang="scss">
.icon-ai {
	display: inline-flex;
	flex: none;

	:deep(svg) {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	:deep(.spark) {
		transform-box: fill-box;
		transform-origin: center;
	}

	&.is-busy {
		:deep(.spark) {
			fill: currentColor;
		}

		:deep(.spark--a) {
			animation: rc-pulse 1.2s ease-in-out infinite;
		}

		:deep(.spark--b) {
			animation: rc-pulse 1.2s ease-in-out 0.45s infinite;
		}
	}
}
</style>
