import "server-only"

import {
  buildCrunchbaseFirmInput,
  fetchCrunchbaseResults,
  startCrunchbaseFirmEnrichment,
} from "@/lib/apify/crunchbase"
import {
  buildLeadsFinderInput,
  discoverVCPartners,
  LEADS_FINDER_ACTOR_ID,
} from "@/lib/apify/leads-finder"
import { fetchLinkedInResults, startLinkedInEnrichment } from "@/lib/apify/linkedin"
import { getApifyClient } from "@/lib/apify/client"
import { logApifyCost } from "@/lib/costs/track"
import { groupLeadsIntoFirms } from "@/lib/matching/group-leads"
import { mergeInvestors, type MergedFirm } from "@/lib/matching/merge"
import { generateOutreachEmail } from "@/lib/matching/outreach"
import { buildOutreachApifyContext } from "@/lib/matching/outreach-context"
import { prefilterFirms } from "@/lib/matching/prefilter"
import { buildFounderProfile } from "@/lib/matching/profile"
import { rankInvestorsWithGPT } from "@/lib/matching/rank"
import { hashProfile } from "@/lib/utils/hash-profile"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CrunchbaseCompany, JohnVCFirm, LeadsFinderContact, LinkedInPost } from "@/types/apify"
import type { FounderProfile, InvestorMatch } from "@/types/profile"

type SupabaseAdmin = ReturnType<typeof createAdminClient>
type SupabaseLike = {
  from: SupabaseAdmin["from"]
}

const CRUNCHBASE_ACTOR = "davidsharadbhatt/crunchbase-company-scraper---no-api-limits"
const LINKEDIN_ACTOR = "harvestapi/linkedin-profile-posts"
const SHORTLIST_TARGET = 40
const MIN_FIRMS_BEFORE_BROAD_PASS = 20

