# Investor Matching Root Cause and Fix Report

Date: 2026-06-07
Commit before: 19115f859803ec7e87b5f0c3143daaee70a36b55
Commit after: 19115f859803ec7e87b5f0c3143daaee70a36b55 plus uncommitted working-tree fixes
Environment: Local Codex desktop workspace on Windows; deterministic tests only; no live Apify/OpenAI/Supabase staging run

## Executive Summary

- Main root causes: region-blind discovery, thin/generic vertical keywords, GPT ranker over-trust, weak deterministic scoring, no final diversity constraints, no rationale validator, no outreach validator/fallback, and no explicit cheque fit model.
- Fixes implemented: regional UK/EU/US discovery passes, vertical-specific query/keyword generation, deterministic weighted scoring with penalties, final selection diversity, rationale validation/fallback composition, strict outreach validation with deterministic 3-step fallback, and persisted cheque fit metadata.
- Remaining risks: live investor data quality still depends on Apify results and source freshness; cheque size remains limited by explicit source text; final quality still needs a five-company staging rerun.
- Investor matching is safer now because deterministic targeted tests pass and broken outreach/rationale/scoring cases now have server-side guardrails.

## Known Failures Addressed

| Failure | Root Cause | Fix | Status |
| ------- | ---------- | --- | ------ |
| Investor overlap too high | Discovery and ranking let generic SaaS/generalist funds dominate unrelated companies. | Added vertical-specific discovery terms, generalist penalties, scored backfill, and final diversity selection. | Fixed deterministically; needs live staging QA |
| Same investors across unrelated companies | No broad-fund penalty or sector-specialist preference in top results. | Added broad/generalist penalty, sector evidence score, sector-specialist minimum where suitable candidates exist. | Fixed deterministically |
| ClinIQ got 100% US investors | `buildLeadsFinderContactLocations` ignored founder geography and returned worldwide countries in one pool. | Added UK/EU/US regional discovery passes and local-first geography scoring/balancing. | Fixed deterministically |
| Outreach failed every company | Model output was trusted after light cleaning; no strict validation or fallback. | Added exact Day 0/5/12 validation, placeholder rejection, body reuse checks, and deterministic fallback sequence. | Fixed; targeted tests pass |
| Rationales generic | Prompt asked for specificity but no server-side validation or deterministic fallback existed. | Added rationale validator and evidence-based rationale composition. | Fixed deterministically |
| Cheque fit unknown too often | Cheque fit was not modeled or persisted. | Added `chequeFit`, `chequeSize`, cheque parsing, unknown handling, scoring caveat, and export/UI visibility. | Fixed structurally; source data still limited |

## Pipeline Map

