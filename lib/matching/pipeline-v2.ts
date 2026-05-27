import "server-only"

import {
  APIFY_ACTORS,
  isLinkedInPostsEnabled,
  resolveLeadsFinderActorId,
  resolveLinkedInProfileActorId,
  resolveLinkedInPostsActorId,
} from "@/lib/apify/actors"
import { verifyEmails, validEmailSet } from "@/lib/apify/emailVerifier"
import { discoverVCPartners } from "@/lib/apify/leads-finder"
import { enrichLinkedInProfiles, profileMapByUrl } from "@/lib/apify/linkedinProfile"
import { fetchLinkedInPostsForProfiles } from "@/lib/apify/linkedinPosts"
import { normaliseLinkedInUrl } from "@/lib/apify/linkedin"
import { getScrapeCache, setScrapeCache } from "@/lib/cache/investorScrapeCache"
import { logApifyCost } from "@/lib/costs/track"
import { backfillRankedMatches } from "@/lib/matching/backfill-v2"
import { enrichedCandidatesToFirms } from "@/lib/matching/enriched-to-firms"
import {
  buildDiscoveryFilterFromProfile,
  type DiscoveryFilterPayload,
} from "@/lib/matching/filterFromProfile"
import { buildOutreachApifyContext } from "@/lib/matching/outreach-context"
import { generateOutreachEmail } from "@/lib/matching/outreach"
import { preFilterPeople } from "@/lib/matching/preFilterPeople"
import { rankInvestorsWithGPT } from "@/lib/matching/rank"
import { getInvestorPipelineV2Sizing } from "@/lib/matching/v2-sizing"
import { toStoredMatch } from "@/lib/investors/persist-matches"
import { buildFounderProfile } from "@/lib/matching/profile"
import { hasInvestorMatching } from "@/lib/stripe/plans"
import { hashProfile } from "@/lib/utils/hash-profile"
import { createAdminClient } from "@/lib/supabase/admin"
import type { LeadsFinderContact, LinkedInPost } from "@/types/apify"
import type { EnrichedInvestorCandidate } from "@/types/matching-v2"
import type { FounderProfile, InvestorMatch } from "@/types/profile"
import type { Plan } from "@/types/app"

type SupabaseAdmin = ReturnType<typeof createAdminClient>
type SupabaseLike = { from: SupabaseAdmin["from"] }

function logJob(jobId: string, message: string, meta?: unknown) {
  if (meta === undefined) {
    console.log(`[investor-matching-v2:${jobId}] ${message}`)
    return
  }
  console.log(`[investor-matching-v2:${jobId}] ${message}`, meta)
}