export async function startInvestorMatchingJob({
  supabase,
  jobId,
  profile,
  deckAnalysis,
}: {
  supabase: SupabaseLike
  jobId: string
  profile?: Record<string, unknown>
  deckAnalysis?: Record<string, unknown>
}) {
  logJob(jobId, "Starting investor matching pipeline")
  const job = await loadJob(supabase, jobId)
  await ensureNotCancelled(supabase, jobId)
  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const context = await loadContext({
    supabase,
    job,
    profile,
    deckAnalysis,
    deckAnalysisId,
  })
  const profileHash = String(job.cache_key ?? hashProfile(context.profile))
  logJob(jobId, "Profile prepared", {
    company: context.profile.company.name,
    sector: context.profile.company.sector,
    stage: context.profile.company.stage,
    profileHash,
  })
  const cached = await findCachedMatch(supabase, String(job.user_id), profileHash)

  if (cached) {
    logJob(jobId, "Cache hit; copying existing investor matches")
    await copyCachedMatch({
      supabase,
      cached,
      job,
      jobId,
      deckAnalysisId,
      profileHash,
    })
    return { jobId, cacheHit: true }
  }

  try {
    await supabase
      .from("investor_matching_jobs")
      .update({
        status: "discovery",
        pipeline_stage: "leads_finder_discovery",
        error: null,
        cache_key: profileHash,
        started_at: new Date().toISOString(),
        completed_at: null,
        scoring_completed_at: null,
      })
      .eq("id", jobId)
      .throwOnError()

    const leadsFinderInput = buildLeadsFinderInput(context.profile)
    logJob(jobId, "Starting Leads Finder actor", {
      actor: LEADS_FINDER_ACTOR_ID,
      input: leadsFinderInput,
    })

    let rawLeads = await discoverVCPartners(context.profile)
    await logApifyCost({
      userId: String(job.user_id),
      runId: jobId,
      runType: "investor_match",
      actorId: LEADS_FINDER_ACTOR_ID,
      units: rawLeads.length || Number(process.env.LEADS_FINDER_FETCH_COUNT ?? 250),
    })
    logJob(jobId, "Leads Finder actor completed", { itemCount: rawLeads.length })
    await ensureNotCancelled(supabase, jobId)

    let groupedFirms = groupLeadsIntoFirms(rawLeads, context.profile)
    let shortlistedFirms = prefilterFirms(groupedFirms, context.profile, SHORTLIST_TARGET)

    if (shortlistedFirms.length < MIN_FIRMS_BEFORE_BROAD_PASS) {
      logJob(jobId, "Broadening Leads Finder search (validated emails only)", {
        firmCount: shortlistedFirms.length,
      })
      const broadLeads = await discoverVCPartners(context.profile, { broad: true })
      await logApifyCost({
        userId: String(job.user_id),
        runId: jobId,
        runType: "investor_match",
        actorId: LEADS_FINDER_ACTOR_ID,
        units: broadLeads.length || Number(process.env.LEADS_FINDER_FETCH_COUNT ?? 250),
      })
      rawLeads = dedupeLeads([...rawLeads, ...broadLeads])
      groupedFirms = groupLeadsIntoFirms(rawLeads, context.profile)
      shortlistedFirms = prefilterFirms(groupedFirms, context.profile, SHORTLIST_TARGET)
    }

    await supabase
      .from("investor_matching_jobs")
      .update({
        status: "crunchbase_running",
        pipeline_stage: "crunchbase_enrichment",
        candidate_count: rawLeads.length,
        enriched_candidate_count: groupedFirms.length,
        shortlisted_count: shortlistedFirms.length,
        enriched_investors: groupedFirms,
        shortlisted_investors: shortlistedFirms,
      })
      .eq("id", jobId)
      .throwOnError()

    logJob(jobId, "Investor shortlist prepared", {
      validatedLeads: rawLeads.length,
      groupedFirms: groupedFirms.length,
      shortlistedFirms: shortlistedFirms.length,
    })

    const crunchbaseInput = buildCrunchbaseFirmInput(shortlistedFirms)
    logJob(jobId, "Starting Crunchbase actor", {
      actor: CRUNCHBASE_ACTOR,
      input: crunchbaseInput,
    })

    const crunchbaseRun = await startCrunchbaseFirmEnrichment(shortlistedFirms, jobId)
    if (crunchbaseRun.runId) {
      await logApifyCost({
        userId: String(job.user_id),
        runId: jobId,
        runType: "investor_match",
        actorId: CRUNCHBASE_ACTOR,
      })
    }
    logJob(jobId, "Crunchbase actor completed", {
      runId: crunchbaseRun.runId,
      datasetId: crunchbaseRun.datasetId,
    })
    await ensureNotCancelled(supabase, jobId)

    const crunchbaseResults = crunchbaseRun.datasetId
      ? await fetchCrunchbaseResults(String(crunchbaseRun.datasetId))
      : []
    logJob(jobId, "Crunchbase dataset fetched", { itemCount: crunchbaseResults.length })

    const shortlist = mergeInvestors(crunchbaseResults, shortlistedFirms)

    await supabase
      .from("investor_matching_jobs")
      .update({
        apify_actor_id: crunchbaseRun.actorId,
        apify_actor_run_id: crunchbaseRun.runId,
        apify_dataset_id: crunchbaseRun.datasetId,
        crunchbase_run_id: crunchbaseRun.runId,
        crunchbase_dataset_id: crunchbaseRun.datasetId,
        apify_actor_runs: { leadsFinder: { input: leadsFinderInput }, crunchbase: crunchbaseRun },
        investor_signals: crunchbaseResults,
        shortlisted_investors: shortlist,
        scraping_completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .throwOnError()

    const partnerUrls = shortlist.flatMap((firm) =>
      firm.Contacts.slice(0, 3)
        .map((contact) => contact.LinkedIn)
        .filter((url): url is string => Boolean(url))
    )
    let linkedinPosts: LinkedInPost[] = []
    let limitedData = partnerUrls.length === 0

    if (partnerUrls.length) {
      await supabase
        .from("investor_matching_jobs")
        .update({ status: "linkedin_running", pipeline_stage: "linkedin_activity" })
        .eq("id", jobId)
        .throwOnError()

      logJob(jobId, "Starting LinkedIn actor", {
        actor: LINKEDIN_ACTOR,
        targetUrlCount: partnerUrls.length,
        targetUrls: partnerUrls.slice(0, 20),
      })
      const linkedInRun = await startLinkedInEnrichment(partnerUrls, jobId)
      logJob(jobId, "LinkedIn actor completed", {
        runId: linkedInRun.runId,
        datasetId: linkedInRun.datasetId,
      })
      await ensureNotCancelled(supabase, jobId)
      await supabase
        .from("investor_matching_jobs")
        .update({
          linkedin_run_id: linkedInRun.runId,
          linkedin_dataset_id: linkedInRun.datasetId,
          apify_actor_runs: {
            leadsFinder: { input: leadsFinderInput },
            crunchbase: crunchbaseRun,
            linkedin: linkedInRun,
          },
        })
        .eq("id", jobId)
        .throwOnError()

      linkedinPosts = await fetchLinkedInResults(String(linkedInRun.datasetId ?? ""))
      await logApifyCost({
        userId: String(job.user_id),
        runId: jobId,
        runType: "investor_match",
        actorId: LINKEDIN_ACTOR,
      })
      logJob(jobId, "LinkedIn dataset fetched", { itemCount: linkedinPosts.length })
      limitedData = linkedinPosts.length === 0
    } else {
      logJob(jobId, "No LinkedIn URLs found; continuing with limited data")
    }

    await ensureNotCancelled(supabase, jobId)
    await completeInvestorMatching({
      supabase,
      job: { ...job, cache_key: profileHash },
      profile: context.profile,
      shortlist,
      rawLeads,
      groupedFirms,
      crunchbaseResults,
      linkedinPosts,
      limitedData,
      leadsFinderInput,
    })

    return { jobId, cacheHit: false }
  } catch (error) {
    logJob(jobId, "Pipeline failed", errorToLog(error))
    await markJobFailed(supabase, jobId, error, "pipeline_failed")
    throw error
  }
}

export async function cancelInvestorMatchingJob({
  supabase,
  jobId,
}: {
  supabase: SupabaseLike
  jobId: string
}) {
  const job = await loadJob(supabase, jobId)
  const runIds = [
    job.apify_actor_run_id,
    job.crunchbase_run_id,
    job.linkedin_run_id,
  ]
    .map((value) => (typeof value === "string" ? value : null))
    .filter((value): value is string => Boolean(value))

  logJob(jobId, "Cancellation requested", { runIds })

  await Promise.allSettled(
    Array.from(new Set(runIds)).map(async (runId) => {
      logJob(jobId, "Aborting Apify run", { runId })
      await getApifyClient().run(runId).abort()
    })
  )

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "cancelled",
      pipeline_stage: "cancelled",
      error: "Cancelled by user",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .throwOnError()

  return { jobId, cancelled: true }
}

export async function processCrunchbaseWebhook({
  jobId,
  datasetId,
  failed,
  error,
}: {
  jobId: string
  datasetId: string
  failed: boolean
  error?: string
}) {
  const supabase = createAdminClient()
  const job = await loadJob(supabase, jobId)
  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const context = await loadContext({ supabase, job, deckAnalysisId })
  const shortlistedFirms = (Array.isArray(job.shortlisted_investors)
    ? job.shortlisted_investors
    : []) as JohnVCFirm[]

  try {
    const crunchbaseResults = failed
      ? []
      : await fetchCrunchbaseResults(datasetId || String(job.crunchbase_dataset_id ?? job.apify_dataset_id ?? ""))

    await supabase
      .from("investor_matching_jobs")
      .update({
        error: failed ? error ?? "Crunchbase actor failed; continuing without deal enrichment." : null,
        investor_signals: crunchbaseResults,
      })
      .eq("id", jobId)
      .throwOnError()

    const shortlist = mergeInvestors(crunchbaseResults, shortlistedFirms)

    await supabase
      .from("investor_matching_jobs")
      .update({
        shortlisted_investors: shortlist,
      })
      .eq("id", jobId)
      .throwOnError()

    const partnerUrls = shortlist.flatMap((firm) =>
      firm.Contacts.slice(0, 3)
        .map((contact) => contact.LinkedIn)
        .filter((url): url is string => Boolean(url))
    )

    const groupedFirms = (Array.isArray(job.enriched_investors) ? job.enriched_investors : []) as JohnVCFirm[]

    if (!partnerUrls.length) {
      await completeInvestorMatching({
        supabase,
        job,
        profile: context.profile,
        shortlist,
        rawLeads: [],
        groupedFirms,
        crunchbaseResults,
        linkedinPosts: [],
        limitedData: true,
        leadsFinderInput: asRecord(job.apify_actor_runs)?.leadsFinder as Record<string, unknown> ?? {},
      })
      return { jobId, completed: true, limitedData: true }
    }

    await supabase
      .from("investor_matching_jobs")
      .update({ status: "linkedin_running", pipeline_stage: "linkedin_activity" })
      .eq("id", jobId)
      .throwOnError()

    const run = await startLinkedInEnrichment(partnerUrls, jobId)
    await supabase
      .from("investor_matching_jobs")
      .update({
        apify_actor_run_id: run.runId,
        apify_dataset_id: run.datasetId,
        linkedin_run_id: run.runId,
        linkedin_dataset_id: run.datasetId,
        apify_actor_runs: {
          ...(asRecord(job.apify_actor_runs) ?? {}),
          linkedin: run,
        },
      })
      .eq("id", jobId)
      .throwOnError()

    return { jobId, completed: false, limitedData: failed }
  } catch (stageError) {
    await markJobFailed(supabase, jobId, stageError, "crunchbase_webhook_failed")
    throw stageError
  }
}

export async function processLinkedInWebhook({
  jobId,
  datasetId,
  failed,
  error,
}: {
  jobId: string
  datasetId: string
  failed: boolean
  error?: string
}) {
  const supabase = createAdminClient()
  const job = await loadJob(supabase, jobId)
  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const context = await loadContext({ supabase, job, deckAnalysisId })
  const shortlist = (Array.isArray(job.shortlisted_investors) ? job.shortlisted_investors : []) as MergedFirm[]
  const crunchbaseResults = asArray(job.investor_signals)
  const groupedFirms = (Array.isArray(job.enriched_investors) ? job.enriched_investors : []) as JohnVCFirm[]

  try {
    const linkedinPosts = failed
      ? []
      : await fetchLinkedInResults(datasetId || String(job.linkedin_dataset_id ?? job.apify_dataset_id ?? ""))

    if (failed) {
      await supabase
        .from("investor_matching_jobs")
        .update({
          error: error ?? "LinkedIn actor failed; continuing with limited data.",
        })
        .eq("id", jobId)
        .throwOnError()
    }

    await completeInvestorMatching({
      supabase,
      job,
      profile: context.profile,
      shortlist,
      crunchbaseResults,
      rawLeads: [],
      groupedFirms,
      linkedinPosts,
      limitedData: failed,
      leadsFinderInput: asRecord(job.apify_actor_runs)?.leadsFinder as Record<string, unknown> ?? {},
    })

    return { jobId, completed: true, limitedData: failed }
  } catch (stageError) {
    await markJobFailed(supabase, jobId, stageError, "linkedin_webhook_failed")
    throw stageError
  }
}

async function completeInvestorMatching({
  supabase,
  job,
  profile,
  shortlist,
  rawLeads,
  groupedFirms,
  crunchbaseResults,
  linkedinPosts,
  limitedData,
  leadsFinderInput,
}: {
  supabase: SupabaseLike
  job: Record<string, unknown>
  profile: FounderProfile
  shortlist: MergedFirm[]
  rawLeads: LeadsFinderContact[]
  groupedFirms: JohnVCFirm[]
  crunchbaseResults: Record<string, unknown>[]
  linkedinPosts: LinkedInPost[]
  limitedData: boolean
  leadsFinderInput: Record<string, unknown>
}) {
  const jobId = String(job.id)
  await ensureNotCancelled(supabase, jobId)
  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const profileHash = String(job.cache_key ?? hashProfile(profile))
  const partnerUrls = shortlist.flatMap((firm) =>
    firm.Contacts.slice(0, 3)
      .map((contact) => contact.LinkedIn)
      .filter((url): url is string => Boolean(url))
  )

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "ranking",
      pipeline_stage: "openai_ranking",
      linkedin_signals: linkedinPosts,
    })
    .eq("id", jobId)
    .throwOnError()
  logJob(jobId, "Starting OpenAI ranking", {
    shortlistedFirms: shortlist.length,
    linkedinPosts: linkedinPosts.length,
    limitedData,
  })

  const ranked = shortlist.length
    ? await rankInvestorsWithGPT({ profile, firms: shortlist, partnerSignals: linkedinPosts, limitedData })
    : []
  logJob(jobId, "OpenAI ranking completed", { rankedCount: ranked.length })
  await ensureNotCancelled(supabase, jobId)

  logJob(jobId, "Generating outreach emails", { rankedCount: ranked.length })
  const generatedAt = new Date().toISOString()
  const withEmails = await Promise.all(
    ranked.map(async (match, index) => ({
      ...match,
      rank: index + 1,
      outreachEmail: await generateOutreachEmail({
        profile,
        match,
        apifyContext: buildOutreachApifyContext({
          match,
          rawLeads,
          crunchbaseResults: crunchbaseResults as CrunchbaseCompany[],
          linkedinPosts,
        }),
        userId: String(job.user_id ?? ""),
        runId: jobId,
      }),
    }))
  )
  logJob(jobId, "Outreach emails generated", { matchCount: withEmails.length })
  const storedMatches = withEmails.map((match) => toStoredMatch(match as InvestorMatch, generatedAt))

  await supabase
    .from("investor_matches")
    .insert({
      user_id: job.user_id,
      deck_analysis_id: deckAnalysisId,
      job_id: jobId,
      cache_key: profileHash,
      limited_data: limitedData,
      apify_actor_input: {
        leadsFinder: leadsFinderInput,
        linkedinProfileUrls: partnerUrls,
      },
      apify_query: {
        pipeline: ["leads_finder", "group", "prefilter", "crunchbase", "merge", "linkedin", "rank", "outreach"],
        limitedData,
      },
      matches: storedMatches,
      normalised_candidates: shortlist,
      raw_apify_response: {
        leadsFinderContacts: rawLeads,
        groupedFirms,
        crunchbaseCompanies: crunchbaseResults,
        linkedinPosts,
      },
      raw_openai_response: { matchCount: withEmails.length },
    })
    .throwOnError()
  logJob(jobId, "Investor matches persisted", { matchCount: storedMatches.length })

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "completed",
      pipeline_stage: limitedData ? "completed_limited" : "completed",
      limited_data: limitedData,
      candidate_count: withEmails.length,
      scoring_completed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .throwOnError()
  await (await import("@/lib/costs/track"))
    .rollupInvestorJobCost(jobId)
    .catch(() => undefined)
  logJob(jobId, "Pipeline completed", { matchCount: storedMatches.length, limitedData })
}