| Stage | File | Function | Input | Output | Risk |
| ----- | ---- | -------- | ----- | ------ | ---- |
| Start match route | `app/api/investors/match/route.ts` | `POST` | deckAnalysisId, auth user | queued job | Auth/usage gate only |
| Queue job | `lib/investors/enqueue.ts` | `enqueueInvestorMatching` | profile + deck analysis | `investor_matching_jobs` row | Cache key depends on founder profile |
| Cron runner | `app/api/cron/investors/run/[jobId]/route.ts` | `POST` | jobId | worker run | Requires cron auth |
| Worker dispatch | `lib/investors/run-job.ts` | `runInvestorMatchingJob` | jobId | pipeline execution | Loads DB context |
| Legacy/v2 router | `lib/investors/pipeline.ts` | `startInvestorMatchingJob` | job/profile/deck | legacy or v2 path | Env-gated by `INVESTOR_PIPELINE_VERSION` |
| V2 discovery | `lib/matching/pipeline-v2.ts` | `startInvestorMatchingJobV2` | founder profile | enriched candidates | Provider/source quality |
| Query generation | `lib/matching/investor-fit.ts` | `buildInvestorDiscoveryQueries` | founder profile | UK/EU/US query intents | New deterministic coverage |
| Leads Finder input | `lib/apify/leads-finder.ts` | `buildLeadsFinderInput`, `discoverVCPartnersRegionally` | profile + regional intent | deduped raw leads | Multiple actor passes increase cost |
| Region normalization | `lib/apify/leads-finder-locations.ts` | `buildLeadsFinderContactLocations` | geography/region | contact locations | Country list support |
| Raw lead filtering | `lib/matching/preFilterPeople.ts` | `preFilterPeople` | raw leads/profile | scored lead shortlist | Relies on lead metadata text |
| Firm normalization/dedupe | `lib/matching/enriched-to-firms.ts`, `lib/matching/group-leads.ts` | `enrichedCandidatesToFirms`, `groupLeadsIntoFirms` | enriched people | firm records | Firm name normalization can still miss aliases |
| Firm scoring | `lib/matching/investor-fit.ts` | `scoreFirmForProfile` | firm/profile | weighted fit assessment | Text evidence only |
| GPT ranking | `lib/matching/rank.ts`, `prompts/scoreInvestor.md` | `rankInvestorsWithGPT` | founder + candidates | ranked matches | GPT can still drift; now normalized after output |
| Backfill | `lib/matching/backfill-v2.ts`, `lib/investors/pipeline.ts` | `backfillRankedMatches`, `backfillFromShortlist` | ranked + firms | full match count | Now scored, still lower-confidence |
| Final diversity | `lib/matching/investor-fit.ts` | `selectDiverseInvestorMatches` | matches/profile | balanced final list | Does not force bad UK/EU candidates |
| Rationale validation | `lib/matching/investor-fit.ts` | `validateMatchRationale`, `composeEvidenceBasedRationale` | match/profile | accepted/fallback rationale | Deterministic copy is concise |
| Outreach context | `lib/matching/outreach-context.ts` | `buildOutreachPromptPayload` | match + raw signals | prompt payload | Source completeness |
| Outreach generation | `lib/matching/outreach.ts`, `prompts/writeOutreachSequence.md` | `generateOutreachSequence` | profile/match/context | 3-step sequence | Fallback used after invalid output |
| Outreach validation | `lib/matching/outreach-validation.ts` | `validateOutreachSequence`, `buildFallbackOutreachSequence` | sequence/profile/match | valid sequence | Strict; may fallback more often |
| Persistence | `lib/investors/persist-matches.ts` | `toStoredMatch` | `InvestorMatch` | JSON match row | JSON shape is backwards compatible |
| Status | `app/api/investors/status/[jobId]/route.ts` | `GET` | jobId | job + row count | Read-only |
| Outreach regenerate | `app/api/investors/outreach/regenerate/route.ts` | `POST` | jobId/rank | regenerated outreach | Uses new generator fallback |
| Outreach update | `app/api/investors/outreach/update/route.ts` | `POST` | manual sequence | saved sequence | Now rejects malformed sequence basics |
| Exports | `app/api/investors/export-csv/route.ts`, `app/api/investors/export-pdf/route.ts`, `lib/pdf.ts` | `POST`, `renderInvestorMatchesPdf` | saved matches | CSV/PDF | Cheque fields now visible |

## Root Cause Findings

### Investor overlap

Discovery used a single Leads Finder pool and a small keyword set. ClimateTech and consumer social could collapse into generic SaaS/Other, while the ranker was instructed to sort rather than reject weak fits. Generic firms with broad early-stage language were allowed to rank above specialist investors.

### Worldwide coverage

`buildLeadsFinderContactLocations` ignored the founder geography and returned every supported country. A UK/Europe/Worldwide founder therefore had no UK/EU discovery pass, local quota, or local-first ranking pressure.

### Generic rationales

`prompts/scoreInvestor.md` asked for concrete details, but `rankInvestorsWithGPT` accepted model rationales without validation. Backfill rationales were deterministic but generic and sometimes promoted weak-evidence firms.

### Outreach sequence failure

`generateOutreachSequence` only checked that OpenAI returned some steps. It cleaned text but did not reject missing Day 0/5/12, placeholders, missing names, generic copy, or reused bodies. There was no deterministic fallback.

### Cheque fit unknown

No typed or persisted `chequeFit` existed. Cheque size was neither parsed nor scored, so unknown cheque fit could not be represented as a caveat.

### Broad investor dominance

There was no broad-fund penalty, no final cap on generalists, and no sector-specialist preference. GPT saw a weak candidate pool and could repeatedly pick familiar generalist names.

### Sector-specific matching weaknesses

