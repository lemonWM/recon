<script setup>
import { onBeforeUnmount, ref } from 'vue'
import AiButton from '@/components/AiButton.vue'
import ClauseQuote from '@/components/ClauseQuote.vue'
import IconAi from '@/components/IconAi.vue'
import { SAMPLE_QUESTIONS, mockAnswer } from '@/mocks/answers'
import { useDealStore } from '@/stores/deal'

// "Ask the contract" tab: a question about this one contract, answered with the clause.
// The state stays in this component, because nothing else on the page needs it.
const store = useDealStore()

const ANSWER_MS = 10000 // simulated waiting time

const question = ref('')
const asked = ref('') // the question the answer card belongs to
const asking = ref(false)
const answer = ref(null)

let timer = null

function ask(text = question.value) {
	const clean = text.trim()
	if (!clean || asking.value) return

	question.value = clean
	asked.value = clean
	answer.value = null
	asking.value = true

	timer = setTimeout(() => {
		answer.value = mockAnswer(clean, store.deal.contractFile)
		asking.value = false
	}, ANSWER_MS)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
	<section class="single-ask" aria-label="Ask the contract">
		<form class="single-ask__form" @submit.prevent="ask()">
			<label class="single-ask__label" for="recon-question">Ask AI about this contract</label>
			<div class="single-ask__row">
				<input
					id="recon-question"
					v-model="question"
					class="single-ask__input"
					type="text"
					placeholder="What is the notice period?"
				/>
				<AiButton class="single-ask__button" :busy="asking" @click="ask()">
					{{ asking ? 'Thinking' : 'Ask AI' }}
				</AiButton>
			</div>
			<p class="single-ask__hint">
				AI answers come only from this contract and always cite the clause. Recon changes
				nothing in the CRM.
			</p>
		</form>

		<div class="single-ask__samples">
			<button
				v-for="sample in SAMPLE_QUESTIONS"
				:key="sample.key"
				type="button"
				class="single-ask__sample"
				@click="ask(sample.text)"
			>
				{{ sample.text }}
			</button>
		</div>

		<div v-if="asked" class="single-ask__answer">
			<div class="single-ask__answer-head">
				<span class="single-ask__tag">
					<IconAi :size="11" :busy="asking" />
					<span>{{ asking ? 'AI is thinking' : 'AI answer' }}</span>
				</span>
				<div class="single-ask__asked">{{ asked }}</div>
			</div>

			<p v-if="asking" class="single-ask__thinking">
				Reading the contract and writing an answer.
			</p>

			<template v-else-if="answer">
				<p class="single-ask__summary">{{ answer.summary }}</p>
				<p v-if="answer.body" class="single-ask__body">{{ answer.body }}</p>
				<ClauseQuote
					v-for="clause in answer.clauses ?? []"
					:key="clause.ref"
					:reference="clause.ref"
					:text="clause.text"
				/>
				<div v-if="answer.source" class="single-ask__source">{{ answer.source }}</div>
			</template>
		</div>
	</section>
</template>

<style scoped lang="scss">
.single-ask {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;

	&__form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	&__label {
		font-weight: 600;
	}

	&__row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	&__input {
		flex: 1 1 280px;
		min-width: 0;
		min-height: $control-height;
		padding: 0 10px;
		border: 1px solid $color-border-input;
		border-radius: $radius;
		background: $color-surface;
		color: $color-text;
		font-size: $font-size-button;
	}

	&__button {
		min-width: 96px;
	}

	&__hint {
		color: $color-text-muted;
		font-size: $font-size-small;
	}

	&__samples {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	&__sample {
		min-height: $control-height-small;
		padding: 0 10px;
		border: 1px solid $color-border-strong;
		border-radius: $radius-pill;
		background: $color-surface;
		color: $color-text;
		font-size: $font-size-small;
	}

	&__answer {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border: 1px solid $color-border;
		border-radius: $radius;
		background: $color-surface-alt;
	}

	&__answer-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	// Small dark pill that marks the answer as written by AI.
	&__tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: $radius-pill;
		background: $color-dark;
		color: $color-surface;
		font-size: $font-size-tiny;
		font-weight: 600;
	}

	&__asked {
		color: $color-text-muted;
	}

	&__thinking {
		color: $color-text-soft;
		font-size: 15px;
	}

	&__summary {
		font-size: 15px;
	}

	&__body {
		color: $color-text-soft;
	}

	&__source {
		color: $color-text-muted;
		font-size: $font-size-small;
	}
}
</style>
