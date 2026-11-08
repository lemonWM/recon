// Splits a contract PDF into clause-level chunks with metadata.
// Variant A: every chunk gets only valid_from (no valid_to).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const FOOTER_MAX_Y = 60;

// Generator disclaimer under the title: noise for retrieval, not contract content
const NOISE_RE = [/^Synthetic demo document\./, /^any resemblance to actual companies/];

const SECTION_RE = /^(\d+)\.\s+([A-Z][A-Z &]+)$/; // "4. FEES"
const AMENDMENT_RE = /^AMENDMENT No\.\s*(\d+)$/i; // "AMENDMENT No. 1"
const CLAUSE_RE = /^((?:\d+|[A-Z])\.\d+)\s+(.*)$/; // "4.1 ..." or "A.1 ..."
const EFFECTIVE_RE = /effective from (\d{1,2}) ([A-Za-z]+) (\d{4})/i;

const MONTHS = {
	january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
	july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// "1 July 2025" -> "2025-07-01", without time zones
function toIsoDate(day, monthName, year) {
	const month = MONTHS[monthName.toLowerCase()];
	if (!month) return null;
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Takes raw PDF bytes, returns text rows top to bottom, footers and noise removed
async function readLines(data) {
	const pdf = await getDocument({ data, verbosity: 0 }).promise;
	const lines = [];

	for (let p = 1; p <= pdf.numPages; p++) {
		const page = await pdf.getPage(p);
		const content = await page.getTextContent();
		const rows = new Map();

		for (const item of content.items) {
			if (!item.str.trim()) continue;
			const y = Math.round(item.transform[5]);
			if (y < FOOTER_MAX_Y) continue;
			if (!rows.has(y)) rows.set(y, []);
			rows.get(y).push({ x: item.transform[4], str: item.str });
		}

		const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
		for (const [, pieces] of sorted) {
			const text = pieces
				.sort((a, b) => a.x - b.x)
				.map((piece) => piece.str)
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();
			if (NOISE_RE.some((re) => re.test(text))) continue;
			lines.push({ page: p, text });
		}
	}

	return lines;
}

function chunkLines(lines) {
	const chunks = [];
	let part = 'base';
	let validFrom = null;
	let section = { no: null, title: 'PREAMBLE' };
	let current = null;

	const startChunk = (clauseNo, text, page) => {
		current = {
			part,
			section_no: section.no,
			section_title: section.title,
			clause_no: clauseNo,
			valid_from: validFrom,
			page_start: page,
			page_end: page,
			text,
		};
		chunks.push(current);
	};

	for (const { page, text } of lines) {
		// Effective date of the agreement or of an amendment
		const eff = text.match(EFFECTIVE_RE);
		if (eff) validFrom = toIsoDate(eff[1], eff[2], eff[3]);

		const amendment = text.match(AMENDMENT_RE);
		if (amendment) {
			part = `amendment-${amendment[1]}`;
			section = { no: null, title: text };
			current = null;
			continue;
		}

		const sec = text.match(SECTION_RE);
		if (sec) {
			section = { no: sec[1], title: sec[2] };
			current = null;
			continue;
		}

		const clause = text.match(CLAUSE_RE);
		if (clause) {
			startChunk(clause[1], clause[2], page);
			continue;
		}

		// Line without a number: continuation of the current chunk,
		// or a free-standing paragraph (preamble, amendment intro)
		if (current) {
			current.text += ' ' + text;
			current.page_end = page;
		} else {
			startChunk(part === 'base' ? 'PREAMBLE' : 'INTRO', text, page);
		}
	}

	// Chunks created before the effective date line was seen get it now
	for (const chunk of chunks) {
		if (!chunk.valid_from) chunk.valid_from = validFromOf(chunks, chunk.part);
	}

	return chunks.map((chunk, i) => ({ chunk_index: i, ...chunk }));
}

// First known valid_from within the same part of the document
function validFromOf(chunks, part) {
	return chunks.find((c) => c.part === part && c.valid_from)?.valid_from ?? null;
}

export { readLines, chunkLines };