`investor-thesis-keywords` and `deck-discovery` did not model climate/carbon, consumer social, clinic SaaS, or fintech lending/API infrastructure strongly enough. The enum sector bucket was too lossy.

## Code Changes Made

| File | Change | Why |
| ---- | ------ | --- |
| `lib/matching/investor-fit.ts` | New pure helper for vertical detection, discovery queries, region labels, weighted scoring, cheque parsing, rationale validation, and final diversity. | Central deterministic guardrails |
| `lib/matching/outreach-validation.ts` | New strict outreach validator and deterministic fallback sequence. | Prevent broken model output from being saved |
| `lib/apify/leads-finder.ts` | Added regional discovery wrapper and per-pass keyword overrides. | Avoid one worldwide/generalist scrape |
| `lib/apify/leads-finder-locations.ts` | Added region-aware UK/EU/US location selection. | Fix local coverage failure |
| `lib/matching/deck-discovery.ts` | Expanded vertical keyword mapping and cap from 3 to 6. | Preserve subvertical signal |
| `lib/matching/investor-thesis-keywords.ts` | Added climate, consumer, fintech infra, clinic SaaS, workflow terms from raw text. | Reduce generic SaaS collapse |
| `lib/matching/preFilterPeople.ts`, `lib/matching/prefilter.ts` | Weighted sector/region scoring and generic penalties. | Improve candidate pool before GPT |
| `lib/matching/rank.ts`, `prompts/scoreInvestor.md` | Added deterministic fit payload and stricter prompt; model output normalized afterward. | Stop over-trusting GPT ranking/rationales |
| `lib/matching/backfill-v2.ts`, `lib/investors/pipeline.ts` | Backfill now uses fit scoring and evidence-based rationale. | Avoid weak generic filler |
| `lib/matching/pipeline-v2.ts`, `lib/investors/pipeline.ts` | Wired regional discovery, scored backfill, final diversity selection. | Fix both v2 and legacy paths |
| `lib/matching/outreach.ts`, `prompts/writeOutreachSequence.md` | Added validation retry and fallback sequence. | Guarantee exactly Day 0/5/12 when possible |
| `types/profile.ts`, `lib/investors/persist-matches.ts`, `lib/matching/outreach-context.ts` | Added optional cheque/fit/rationale metadata. | Store explicit caveats and reuse in outreach |
| `app/api/investors/outreach/update/route.ts` | Reject malformed manual sequence basics. | Prevent placeholder/day drift on edit |
| `app/api/investors/export-csv/route.ts`, `lib/pdf.ts`, `components/investors/investor-profile-dialog.tsx` | Surface cheque fit/size. | Make unknown cheque fit visible |
| `scripts/qa/investor-matching-targeted-tests.ts` | Added 13 targeted deterministic tests. | Cover requested failure modes |
| `scripts/v2-dual-deck-e2e.ts`, `scripts/qa/raisewise-product-quality.ts` | Updated backfill helper call signature. | Keep existing scripts type-safe |

## New/Updated Scoring Logic

- Weighted facets: sector/thesis 35, stage 20, geography 15, cheque 10, business model 10, traction/raise 5, evidence quality 5.
- Penalties: generic broad fund without vertical evidence -15, unknown sector evidence -20, wrong geography without local/global mandate -10, unknown cheque -5, weak evidence -10.
- Region balancing: UK/EU founders get UK and Europe preference; final selection tries to include at least 30% UK/EU in top 10 where suitable candidates exist.
- Final constraints: cap generalists to roughly 40% in the top window, prefer sector specialists, and limit weak-evidence candidates.
- Cheque handling: explicit ranges can score Strong/Partial/Weak; absent data stores `Unknown` and cannot score as strong.

## New/Updated Rationale Logic

- A valid rationale must contain a concrete startup fact and a concrete investor evidence point.
- Generic phrases such as "invests in startups", "supports founders", "strong network", "perfect fit", and "great match" are rejected.
- Invalid or missing rationales are replaced with deterministic copy containing `startupFact`, `investorEvidence`, `fitReason`, `caveat`, and `confidence`.
- Caveats explicitly mention unknown cheque size, broad/generalist fit, or US geography for UK/EU founders where relevant.

## New/Updated Outreach Logic

