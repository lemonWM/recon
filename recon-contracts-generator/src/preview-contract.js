// Prints one contract to the console so the text can be reviewed before any PDF exists.
// Usage: npm run contract            (first contract)
//        npm run contract -- 2       (third contract, zero-based)

import { CONTRACTS } from './terms.js'
import { buildContractText } from './contract-text.js'

const index = Number(process.argv[2] ?? 0)
const terms = CONTRACTS[index]

if (!terms) {
	console.error(`No contract at index ${index}. Available: 0..${CONTRACTS.length - 1}`)
	process.exit(1)
}

console.log(buildContractText(terms))