async function loadContext({
  supabase,
  job,
  profile,
  deckAnalysis,
  deckAnalysisId,
}: {
  supabase: SupabaseLike
  job: Record<string, unknown>
  profile?: Record<string, unknown>
  deckAnalysis?: Record<string, unknown>
  deckAnalysisId: string
}) {
  const [{ data: storedProfile }, { data: storedDeckAnalysis, error: deckError }] = await Promise.all([
    profile
      ? Promise.resolve({ data: profile })
      : supabase.from("profiles").select("*").eq("id", String(job.user_id)).single(),
    deckAnalysis
      ? Promise.resolve({ data: deckAnalysis, error: null })
      : supabase.from("deck_analyses").select("*").eq("id", deckAnalysisId).single(),
  ])

  if (deckError) throw deckError

  return {
    profile: buildFounderProfile({
      userId: String(job.user_id),
      deckAnalysisId,
      profile: (storedProfile ?? {}) as Record<string, unknown>,
      deckAnalysis: (storedDeckAnalysis ?? {}) as Record<string, unknown>,
    }),
    deckAnalysis: (storedDeckAnalysis ?? {}) as Record<string, unknown>,
  }
}

async function loadJob(supabase: SupabaseLike, jobId: string) {
  const { data, error } = await supabase
    .from("investor_matching_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  if (error) throw error
  return data as Record<string, unknown>
}

async function findCachedMatch(supabase: SupabaseLike, userId: string, profileHash: string) {
  const { data } = await supabase
    .from("investor_matches")
    .select("*")
    .eq("user_id", userId)
    .eq("cache_key", profileHash)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as Record<string, unknown> | null
}

async function copyCachedMatch({
  supabase,
  cached,
  job,
  jobId,
  deckAnalysisId,
  profileHash,
}: {
  supabase: SupabaseLike
  cached: Record<string, unknown>
  job: Record<string, unknown>
  jobId: string
  deckAnalysisId: string
  profileHash: string
}) {
  await supabase
    .from("investor_matches")
    .insert({
      user_id: job.user_id,
      deck_analysis_id: deckAnalysisId,
      job_id: jobId,
      cache_key: profileHash,
      matches: cached.matches,
      normalised_candidates: cached.normalised_candidates,
      raw_apify_response: cached.raw_apify_response,
      raw_openai_response: cached.raw_openai_response,
      apify_actor_input: cached.apify_actor_input,
      apify_query: cached.apify_query,
    })
    .throwOnError()

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "completed",
      pipeline_stage: "cache_hit",
      limited_data: Boolean(cached.limited_data),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .throwOnError()
}

async function markJobFailed(
  supabase: SupabaseLike,
  jobId: string,
  error: unknown,
  pipelineStage: string
) {
  const job = await loadJob(supabase, jobId).catch(() => null)
  if (String(job?.status) === "cancelled") {
    logJob(jobId, "Skipping failed status update because job is cancelled")
    return
  }

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "failed",
      pipeline_stage: pipelineStage,
      error: error instanceof Error ? error.message : "Investor matching failed",
    })
    .eq("id", jobId)
}