- The sequence schema remains three steps, but server validation now requires exactly Day 0, Day 5, and Day 12.
- Each step must have subject, body, company name, investor/firm name, no placeholders, no generic banned phrases, no reused body, and a fit signal.
- OpenAI generation retries once with validation errors.
- If generation still fails or returns invalid output, `buildFallbackOutreachSequence` returns deterministic Day 0/5/12 copy using company name, sector, raise amount, traction, investor firm, and fit reason.

## Tests Added

| Test | Purpose | Result |
| ---- | ------- | ------ |
| Search query generation differs across AtlasOps, Looply, ClinIQ, LedgerBridge, Gridwise Carbon | Prevent identical generic discovery | Pass |
| ClinIQ query includes UK/Europe HealthTech | Fix UK healthcare coverage | Pass |
| Gridwise query includes climate/carbon | Avoid generic SaaS climate matching | Pass |
| LedgerBridge query includes fintech/API/lending/infrastructure | Preserve fintech infra specificity | Pass |
| Generalist investor penalty works | Down-rank broad funds | Pass |
| Region balancing avoids 100% US if UK/EU candidates exist | Fix ClinIQ-style coverage | Pass |
| Rationale validator rejects generic rationale | Stop vague explanations | Pass |
| Rationale validator passes evidence rationale | Allow specific rationales | Pass |
| Outreach validator rejects placeholders | Stop broken templates | Pass |
| Outreach validator rejects missing Day 0/5/12 | Enforce sequence structure | Pass |
| Outreach fallback returns exactly Day 0/5/12 | Deterministic fallback shape | Pass |
| Outreach fallback includes company and investor firm | Personalization fallback | Pass |
| Cheque unknown does not count as strong | Unknown cheque caveat | Pass |

## Commands Run

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa/investor-matching-targeted-tests.ts` | Initial sandbox run failed with `spawn EPERM` from local esbuild worker. |
| `npx tsx scripts/qa/investor-matching-targeted-tests.ts` | Pass with approval: 13/13 targeted tests passed. |
| `npx tsc --noEmit` | Pass. |
| `npm run lint` | Failed on existing React Compiler/admin/billing issues outside this fix; no remaining new Investor Matching lint warning after cleanup. |
| `npx tsx scripts/qa/investor-matching-targeted-tests.ts` | Final pass with approval: 13/13 targeted tests passed. |

Lint blockers observed:
- `app/admin/costs/page.tsx`, `app/admin/failures/page.tsx`, `app/admin/funnel/page.tsx`, `app/admin/revenue/page.tsx`: `Date.now()` purity errors.
- `components/billing/paywall-modal.tsx`: `window.location.href` immutability error.
- `components/dashboard/dashboard-shell.tsx`, `components/investors/investor-outreach-editor.tsx`, `components/investors/investor-profile-dialog.tsx`, `components/investors/investor-table.tsx`: synchronous `setState` in effect errors.
- `lib/supabase/auth-callback.ts`: `prefer-const`.

## Remaining Risks

- Live web/provider verification is still required; deterministic tests do not prove actual Apify result quality.
- Multiple regional Leads Finder passes may increase Apify starts/cost; cost telemetry still rolls up by job and should be reviewed after staging.
- Cheque sizes remain limited by explicit text in source metadata; unknown values are handled honestly but not magically enriched.
- Region balancing depends on the candidate pool; it will not force bad UK/EU investors just to hit a quota.
- GPT can still drift, but invalid rationales/outreach now have deterministic guardrails.
- Existing lint blockers remain outside this investor-matching fix scope.

## Follow-up QA Required

Run one post-fix staging validation:

- Re-run the previous five-company investor matching test.
- Compare AtlasOps vs Gridwise Carbon overlap.
- Check ClinIQ region mix for UK, Europe, and US/global.
- Review 10 outreach sequences manually for names, days, and fit reasons.
- Review 10 rationales manually for startup fact, investor evidence, caveat, and cheque handling.
- Review Apify cost impact from regional discovery passes.

## Final Verdict

Fixed enough for staging QA.

Do not treat this as launch-cleared until the five-company live staging run confirms lower overlap, better ClinIQ UK/EU coverage, and acceptable live rationales/outreach.
