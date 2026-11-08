// Minimal HTTP service: POST /chunk with a PDF body, returns clause chunks as JSON.
// Runs inside the Docker network only; n8n calls it at http://recon-ingest:3000/chunk
import { createServer } from 'node:http';
import { readLines, chunkLines } from './chunk.js';

const PORT = process.env.PORT || 3000;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB is far above any contract we expect

function send(res, status, body) {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
	if (req.method === 'GET' && req.url === '/health') {
		return send(res, 200, { ok: true });
	}

	if (req.method !== 'POST' || req.url !== '/chunk') {
		return send(res, 404, { error: 'Not found' });
	}

	// Collect the raw PDF bytes from the request body
	const parts = [];
	let size = 0;
	for await (const part of req) {
		size += part.length;
		if (size > MAX_BYTES) return send(res, 413, { error: 'File too large' });
		parts.push(part);
	}

	const data = new Uint8Array(Buffer.concat(parts));
	if (data.length === 0) return send(res, 400, { error: 'Empty body' });

	try {
		const chunks = chunkLines(await readLines(data));
		if (chunks.length === 0) return send(res, 422, { error: 'No text found in PDF' });
		send(res, 200, { chunk_count: chunks.length, chunks });
	} catch (err) {
		console.error(err);
		send(res, 422, { error: 'Could not read PDF', detail: err.message });
	}
});

server.listen(PORT, () => console.log(`recon-contract-reader listening on ${PORT}`));