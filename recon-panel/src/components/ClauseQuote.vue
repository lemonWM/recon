<script setup>
// A quoted contract clause: paragraph number on the left, its text on the right.
defineProps({
	reference: { type: String, required: true }, // e.g. "§4.2"
	text: { type: String, required: true },
})
</script>

<template>
	<div class="clause-quote">
		<div class="clause-quote__ref mono">{{ reference }}</div>
		<div>{{ text }}</div>
	</div>
</template>

<style scoped lang="scss">
.clause-quote {
	display: grid;
	grid-template-columns: 56px minmax(0, 1fr);
	gap: 12px;
	padding: 12px 14px;
	border-radius: $radius;
	background: $color-quote;

	&__ref {
		font-weight: 600;
	}
}
</style>