async function ensureNotCancelled(supabase: SupabaseLike, jobId: string) {
  const job = await loadJob(supabase, jobId)
  if (String(job.status) === "cancelled") {
    logJob(jobId, "Pipeline observed cancellation; stopping")
    throw new Error("Investor matching job was cancelled")
  }
}

function logJob(jobId: string, message: string, meta?: unknown) {
  if (meta === undefined) {
    console.log(`[investor-matching:${jobId}] ${message}`)
    return
  }

  console.log(`[investor-matching:${jobId}] ${message}`, meta)
}

function errorToLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

function toStoredMatch(match: InvestorMatch, generatedAt: string) {
  return {
    rank: match.rank,
    fitScore: match.fitScore,
    matchScore: match.fitScore,
    investorName: match.partner.name,
    firmName: match.firm.name,
    role: match.partner.title,
    linkedinUrl: match.partner.linkedin,
    email: match.partner.email ?? null,
    website: match.firm.website ?? null,
    location: match.firm.country,
    investmentStage: match.firm.investmentStages.join(", "),
    investmentStages: match.firm.investmentStages,
    sectorFocus: match.firm.focusAreas,
    matchRationale: match.matchRationale,
    whyThisInvestor: match.matchRationale,
    whyNow: match.recentLinkedInSignals[0]?.postText ?? "Recent fit is based on firm focus, stage, geography, and available deployment signals.",
    suggestedAngle: match.outreachEmail.subject,
    outreachSubject: match.outreachEmail.subject,
    outreachBody: match.outreachEmail.body,
    outreachGeneratedAt: generatedAt,
    outreachUpdatedAt: generatedAt,
    outreachSource: "ai",
    outreachImprovements: null,
    recentLinkedInSignals: match.recentLinkedInSignals,
    recentInvestments: match.firm.recentInvestments,
    firm: match.firm,
    partner: match.partner,
    limitedData: Boolean(match.limitedData),
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : []
}

function dedupeLeads(leads: LeadsFinderContact[]) {
  const seen = new Set<string>()
  return leads.filter((lead) => {
    const key = lead.email?.trim().toLowerCase()
      || lead.linkedin?.trim().toLowerCase()
      || `${lead.full_name ?? ""}:${lead.company_name ?? ""}`.toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
