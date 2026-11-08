<script setup>
import AppIcon from './AppIcon.vue'

// Page buttons under a table: previous, page numbers, next.
defineProps({
	page: { type: Number, required: true },
	pageCount: { type: Number, required: true },
	info: { type: String, default: '' }, // e.g. "Showing 1–10 of 22"
})

defineEmits(['change'])
</script>

<template>
	<div class="app-pagination">
		<div>{{ info }}</div>
		<div class="app-pagination__buttons">
			<button
				type="button"
				class="app-pagination__button"
				aria-label="Previous page"
				:disabled="page <= 1"
				@click="$emit('change', page - 1)"
			>
				<AppIcon name="chevron-left" :size="12" />
			</button>
			<button
				v-for="n in pageCount"
				:key="n"
				type="button"
				class="app-pagination__button"
				:class="{ 'is-active': n === page }"
				:aria-label="`Page ${n}`"
				:aria-current="n === page ? 'page' : undefined"
				@click="$emit('change', n)"
			>
				{{ n }}
			</button>
			<button
				type="button"
				class="app-pagination__button"
				aria-label="Next page"
				:disabled="page >= pageCount"
				@click="$emit('change', page + 1)"
			>
				<AppIcon name="chevron-right" :size="12" />
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.app-pagination {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	color: $color-text-muted;
	font-size: $font-size-small;

	&__buttons {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	&__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 28px;
		height: 28px;
		padding: 0 6px;
		border: 1px solid $color-border-strong;
		border-radius: $radius;
		background: $color-surface;
		color: $color-text;
		font-size: $font-size-small;
		font-weight: 500;

		&.is-active {
			border-color: $color-dark;
			background: $color-dark;
			color: $color-surface;
		}

		&:disabled {
			color: $color-disabled;
			cursor: not-allowed;
		}
	}
}
</style>
