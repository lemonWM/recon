<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import { useDealsStore } from './stores/deals'

// The deal list is synced once, when the panel opens, whichever screen comes first.
const deals = useDealsStore()
onMounted(() => deals.ensureSynced())
</script>

<template>
	<div class="app">
		
		<AppHeader />

		<main class="container app__main">
			<RouterView />
		</main>

		<AppFooter />

	</div>
</template>

<style scoped lang="scss">
	// Page frame: header on top, footer pushed to the bottom, content in between.
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;

		&__main {
			flex: 1 0 auto;
			padding-top: 24px;
			padding-bottom: 24px;
		}
	}
</style>
