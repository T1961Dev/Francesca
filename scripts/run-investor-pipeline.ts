/**
 * Run a queued investor_matching_jobs row through the production pipeline.
 *
 * Set INVESTOR_PIPELINE_VERSION=v2 in .env.local to exercise the v2 path.
 *
 * Usage:
 *   npx tsx scripts/run-investor-pipeline.ts <jobId>
 */
import "dotenv/config"
import { config as loadEnv } from "dotenv"
import path from "node:path"
import Module from "node:module"

;(Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename = new Proxy(
  (Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename,
  {
    apply(target, thisArg, args) {
      if (args[0] === "server-only") {
        return path.join(process.cwd(), "scripts", "stub-server-only.cjs")
      }
      return Reflect.apply(target as never, thisArg, args)
    },
  }
)

loadEnv({ path: path.resolve(process.cwd(), ".env.local") })

const jobId = process.argv[2]?.trim()
if (!jobId) {
  console.error("Usage: npx tsx scripts/run-investor-pipeline.ts <jobId>")
  process.exit(1)
}

const { runInvestorMatchingJob } = await import("@/lib/investors/run-job")

console.log("[run-investor-pipeline] Starting job", {
  jobId,
  pipeline: process.env.INVESTOR_PIPELINE_VERSION ?? "legacy",
})

await runInvestorMatchingJob(jobId)
console.log("[run-investor-pipeline] Done", { jobId })