export async function startInvestorMatchingJobV2({
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
  logJob(jobId, "Starting investor matching pipeline v2")
  const job = await loadJob(supabase, jobId)
  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const userId = String(job.user_id ?? "")

  const context = await loadContext({ supabase, job, profile, deckAnalysis, deckAnalysisId })

  if (!hasInvestorMatching(context.plan)) {
    await markJobFailed(supabase, jobId, new Error("Plan no longer includes investor matching"), "plan_downgraded")
    return { jobId, cacheHit: false, aborted: true as const }
  }

  const sizing = getInvestorPipelineV2Sizing(context.plan)!
  const profileHash = String(job.cache_key ?? hashProfile(context.profile))
  const { filterPayload, filterHash } = buildDiscoveryFilterFromProfile(context.profile)

  logJob(jobId, "Sizing", {
    plan: context.plan,
    ...sizing,
    filterHash,
    profileHash,
    investorAudience: filterPayload.investorAudience,
    deckSignature: filterPayload.deckSignature,
    thesisKeywords: filterPayload.company_keywords,
  })

  const cachedUser = await findCachedUserMatch(supabase, userId, profileHash)
  if (cachedUser) {
    logJob(jobId, "User deck cache hit")
    await copyCachedUserMatch({ supabase, cached: cachedUser, job, jobId, deckAnalysisId, profileHash })
    return { jobId, cacheHit: true }
  }

  try {
    await supabase
      .from("investor_matching_jobs")
      .update({
        status: "discovery",
        pipeline_stage: "v2_discovery",
        error: null,
        cache_key: profileHash,
        started_at: new Date().toISOString(),
        completed_at: null,
        scoring_completed_at: null,
      })
      .eq("id", jobId)
      .throwOnError()

    let enrichedCandidates: EnrichedInvestorCandidate[]
    let scrapeCacheId: string | null = null
    let rawLeads: LeadsFinderContact[] = []

    const scrapeHit = await getScrapeCache(filterHash)
    if (scrapeHit) {
      logJob(jobId, "Scrape cache hit", { scrapeCacheId: scrapeHit.id, count: scrapeHit.candidates.length })
      enrichedCandidates = scrapeHit.candidates
      scrapeCacheId = scrapeHit.id
      rawLeads = scrapeHit.candidates.map((c) => c.lead)
    } else {
      logJob(jobId, "Running Leads Finder", { fetchCount: sizing.leadsFinderFetchCount })
      rawLeads = await discoverVCPartners(context.profile, {
        fetchCount: sizing.leadsFinderFetchCount,
      })
      await logApifyCost({
        userId,
        runId: jobId,
        runType: "investor_match",
        actorId: resolveLeadsFinderActorId(),
        units: rawLeads.length || sizing.leadsFinderFetchCount,
      })

      const filtered = preFilterPeople(rawLeads, context.profile, sizing.preFilterKeep)
      logJob(jobId, "Pre-filter complete", { raw: rawLeads.length, kept: filtered.length })

      const profileUrls = filtered
        .map((l) => normaliseLinkedInUrl(l.linkedin))
        .filter((u): u is string => Boolean(u))
        .slice(0, sizing.linkedinProfileCap)

      let profileMap = new Map<string, Record<string, unknown>>()
      if (profileUrls.length) {
        await supabase
          .from("investor_matching_jobs")
          .update({ status: "enriching", pipeline_stage: "v2_linkedin_profiles" })
          .eq("id", jobId)
          .throwOnError()

        const profiles = await enrichLinkedInProfiles(profileUrls)
        await logApifyCost({
          userId,
          runId: jobId,
          runType: "investor_match",
          actorId: resolveLinkedInProfileActorId(),
          units: profiles.length,
        })
        profileMap = profileMapByUrl(profiles)
      }

      enrichedCandidates = filtered.map((lead) => {
        const url = normaliseLinkedInUrl(lead.linkedin)
        return {
          lead,
          linkedInProfile: url ? profileMap.get(url) : undefined,
        }
      })

      scrapeCacheId = await setScrapeCache({
        filterHash,
        filterPayload,
        candidates: enrichedCandidates,
      })
      logJob(jobId, "Scrape cache written", { scrapeCacheId, count: enrichedCandidates.length })
    }

    let linkedinPosts: LinkedInPost[] = []
    let limitedData = enrichedCandidates.length === 0

    if (isLinkedInPostsEnabled() && enrichedCandidates.length) {
      const postTargets = enrichedCandidates
        .slice(0, sizing.linkedinPostsCap)
        .map((c) => normaliseLinkedInUrl(c.lead.linkedin))
        .filter((u): u is string => Boolean(u))

      if (postTargets.length) {
        await supabase
          .from("investor_matching_jobs")
          .update({ status: "linkedin_running", pipeline_stage: "v2_linkedin_posts" })
          .eq("id", jobId)
          .throwOnError()

        linkedinPosts = await fetchLinkedInPostsForProfiles(postTargets, {
          maxPosts: 10,
          postedLimit: "year",
        })
        await logApifyCost({
          userId,
          runId: jobId,
          runType: "investor_match",
          actorId: resolveLinkedInPostsActorId(),
          units: linkedinPosts.length || postTargets.length,
        })

        const postsByUrl = groupPostsByProfile(linkedinPosts)
        enrichedCandidates = enrichedCandidates.map((c) => {
          const url = normaliseLinkedInUrl(c.lead.linkedin)
          const posts = url ? postsByUrl.get(url) ?? [] : []
          return { ...c, linkedInPosts: posts.length ? posts : c.linkedInPosts }
        })
      }
      limitedData = linkedinPosts.length === 0
    }

    const firms = enrichedCandidatesToFirms(enrichedCandidates, context.profile)

    await supabase
      .from("investor_matching_jobs")
      .update({
        candidate_count: rawLeads.length || enrichedCandidates.length,
        enriched_candidate_count: enrichedCandidates.length,
        shortlisted_count: firms.length,
        shortlisted_investors: firms,
        linkedin_signals: linkedinPosts,
        investor_signals: { pipelineVersion: "v2", filterHash },
      })
      .eq("id", jobId)
      .throwOnError()

    await supabase
      .from("investor_matching_jobs")
      .update({ status: "ranking", pipeline_stage: "v2_openai_ranking" })
      .eq("id", jobId)
      .throwOnError()

    const targetMatchCount = sizing.targetMatchCount
    const rankedFromGpt =
      firms.length && targetMatchCount > 0
        ? await rankInvestorsWithGPT({
            profile: context.profile,
            firms,
            partnerSignals: linkedinPosts,
            limitedData,
            targetMatchCount,
          })
        : []

    const deckSummary = context.profile.deckSignals?.summary ?? context.profile.company.oneLiner
    const ranked = backfillRankedMatches({
      ranked: rankedFromGpt,
      firms,
      linkedinPosts,
      targetMatchCount,
      deckSummary,
      limitedData,
    })

    logJob(jobId, "Ranking done", {
      gpt: rankedFromGpt.length,
      final: ranked.length,
      target: targetMatchCount,
    })

    let rankedForOutreach = ranked
    if (process.env.INVESTOR_PIPELINE_EMAIL_VERIFY?.trim().toLowerCase() !== "false") {
      const emails = ranked.map((m) => m.partner.email).filter((e): e is string => Boolean(e))
      if (emails.length) {
        const verified = await verifyEmails(emails)
        const valid = validEmailSet(verified)
        await logApifyCost({
          userId,
          runId: jobId,
          runType: "investor_match",
          actorId: APIFY_ACTORS.EMAIL_VERIFIER.name,
          units: emails.length,
        })
        if (verified.length > 0 && valid.size < emails.length) {
          rankedForOutreach = ranked.map((match) => {
            const email = match.partner.email?.trim().toLowerCase()
            if (email && !valid.has(email)) {
              return { ...match, partner: { ...match.partner, email: undefined } }
            }
            return match
          })
          logJob(jobId, "Email verification removed invalid addresses", {
            before: emails.length,
            after: valid.size,
          })
        }
      }
    }

    const generatedAt = new Date().toISOString()
    const withEmails: InvestorMatch[] = []
    for (let index = 0; index < rankedForOutreach.length; index++) {
      const match = rankedForOutreach[index]
      const outreachEmail = await generateOutreachEmail({
        profile: context.profile,
        match,
        apifyContext: buildOutreachApifyContext({
          match,
          rawLeads,
          crunchbaseResults: [],
          linkedinPosts,
        }),
        userId,
        runId: jobId,
      })
      withEmails.push({ ...match, rank: index + 1, outreachEmail })
    }

    const storedMatches = withEmails.map((m) => toStoredMatch(m, generatedAt))
    const leadsFinderInput = {
      ...filterPayload,
      fetch_count: sizing.leadsFinderFetchCount,
      pipelineVersion: "v2",
    }

    await supabase
      .from("investor_matches")
      .insert({
        user_id: userId,
        deck_analysis_id: deckAnalysisId,
        job_id: jobId,
        cache_key: profileHash,
        filter_hash: filterHash,
        scrape_cache_id: scrapeCacheId,
        limited_data: limitedData,
        apify_actor_input: { discovery: leadsFinderInput },
        apify_query: {
          pipeline: ["v2", "leads_finder", "pre_filter", "linkedin_profile", "linkedin_posts", "rank", "outreach", "email_verify"],
          limitedData,
          filterHash,
        },
        matches: storedMatches,
        normalised_candidates: firms,
        raw_apify_response: {
          pipelineVersion: "v2",
          leadsFinderContacts: rawLeads,
          enrichedCandidates,
          linkedinPosts,
          filterPayload,
        },
        raw_openai_response: { matchCount: storedMatches.length, rankedFromGpt: rankedFromGpt.length },
      })
      .throwOnError()

    await supabase
      .from("investor_matching_jobs")
      .update({
        status: "completed",
        pipeline_stage: limitedData ? "v2_completed_limited" : "v2_completed",
        limited_data: limitedData,
        candidate_count: storedMatches.length,
        scoring_completed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .throwOnError()

    await (await import("@/lib/costs/track")).rollupInvestorJobCost(jobId).catch(() => undefined)
    logJob(jobId, "Pipeline v2 completed", { matchCount: storedMatches.length })

    return { jobId, cacheHit: false }
  } catch (error) {
    logJob(jobId, "Pipeline v2 failed", error)
    await markJobFailed(supabase, jobId, error, "v2_pipeline_failed")
    throw error
  }
}

function groupPostsByProfile(posts: LinkedInPost[]) {
  const map = new Map<string, LinkedInPost[]>()
  for (const post of posts) {
    const key = normaliseLinkedInUrl(post.profileUrl)
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(post)
    map.set(key, list)
  }
  return map
}

async function loadJob(supabase: SupabaseLike, jobId: string) {
  const { data, error } = await supabase.from("investor_matching_jobs").select("*").eq("id", jobId).single()
  if (error) throw error
  return data as Record<string, unknown>
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
  const profileRecord = (storedProfile ?? {}) as Record<string, unknown>
  const plan = (profileRecord.plan as Plan | undefined) ?? "free"
  return {
    profile: buildFounderProfile({
      userId: String(job.user_id),
      deckAnalysisId,
      profile: profileRecord,
      deckAnalysis: (storedDeckAnalysis ?? {}) as Record<string, unknown>,
    }),
    plan,
  }
}

async function findCachedUserMatch(supabase: SupabaseLike, userId: string, profileHash: string) {
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

async function copyCachedUserMatch({
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
      filter_hash: cached.filter_hash,
      scrape_cache_id: cached.scrape_cache_id,
      matches: cached.matches,
      normalised_candidates: cached.normalised_candidates,
      raw_apify_response: cached.raw_apify_response,
      raw_openai_response: cached.raw_openai_response,
      apify_actor_input: cached.apify_actor_input,
      apify_query: cached.apify_query,
      limited_data: cached.limited_data,
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
  if (String(job?.status) === "cancelled") return

  await supabase
    .from("investor_matching_jobs")
    .update({
      status: "failed",
      pipeline_stage: pipelineStage,
      error: error instanceof Error ? error.message : "Investor matching failed",
    })
    .eq("id", jobId)
}
