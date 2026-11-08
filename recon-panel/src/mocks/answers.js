// Sample questions and answers for the "Ask the contract" tab.
// Later the answer comes from n8n: Claude reads the matching clauses and replies.

export const SAMPLE_QUESTIONS = [
	{ key: 'index', text: 'When can we raise the price?' },
	{ key: 'notice', text: 'What is the notice period?' },
	{ key: 'unknown', text: 'Is there a volume discount?' },
]

const ANSWERS = {
	index: (file) => ({
		summary:
			'Every 1 January. The Monthly Fee goes up by 4% over the fee that applied in the previous calendar year.',
		clauses: [
			{
				ref: '§4.2',
				text: 'With effect from 1 January of each calendar year, the Monthly Fee shall be increased by four percent (4%) over the Monthly Fee applicable in the preceding calendar year.',
			},
		],
		source: `${file} · page 3`,
	}),
	notice: (file) => ({
		summary:
			'Ninety days, in writing. The notice has to run out at the end of a calendar month.',
		clauses: [
			{
				ref: '§9.1',
				text: "Either party may terminate this Agreement by giving the other party not less than ninety (90) days' written notice, such notice to expire at the end of a calendar month.",
			},
		],
		source: `${file} · page 6`,
	}),
	unknown: (file) => ({
		summary: 'I could not find a clause in this contract that answers this.',
		body: `Recon answers only from the contract text, and nothing in ${file} covers this question.`,
	}),
}

// Any question that is not one of the samples gets the honest "not found" answer.
export function mockAnswer(question, file) {
	const text = question.trim().toLowerCase()
	const sample = SAMPLE_QUESTIONS.find((item) => item.text.toLowerCase() === text)
	return ANSWERS[sample?.key ?? 'unknown'](file)
}
