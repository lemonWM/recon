// Renders each contract to a PDF under out/.
// The text comes from contract-text.js; this file only decides how it looks on paper.
// Text flows: pdfkit adds pages on its own, so a clause can start on one page and end on
// the next. That is deliberate — the chunking step has to survive it.
//
// Usage: npm run pdfs

import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import { CONTRACTS } from './terms.js'
import { buildContractText } from './contract-text.js'

const OUT_DIR = 'out'

// These documents are invented test material. The notice says so on the page itself,
// so a single page taken out of context still carries it.
const NOTICE = 'Synthetic demo document. Generated for testing an invoice-checking tool. '
	+ 'Not a real agreement; the parties, figures and terms are invented, and any '
	+ 'resemblance to actual companies or contracts is coincidental.'
const FOOTER_NOTICE = 'Synthetic demo document — not a real agreement'

// "1. DEFINITIONS" or "12. GOVERNING LAW" — a section heading.
const HEADING = /^\d+\.\s+[A-Z][A-Z \-&,']+$/
// A document title, standing alone in capitals.
const TITLE = /^(MASTER SERVICES AGREEMENT|AMENDMENT No\. \d+)$/

function renderLine(doc, line) {
	if (line === '') {
		doc.moveDown(0.5)
		return
	}

	if (TITLE.test(line)) {
		const isFirstTitle = doc.bufferedPageRange().count === 1 && !doc.reconTitleDone
		doc.moveDown(0.6)
		doc.font('Times-Bold').fontSize(14).text(line, { align: 'center' })
		doc.moveDown(0.4)

		// Only under the opening title, not above an amendment further down.
		if (isFirstTitle) {
			doc.reconTitleDone = true
			doc.font('Times-Italic').fontSize(8).fillColor('#666666')
			doc.text(NOTICE, { align: 'center' })
			doc.fillColor('#000000')
			doc.moveDown(0.6)
		}
		return
	}

	if (HEADING.test(line)) {
		doc.moveDown(0.7)
		doc.font('Times-Bold').fontSize(11).text(line)
		doc.moveDown(0.25)
		return
	}

	doc.font('Times-Roman').fontSize(11).text(line, { align: 'justify' })
}

// Page number and contract reference, repeated on every page.
// The x position of the page number is worked out from the width of the string:
// letting pdfkit right-align it inside a block makes it treat the footer as flowing
// text at the bottom edge, which adds a blank page and then stamps that one too.
function stampFooters(doc, reference) {
	const range = doc.bufferedPageRange()
	const total = range.count

	for (let i = range.start; i < range.start + total; i++) {
		doc.switchToPage(i)
		const y = doc.page.height - 45
		doc.font('Times-Roman').fontSize(8).fillColor('#555555')

		doc.text(reference, 60, y, { lineBreak: false })

		const label = `Page ${i - range.start + 1} of ${total}`
		const x = doc.page.width - 60 - doc.widthOfString(label)
		doc.text(label, x, y, { lineBreak: false })

		const mid = (doc.page.width - doc.widthOfString(FOOTER_NOTICE)) / 2
		doc.text(FOOTER_NOTICE, mid, y, { lineBreak: false })

		doc.fillColor('#000000')
	}
}

function buildPdf(terms, filePath) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margins: { top: 70, bottom: 70, left: 60, right: 60 },
			bufferPages: true,
			info: {
				Title: `${terms.reference} — ${terms.customer}`,
				Author: 'Northwind Systems B.V.',
				Subject: terms.service,
			},
		})

		const stream = fs.createWriteStream(filePath)
		stream.on('finish', resolve)
		stream.on('error', reject)
		doc.pipe(stream)

		for (const line of buildContractText(terms).split('\n')) {
			renderLine(doc, line.trimEnd())
		}

		stampFooters(doc, terms.reference)
		doc.end()
	})
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true })

	for (const terms of CONTRACTS) {
		if (!terms.fileName) {
			console.log(`${terms.customerShort.padEnd(12)} skipped — no contract document`)
			continue
		}

		const filePath = path.join(OUT_DIR, terms.fileName)
		await buildPdf(terms, filePath)
		const kb = (fs.statSync(filePath).size / 1024).toFixed(0)
		console.log(`${terms.customerShort.padEnd(12)} ${terms.fileName.padEnd(22)} ${kb} kB`)
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
