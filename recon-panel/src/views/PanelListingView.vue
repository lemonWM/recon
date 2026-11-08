<script setup>
import ListingDeals from '@/modules/ListingDeals.vue'
import ListingIntro from '@/modules/ListingIntro.vue'
import ListingStats from '@/modules/ListingStats.vue'
</script>

<template>
	<div class="panel-listing__wrapper">
		<ListingIntro />
		<ListingStats />
		<ListingDeals />
	</div>
</template>

<style scoped lang="scss">
// The view only stacks modules and sets the space between them.
.panel-listing__wrapper {
	display: flex;
	flex-direction: column;
	gap: $gap;
}
</style>