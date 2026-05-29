import fs from "fs"
import path from "path"

const schemaPath = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-tomas-OneDrive-Documents-Work-and-Business-Client-Projects-FrancescaV2-app/agent-tools/abec6155-651f-4d25-a3e7-5dad81a97851.txt"
)

const text = fs.readFileSync(schemaPath, "utf8")
const marker = "Select one or more locations to filter the leads."
const start = text.indexOf(marker)
if (start === -1) {
  throw new Error("Could not find contact_location enum in schema dump")
}
const enumStart = text.indexOf('"enum": [', start)
const enumEnd = text.indexOf('"enumTitles"', enumStart)
const block = text.slice(enumStart, enumEnd)
const all = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1])
const countries = all.slice(0, all.indexOf("california, us"))

const out = `/** Country-level \`contact_location\` values accepted by code_crafter/leads-finder. */
export const LEADS_FINDER_WORLDWIDE_COUNTRIES = ${JSON.stringify(countries, null, 2)} as const
`

fs.writeFileSync(
  path.join(process.cwd(), "lib/apify/leads-finder-countries.ts"),
  out,
  "utf8"
)

console.log(`Wrote ${countries.length} countries`)
