<script setup>
	import SourceSwitch from './SourceSwitch.vue'
</script>

<template>
	<header class="app-header">
		<div class="container app-header__inner">
			<div class="app-header__brand">Recon</div>
			<div class="app-header__tagline">Bill what you signed.</div>
			<SourceSwitch class="app-header__switch" />
		</div>
	</header>
</template>

<style scoped lang="scss">
// Dark bar that stays at the top while the page scrolls.
.app-header {
	position: sticky;
	top: 0;
	z-index: 10;
	background: $color-dark;
	color: $color-surface;

	&__inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding-top: 12px;
		padding-bottom: 12px;
	}

	&__brand {
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	&__tagline {
		color: $color-header-muted;
		font-size: $font-size-small;
	}

	&__switch {
		margin-left: auto;
	}
}
</style>