// Single place that knows how to reach Supabase.
// Connection string lives in .env (gitignored) — never in code.
//
// TLS: Supabase's pooler presents a certificate Node does not trust out of the box.
// Preferred fix is to point at Supabase's CA certificate:
//     SUPABASE_CA_CERT=supabase-ca.crt
// (download it from Settings -> Database -> SSL Configuration)
//
// Quick fix, for synthetic data only:
//     PGSSL_NO_VERIFY=1
// Traffic stays encrypted but the server's identity is no longer verified.

import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
	console.error('Missing DATABASE_URL. Create a .env file in the generator folder.')
	process.exit(1)
}

function sslConfig() {
	if (process.env.SUPABASE_CA_CERT) {
		return { ca: fs.readFileSync(process.env.SUPABASE_CA_CERT, 'utf8') }
	}

	if (process.env.PGSSL_NO_VERIFY === '1') {
		console.warn('TLS verification is off — fine for synthetic data, not for real data.')
		return { rejectUnauthorized: false }
	}

	return true
}

export const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: sslConfig(),
	max: 4,
})
