<script setup>
import { computed } from 'vue'

// Plain icons from src/assets/icons, shown inline so they take the text colour.
// Usage: <AppIcon name="search" :size="12" />
// A new icon needs only a new .svg file in that folder.
const files = import.meta.glob('@/assets/icons/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true,
})

const icons = {}
for (const path in files) {
	const name = path.split('/').pop().replace('.svg', '')
	icons[name] = files[path]
}

const props = defineProps({
	name: { type: String, required: true },
	size: { type: Number, default: 14 },
})

const svg = computed(() => icons[props.name] ?? '')
</script>

<template>
	<!-- eslint-disable-next-line vue/no-v-html -->
	<span class="app-icon" :style="{ width: size + 'px', height: size + 'px' }" v-html="svg" />
</template>

<style scoped lang="scss">
.app-icon {
	display: inline-flex;
	flex: none;

	:deep(svg) {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
}
</style>
