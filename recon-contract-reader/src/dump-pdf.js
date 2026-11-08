// Prints raw text of a PDF page by page, one line per text row,
// with the Y position so we can see headers, footers and page breaks.
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node src/dump-pdf.js <path-to-pdf>');
	process.exit(1);
}

const data = new Uint8Array(await readFile(file));
const pdf = await getDocument({ data }).promise;

for (let p = 1; p <= pdf.numPages; p++) {
	const page = await pdf.getPage(p);
	const { height } = page.getViewport({ scale: 1 });
	const content = await page.getTextContent();

	// Group text pieces into rows by their Y position
	const rows = new Map();
	for (const item of content.items) {
		if (!item.str.trim()) continue;
		const y = Math.round(item.transform[5]);
		if (!rows.has(y)) rows.set(y, []);
		rows.get(y).push({ x: item.transform[4], str: item.str });
	}

	console.log(`\n===== PAGE ${p} (height ${Math.round(height)}) =====`);

	// PDF Y goes up from the bottom, so sort descending = top to bottom
	const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
	for (const [y, pieces] of sorted) {
		const line = pieces
			.sort((a, b) => a.x - b.x)
			.map((piece) => piece.str)
			.join(' ');
		console.log(`y=${String(y).padStart(4)} | ${line}`);
	}
}
