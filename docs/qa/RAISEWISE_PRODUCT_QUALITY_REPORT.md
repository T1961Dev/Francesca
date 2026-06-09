# RaiseWise Product Quality QA Report

Date: 2026-06-06T21:28:56.535Z
Environment: Local CLI against remote Supabase config; Supabase writes disabled for safety
Commit hash: 19115f859803ec7e87b5f0c3143daaee70a36b55
Tester: Codex CLI QA runner
App URL: http://localhost:3000
Database project: tzusmopchzrwzoejhowq

## Executive Summary

Overall readiness score: **0/100**
Launch recommendation: **Do not ship**
Investor matching good enough: **No / not fully verified**

Top 10 issues:
- QA-001 P1 Financial Model: Financial model generation failed for AtlasOps
- QA-002 P1 Investor Matching: AtlasOps outreach sequence quality failed
- QA-003 P1 Investor Matching: Looply outreach sequence quality failed
- QA-004 P1 Investor Matching: ClinIQ outreach sequence quality failed
- QA-005 P1 Investor Matching: LedgerBridge has generic investor fit explanations
- QA-006 P1 Investor Matching: LedgerBridge outreach sequence quality failed
- QA-007 P1 Investor Matching: Gridwise Carbon has generic investor fit explanations
- QA-008 P1 Investor Matching: Gridwise Carbon outreach sequence quality failed
- QA-009 P1 Investor Matching: High investor overlap: AtlasOps vs Gridwise Carbon

Top 5 product quality risks:
- Remote Supabase/service-role configuration means authenticated API persistence and paid UI-state E2E were not mutated without an explicit staging/test session.
- Investor source freshness is limited to returned metadata/URLs; no independent live web verification was performed.
- OpenAI-generated quality can drift run to run; rerun before launch using a fixed staging dataset.
- ClimateTech and consumer social classification depends heavily on raw sector/deck keywords because internal sector buckets are limited.
- Cost-heavy investor matching should be rerun at the full paid plan cap if this run used QA_INVESTOR_TARGET_MATCHES below 35.

## Scope Tested

| Area | Result | Notes |
| --- | --- | --- |
| Auth | Partial | Unauthenticated API smoke checks run against http://localhost:3000. |
| Onboarding | Blocked | No safe test user/session was created. |
| Deck analyser | Pass | 8 generated PDF fixtures processed through PDF extraction and deck analysis. |
| Billing | Static only | Plan catalog/limits inspected; no Stripe charges or webhook mutations run. |
| Paid deck | Partial | Plan gating helper inspected; authenticated paid UI not exercised. |
| Financial model | Partial | 5 company model runs attempted from form inputs plus deck context; 4 completed and 1 failed during structured JSON parsing. |
| Investor matching | Fail | 5 direct v2 quality runs attempted. |
| Emails | Blocked | Resend is configured, but no email was sent to avoid spamming real users. |
| Exports | Static only | Export routes/components discovered; authenticated export execution not run. |
| UI rendering | Blocked | Auth redirects/smoke fetches only; screenshots require safe login state. |
| Plan limits | Static only | Plan constants and usage gates inspected. |

## Project Inspection

- Stack: Next.js 16.2.4, React 19.2.4, Supabase, OpenAI, Apify, Stripe, Resend.
- Next docs read: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md; node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md.
- Service role writes disabled by QA runner: true.
- Existing test tooling: docs\E2E-TESTING-CHECKLIST.md, docs\E2E-TESTING-FROM-RESET-PASSWORD.md, docs\pre-launch-tests.md, docs\PRODUCT_SPEC.md, scripts\module3-reports\v2-full-test-2026-05-27T18-42-45-517Z.json, scripts\module3-reports\v2-full-test-2026-05-27T18-42-45-517Z.md, scripts\module3-reports\v2-full-test-2026-05-27T19-18-31-635Z.json, scripts\module3-reports\v2-full-test-2026-05-27T19-18-31-635Z.md, supabase\.temp\cli-latest.

Key API endpoints found:
- /api/cron/hard-delete (app\api\cron\hard-delete\route.ts)
- /api/cron/health-check (app\api\cron\health-check\route.ts)
- /api/cron/investors/run/[jobId] (app\api\cron\investors\run\[jobId]\route.ts)
- /api/cron/monthly-reset (app\api\cron\monthly-reset\route.ts)
- /api/cron/re-engagement (app\api\cron\re-engagement\route.ts)
- /api/deck/analyse (app\api\deck\analyse\route.ts)
- /api/deck/export-pdf (app\api\deck\export-pdf\route.ts)
- /api/deck/extract (app\api\deck\extract\route.ts)
- /api/deck/upload (app\api\deck\upload\route.ts)
- /api/financial-model/export-pdf (app\api\financial-model\export-pdf\route.ts)
- /api/financial-model/generate (app\api\financial-model\generate\route.ts)
- /api/health/resend (app\api\health\resend\route.ts)
- /api/investors/cancel/[jobId] (app\api\investors\cancel\[jobId]\route.ts)
- /api/investors/export-csv (app\api\investors\export-csv\route.ts)
- /api/investors/export-pdf (app\api\investors\export-pdf\route.ts)
- /api/investors/mark-sent (app\api\investors\mark-sent\route.ts)
- /api/investors/match (app\api\investors\match\route.ts)
- /api/investors/outreach/regenerate (app\api\investors\outreach\regenerate\route.ts)
- /api/investors/outreach/update (app\api\investors\outreach\update\route.ts)
- /api/investors/retry/[jobId] (app\api\investors\retry\[jobId]\route.ts)
- /api/investors/status/[jobId] (app\api\investors\status\[jobId]\route.ts)
- /api/resend/score-ready (app\api\resend\score-ready\route.ts)
- /api/resend/upgrade-prompt (app\api\resend\upgrade-prompt\route.ts)
- /api/resend/welcome (app\api\resend\welcome\route.ts)
- /api/stripe/checkout (app\api\stripe\checkout\route.ts)
- /api/stripe/complete (app\api\stripe\complete\route.ts)
- /api/stripe/portal (app\api\stripe\portal\route.ts)
- /api/stripe/webhook (app\api\stripe\webhook\route.ts)
- /api/whatsapp (app\api\whatsapp\route.ts)

Database tables/functions found:
- Tables: admin_actions, api_costs, billing_events, deck_analyses, deck_uploads, email_events, financial_models, idempotency_keys, investor_matches, investor_matching_jobs, investor_scrape_cache, lifetime_inventory, pdf_exports, profiles, rate_limit_buckets, re_engagement_emails, user_usage
- RPC/functions: auth_email_registered, bump_rate_limit_bucket, confirm_lifetime_purchase, decrement_usage, ensure_user_usage_row, fetch_deck_analysis_row, fetch_latest_deck_financial_prefill, increment_usage_if_under_limit, lifetime_slot_available, list_deck_analysis_rows, reset_monthly_usage, set_updated_at, sync_profile_email_on_auth_update, sync_profile_from_auth_user

## Test Data Used

| Company | Sector | Stage | Geography | Raise amount | Traction | Deck fixture used |
| --- | --- | --- | --- | ---: | --- | --- |
| AtlasOps | B2B SaaS / AI / Workflow Automation | pre-seed | UK / Europe / Worldwide | 750000 | GBP 18k MRR, 22 customers, 9% month-on-month growth, GBP 9k ACV | docs\qa\artifacts\deck-analysis\fixtures\atlasops.pdf |
| Looply | Consumer / Social / Events | pre-seed | UK / Europe / Worldwide | 500000 | Pre-revenue, 12,000 waitlist users, 4,500 beta users | docs\qa\artifacts\deck-analysis\fixtures\looply.pdf |
| ClinIQ | HealthTech / Healthcare SaaS | seed | UK / Europe / Worldwide | 900000 | GBP 8k MRR, 11 private clinics | docs\qa\artifacts\deck-analysis\fixtures\cliniq.pdf |
| LedgerBridge | FinTech / API / Lending Infrastructure | seed | UK / Europe / Worldwide | 1200000 | 3 lender pilots, signed LOIs, pre-revenue | docs\qa\artifacts\deck-analysis\fixtures\ledgerbridge.pdf |
| Gridwise Carbon | ClimateTech / Carbon Accounting / B2B SaaS | pre-seed | UK / Europe / Worldwide | 700000 | GBP 5k MRR, 15 pilot customers | docs\qa\artifacts\deck-analysis\fixtures\gridwise-carbon.pdf |

## Pitch Deck Analyser Results

| Deck | Score | Categories | Weights | Extracted Raise | Feedback Quality | Pass/Fail | Issues |
| --- | ---: | ---: | --- | ---: | --- | --- | --- |
| AtlasOps | 65 | 8 | true | 750000 | Specific | Pass |  |
| Looply | 63 | 8 | true | 500000 | Specific | Pass |  |
| ClinIQ | 65 | 8 | true | 900000 | Specific | Pass |  |
| LedgerBridge | 60 | 8 | true | 1200000 | Specific | Pass |  |
| Gridwise Carbon | 63 | 8 | true | 700000 | Specific | Pass |  |
| AtlasOps Excellent Deck | 80 | 8 | true | 750000 | Specific | Pass |  |
| AtlasOps Average Deck | 57 | 8 | true | 750000 | Specific | Pass |  |
| AtlasOps Weak Deck | 16 | 8 | true | 0 | Specific | Pass |  |

Score discrimination:

| Variant | Score | Expected band | Verdict |
| --- | ---: | --- | --- |
| excellent | 80 | 80-95 | OK |
| average | 57 | 50-75 | OK |
| weak | 16 | 10-45 | OK |

## Financial Model Results

| Company | Revenue Assumptions / Final Revenue | Burn / Runway Check | Plausibility | Adapted to Business Model | Pass/Fail | Issues |
| --- | --- | --- | --- | --- | --- | --- |
| AtlasOps | Final M36 revenue - | Runway approx issues - |  | false | Fail | Expected ',' or ']' after array element in JSON at position 53431 (line 21022 column 4) |
| Looply | Final M36 revenue 0 | Runway approx issues 0 | consumer,social,events,community,gen z | true | Pass |  |
| ClinIQ | Final M36 revenue 84605 | Runway approx issues 0 | healthtech,healthcare,clinic,clinical,saas | true | Pass |  |
| LedgerBridge | Final M36 revenue 0 | Runway approx issues 0 | fintech,api,lending,infrastructure,financial services | true | Pass |  |
| Gridwise Carbon | Final M36 revenue 37761 | Runway approx issues 0 | carbon,emissions,accounting,saas | true | Pass |  |

## Investor Matching Results

### AtlasOps

Counts: {"rawLeads":78,"preFiltered":25,"profileUrls":25,"linkedinPosts":77,"firms":24,"rankedFromGpt":10,"finalMatches":10}

| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |
| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |
| 1 | Underscore Vc | Richard Dulude | US | saas, ai, workflow, automation, b2b, operations | true | Unknown | 92 | Strong fit | Underscore VC's focus on B2B SaaS and AI aligns well with AtlasOps' solution targeting mid-market operations teams looking to automate workflows. The partner's engagement in early-stage SaaS startups and AI investments is relevant given AtlasOps' proposition.  |
| 2 | Primary Venture Partners | Brad Svrluga | US | saas, ai, workflow, automation, b2b, operations | true | Unknown | 89 | Strong fit | Primary Venture Partners specializes in SaaS and AI, which matches AtlasOps’ AI-driven B2B SaaS solution. Given the firm's expertise in customer acquisition and go-to-market strategies, improvement in these areas could make AtlasOps more compelling. The modest |
| 3 | Antler | Nitin Sharma | Other global | saas, ai, workflow, b2b, operations | true | Unknown | 85 | Strong fit | Antler's strong backing of B2B tech and AI aligns with AtlasOps' mission to enhance mid-market operations using AI. The firm's focus on early-stage investments and scalable business models fits AtlasOps' current stage and its rapid, albeit modest, revenue grow |
| 4 | Creator Ventures | Sasha Kaletsky | UK | saas, ai, workflow, automation, b2b, operations | true | Unknown | 82 | Strong fit | Creator Ventures' emphasis on SaaS and early-stage technology investments dovetails with AtlasOps’ focus on AI-driven workflow automation. Improving the narrative around competitive differentiation could enhance alignment, as Creator Ventures appreciates clear |
| 5 | Village Global | Anne Dwane | US | saas, ai, workflow, automation, operations | true | Unknown | 80 | Strong fit | Village Global's network-driven approach and focus on SaaS makes it well-suited for investing in AtlasOps. Their interest in AI innovation aligns with AtlasOps' AI-driven workflow automation solution. However, further detail on AtlasOps' growth strategy and ma |
| 6 | Tsp Ventures | Steven Pearson | UK | saas, ai, workflow, automation, b2b, operations | true | Unknown | 77 | Strong fit | TSP Ventures, with its focus on innovative AI solutions, would find AtlasOps’ B2B SaaS attractive, especially for its plans to extend workflow automation. To increase appeal, addressing weaknesses like high cash burn and lack of detailed market size could be b |
| 7 | Theventurecity | Laura Gonzalez-estefani | US | saas, ai, workflow, automation, b2b, operations | true | Unknown | 75 | Strong fit | TheVentureCity's emphasis on product-led growth suits AtlasOps, especially if the company can strengthen cohesion and competitive differentiation in its deck. The venture's focus on AI/ML aligns well with AtlasOps' workflow automation goals. |
| 8 | Innovation Endeavors | Dror Berman | US | ai, workflow, automation, b2b, operations | true | Unknown | 73 | Strong fit | Innovation Endeavors, with its focus on AI and B2B solutions, fits well with AtlasOps. Improving the competitive landscape section in AtlasOps’ deck could enhance the fit, as this is a critical evaluation area for Innovation Endeavors. |
| 9 | Pretiosum Ventures | Yana Abramova | UK | saas, ai, workflow, automation, operations | true | Unknown | 70 | Strong fit | Pretiosum Ventures' concentration on AI and SaaS solutions aligns with AtlasOps. Clarifying AtlasOps' specific AI-driven competitive advantages would cater to Pretiosum’s investment criteria, as would addressing the sparse details around the team and market. |
| 10 | Ballistic Ventures | Jake Seid | US | saas, ai, workflow, automation | true | Unknown | 68 | Partial fit | Ballistic Ventures has a dedicated focus on AI security, which could tangentially relate to AtlasOps’ workflow automation objectives. Clear acknowledgment of security measures and their relevance in AtlasOps could bridge this gap further. |

Outreach sequence review:
- 3 steps / days / placeholders / personalization pass: false
- Specific rationale pass: true

### Looply

Counts: {"rawLeads":80,"preFiltered":25,"profileUrls":25,"linkedinPosts":95,"firms":24,"rankedFromGpt":10,"finalMatches":10}

| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |
| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |
| 1 | C2 Ventures | Chris Cunningham | US | consumer, social, community, gen z | true | Unknown | 92 | Strong fit | C2 Ventures' focus on consumer internet and early-stage consumer apps aligns well with Looply's B2C model targeting Gen Z event planning. Their expertise in market traction and financial modeling can help the team refine their market analysis and financial pro |
| 2 | Creator Ventures | Sasha Kaletsky | UK | consumer, social, community, gen z, marketplace | true | Unknown | 85 | Strong fit | Based in the UK, Creator Ventures has a direct geographical alignment with Looply, enhancing their ability to support the app's market presence in Europe. Their focus on consumer internet and social media startups fits Looply's strategy for engaging Gen Z user |
| 3 | Commerce Ventures | Dan Rosen | US | consumer, social, gen z | true | Unknown | 80 | Strong fit | Commerce Ventures' expertise in consumer internet applications and digital transformation could greatly benefit Looply as it scales its social app for event planning. Although the firm is based in the US, their strategies in consumer engagement and user experi |
| 4 | Third Sphere | Stonly Blue | US | social, community, gen z | true | Unknown | 75 | Strong fit | While their primary focus is on sustainability and urban development, Third Sphere's interest in machine learning and technology innovation parallels Looply's approach to integrating technology in event planning. Their collaborative solutions and community eng |
| 5 | Black Lab X | Jean-paul O'brien | US | social, events, community, gen z | true | Unknown | 72 | Strong fit | Black Lab X’s focus on human-centric tech and innovation ecosystems aligns with Looply's aim to improve event planning experiences for Gen Z. Their emphasis on business scaling and mentorship can aid Looply in strengthening team presentation and user engagemen |
| 6 | Rethink Impact, Lp | Jenny Abramson | US | consumer, social, community, gen z, marketplace | true | Unknown | 68 | Partial fit | Rethink Impact's focus on social impact and community-driven platforms resonates with Looply's community engagement goal for event planning. Their experience in marketplace platforms could help Looply in advancing their monetization strategy and enhancing thei |
| 7 | Andreessen Horowitz | Chris Dixon | US | consumer, social, community, gen z, marketplace | true | Unknown | 66 | Partial fit | Andreessen Horowitz has a broad focus but their expertise in consumer behavior and scalable consumer internet models could be valuable for Looply's user acquisition strategy. The firm's experience with network effects might help improve Looply's community-driv |
| 8 | Vu Venture Partners | Skyler Fernandes | US | consumer, social, events, gen z | true | Unknown | 64 | Partial fit | Vu Venture Partners, with its significant experience in consumer internet and innovative business models, can support Looply to refine its business strategy and monetization approach. Their understanding of user engagement and consumer applications complements |
| 9 | Realvc | Matt Berriman | Other global | consumer, social, community, gen z | true | Unknown | 60 | Partial fit | RealVC, with its background in high-growth ventures and market dynamics, can bring insights into Looply's consumer engagement strategy. Their approach to customer-centric services aligns with Looply's goal to enhance event planning for Gen Z. |
| 10 | Momentum Ventures | Ammar Hanafi | US | consumer, social, gen z, marketplace | true | Unknown | 58 | Partial fit | Momentum Ventures’ focus on technology solutions and business transformation is valuable for Looply's growth and scaling plans. Their understanding of marketplaces and data-driven insights supports the aim to quantify user engagement and optimize event discove |

Outreach sequence review:
- 3 steps / days / placeholders / personalization pass: false
- Specific rationale pass: true

### ClinIQ

Counts: {"rawLeads":79,"preFiltered":25,"profileUrls":25,"linkedinPosts":84,"firms":23,"rankedFromGpt":10,"finalMatches":10}

| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |
| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |
| 1 | Healthx Ventures | Mark Bakken | US | healthcare, clinic, patient, saas | true | Unknown | 92 | Strong fit | Healthx Ventures focuses on digital health and healthcare technology, making it a strong fit for ClinIQ’s SaaS solution aimed at improving clinic workflows. ClinIQ's emphasis on private clinic efficiencies complements Healthx Ventures' portfolio goals. The cle |
| 2 | Alix Ventures | Chas Pulido | US | healthcare, clinic, patient, clinical, saas | true | Unknown | 85 | Strong fit | Alix Ventures specializes in life sciences and healthcare innovation, aligning well with ClinIQ’s focus on improving clinical workflows through SaaS. While ClinIQ’s market size analysis is missing, Alix Ventures’ emphasis on healthcare startups and innovation  |
| 3 | Village Global | Anne Dwane | US | healthcare, clinic, saas | true | Unknown | 78 | Strong fit | Village Global’s focus on healthcare and SaaS aligns with ClinIQ's business model. Though lacking detailed market size data, ClinIQ's focus on private clinics offers an intriguing niche for Village Global, which values startup ecosystems and community building |
| 4 | Atria Ventures | Chris Leiter | US | clinic, saas | true | Unknown | 75 | Strong fit | Atria Ventures’ interest in biopharma and digital health fits well with ClinIQ's solution for clinic workflow management. The firm’s focus on early-stage innovation aligns with ClinIQ's traction phase, though they need to improve traction metrics to meet Atria |
| 5 | 3cc \| Third Culture Capital | Julien Pham | US | healthcare, clinic, patient, saas | true | Unknown | 73 | Strong fit | 3cc’s healthcare and digital health focus matches ClinIQ’s target for enhancing clinic efficiencies. However, ClinIQ's lack of individual team backgrounds may not fully align with 3cc’s emphasis on diverse leadership and cross-cultural innovation. |
| 6 | Moment Ventures | Clint Chao | US | healthcare, clinic, patient, saas | true | Unknown | 69 | Partial fit | Moment Ventures' investment in early-stage tech aligns with ClinIQ but lacks specific focus on health SaaS. The narrative strength needs enhancement, as Moment Ventures values strong storytelling. |
| 7 | Theventurecity | Laura Gonzalez-estefani | US | healthtech, clinic, saas | true | Unknown | 66 | Partial fit | Theventurecity supports healthtech and B2B SaaS startups, matching ClinIQ’s profile. ClinIQ's geographic strategy aligns with Theventurecity’s global investment approach, but they need a more compelling narrative to capture attention. |
| 8 | Grand Ventures | Tim Streit | US | healthtech, healthcare, clinic, patient, saas | true | Unknown | 62 | Partial fit | Grand Ventures’ interest in healthtech aligns broadly with ClinIQ’s sector. Their emphasis on B2B technology matches ClinIQ’s model, but the limited growth metrics in the deck might not meet Grand Ventures’ expectations for portfolio potential. |
| 9 | Alkali Partners | Shane Hubbell | US | healthtech, clinic, patient, saas | true | Unknown | 60 | Partial fit | Alkali Partners' focus on SaaS and healthtech matches ClinIQ’s offering. While the firm is suitable for strategic business advice, ClinIQ's weak market size presentation could be a barrier for their investment thesis. |
| 10 | Andreessen Horowitz | Chris Dixon | US | healthcare, clinic, patient, saas | true | Unknown | 58 | Partial fit | Andreessen Horowitz’s broad investment in technology and healthcare is a fit, yet ClinIQ’s vague market size data and dry narrative may not match their high expectation for detailed market analysis and compelling storytelling. |

Outreach sequence review:
- 3 steps / days / placeholders / personalization pass: false
- Specific rationale pass: true

### LedgerBridge

Counts: {"rawLeads":79,"preFiltered":25,"profileUrls":25,"linkedinPosts":86,"firms":24,"rankedFromGpt":9,"finalMatches":10}

| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |
| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |
| 1 | Tsp Ventures | Steven Pearson | UK | fintech, api, lending, infrastructure, financial services, bank data | true | Unknown | 95 | Strong fit | Steven’s focus on financial services makes Tsp Ventures a strong contender for LedgerBridge. Their experience in early-stage fintech and financial promotion aligns well with your API infrastructure approach to streamline SME lending workflows. Being UK-based,  |
| 2 | Creator Ventures | Sasha Kaletsky | UK | fintech, api, lending, infrastructure, financial services, bank data | true | Unknown | 92 | Strong fit | Sasha's strong focus on fintech and early-stage investments aligns well with your stage and the detailed API-driven fintech infrastructure approach in your deck. Creator Ventures’ emphasis on market analysis and strategic insights could help address the missin |
| 3 | Infinity Ventures | Jeremy Jonker | US | fintech, api, lending, infrastructure, financial services | true | Unknown | 88 | Strong fit | Jeremy’s extensive background in fintech and financial infrastructure makes Infinity Ventures a suitable partner for LedgerBridge. The firm’s experience in payment solutions and infrastructure aligns with your API strategy to overhaul SME lending processes. Al |
| 4 | Almaz Capital | Alexander Galitsky | US | fintech, api, lending, infrastructure, financial services | true | Unknown | 83 | Strong fit | Alexander's experience with cloud ERP and fintech startups positions Almaz Capital effectively to support your API-driven platform. Their track record in regulatory compliance and market research could help enhance your missing competitive landscape and detail |
| 5 | Primary Venture Partners | Benjamin Sun | US | fintech, api, lending, infrastructure, financial services, bank data | true | Unknown | 80 | Strong fit | Benjamin's expertise in financial technology and operational support resonates with your B2B SaaS model. Primary Venture Partners' experience with early-stage investments and fostering customer acquisition strategies could directly benefit your need for more c |
| 6 | Noemis Ventures | Simeon Iheagwam | US | fintech, api, lending, infrastructure, financial services | true | Unknown | 78 | Strong fit | Simeon's focus on fintech and early-stage investments aligns with LedgerBridge's funding stage and sector. Noemis Ventures' investment strategy and insights in technology commercialization can provide valuable support in crafting a detailed customer acquisitio |
| 7 | Underscore Vc | Richard Dulude | US | fintech, api, lending, infrastructure, financial services, bank data | true | Unknown | 75 | Strong fit | Richard and Underscore VC's experience with fintech startups and B2B SaaS aligns well with your API solution. Their focus on community-driven investment and business mentorship could support the development of missing team bios and market size details. Their U |
| 8 | Tau Ventures | Amit Garg | US | api, lending, infrastructure, financial services | true | Unknown | 72 | Strong fit | While Tau Ventures primarily focuses on AI and healthcare, Amit’s emphasis on enterprise automation resonates with your API-driven approach for streamlining workflows in SME lending. Their insight into automated processes might support improving your competiti |
| 9 | Cherryrock Capital | Stacy Brown-philpot | US | fintech, api, lending, infrastructure, financial services | true | Unknown | 70 | Strong fit | Stacy’s expertise in financial services at Cherryrock Capital provides a foundational understanding of your fintech-driven goals. Their strengths in financial planning and market analysis could support your pitch in terms of defining clearer market size and cu |
| 10 | Tbv | Brent Fulfer | US | fintech, api, lending, infrastructure, financial services | true | Unknown | 48 | Partial fit | Secondary pick: Tbv focuses on Venture Capital & Private Equity / venture capital, events, advisory, community, social media, marketing, venture capital & private equity principals, web3, fundraising, startups, event management, community building, blockchain, |

Outreach sequence review:
- 3 steps / days / placeholders / personalization pass: false
- Specific rationale pass: false

### Gridwise Carbon

Counts: {"rawLeads":80,"preFiltered":25,"profileUrls":25,"linkedinPosts":87,"firms":24,"rankedFromGpt":10,"finalMatches":10}

| Rank | Investor/Firm | Contact | Region | Sector Fit | Stage Fit | Cheque Fit | Fit Score | Verdict | Evidence/Reason |
| ---- | ------------- | ------- | ------ | ---------- | --------- | ---------- | --------- | ------- | --------------- |
| 1 | Creator Ventures | Sasha Kaletsky | UK | climate, carbon, accounting, saas | true | Unknown | 92 | Strong fit | Creator Ventures, based in the UK, focuses on B2B SaaS and technology investments, aligning well with Gridwise Carbon's ClimateTech and SaaS model. Sasha Kaletsky’s experience in early-stage investments presents a strong partnership opportunity, especially giv |
| 2 | Pretiosum Ventures | Yana Abramova | UK | carbon, accounting, saas | true | Unknown | 88 | Strong fit | Pretiosum Ventures' expertise in SaaS and financial modeling suits Gridwise Carbon's focus, especially given the need for detailed financial projections. Yana Abramova’s leadership can guide the founder in solidifying a robust business model to stand out in th |
| 3 | Blume Ventures | Sanjay Nath | Other global | climate, carbon, accounting, saas | true | Unknown | 85 | Strong fit | Blume Ventures' broad focus on SaaS and emphasis on strategic partnerships aligns with Gridwise Carbon's B2B model. Sanjay Nath’s experience in innovative SaaS investments could assist in crafting a compelling competitive differentiation strategy. Additionally |
| 4 | Antler | Nitin Sharma | Other global | climate, carbon, accounting, saas | true | Unknown | 80 | Strong fit | Antler’s focus on impact investing and scalable business models fits Gridwise Carbon’s ClimateTech approach. Nitin Sharma’s expertise in tech-driven startups aligns with the founder’s plan to create detailed market sizing and a differentiated product offering. |
| 5 | Equal Ventures | Rick Zullo | US | climate, carbon, accounting, saas | true | Unknown | 75 | Strong fit | Equal Ventures, with a strong climate investment thesis, can offer Gridwise Carbon insights into market validations and risk-awareness strategies crucial to succeeding in the carbon accounting space. Rick Zullo's emphasis on strategic differentiation is a valu |
| 6 | Theventurecity | Laura Gonzalez-estefani | US | climate, carbon, accounting, saas | true | Unknown | 70 | Strong fit | TheVentureCity’s global tech investment knowledge and Laura Gonzalez-estefani’s hands-on support for pre-seed SaaS startups can help Gridwise Carbon develop comprehensive team bios and marketing strategies that engage investors despite current narrative gaps. |
| 7 | Village Global | Anne Dwane | US | climate, carbon, sustainability, accounting, saas | true | Unknown | 65 | Partial fit | Village Global, led by Anne Dwane, focuses on nurturing early-stage startups with their robust network. Their mentor-driven approach would be beneficial for addressing Gridwise’s team-related risks and scaling go-to-market efforts effectively. |
| 8 | Dynamo Ventures | Santosh Sankar | US | climate, carbon, accounting, saas | true | Unknown | 60 | Partial fit | Although focused more on logistics, Dynamo Ventures’ insights into operational efficiency and supply chain can be leveraged to address inefficiencies in carbon accounting processes that Gridwise Carbon aims to solve. |
| 9 | Underscore Vc | Richard Dulude | US | climate, carbon, accounting, saas | true | Unknown | 58 | Partial fit | Underscore VC, known for its community-driven investment model, can provide Gridwise Carbon with strategic mentorship and support in building an impactful narrative that relates their financial ask to concrete milestones, which is currently not well-articulate |
| 10 | Boldstart Ventures | Ed Sim | US | climate, carbon, accounting, saas | true | Unknown | 55 | Partial fit | Boldstart Ventures, though enterprise-focused, has experience with SaaS startups necessitating go-to-market support. Ed Sim can advise on addressing the lack of detailed acquisitions strategies, enhancing Gridwise Carbon's path to market traction and growth me |

Outreach sequence review:
- 3 steps / days / placeholders / personalization pass: false
- Specific rationale pass: false

### Investor Overlap Matrix

| Pair | Shared Investors | Overlap % | Verdict |
| ---- | ---------------: | --------: | ------- |
| AtlasOps vs Looply | 1 | 10.0% | Good |
| AtlasOps vs ClinIQ | 2 | 20.0% | Good |
| AtlasOps vs LedgerBridge | 4 | 40.0% | Watch |
| AtlasOps vs Gridwise Carbon | 6 | 60.0% | Serious concern |
| Looply vs ClinIQ | 1 | 10.0% | Good |
| Looply vs LedgerBridge | 1 | 10.0% | Good |
| Looply vs Gridwise Carbon | 1 | 10.0% | Good |
| ClinIQ vs LedgerBridge | 0 | 0.0% | Good |
| ClinIQ vs Gridwise Carbon | 2 | 20.0% | Good |
| LedgerBridge vs Gridwise Carbon | 2 | 20.0% | Good |

### Investors Appearing Across Multiple Companies

| Investor | Companies Appeared In | Concern Level |
| -------- | --------------------- | ------------- |
| Creator Ventures | AtlasOps, Looply, LedgerBridge, Gridwise Carbon | High |
| Underscore Vc | AtlasOps, LedgerBridge, Gridwise Carbon | Medium |
| Village Global | AtlasOps, ClinIQ, Gridwise Carbon | Medium |
| Theventurecity | AtlasOps, ClinIQ, Gridwise Carbon | Medium |
| Primary Venture Partners | AtlasOps, LedgerBridge | Low |
| Antler | AtlasOps, Gridwise Carbon | Low |
| Tsp Ventures | AtlasOps, LedgerBridge | Low |
| Pretiosum Ventures | AtlasOps, Gridwise Carbon | Low |
| Andreessen Horowitz | Looply, ClinIQ | Low |

### Worldwide Coverage

| Company | UK | Europe | US | Other | Verdict |
| ------- | -: | -----: | -: | ----: | ------- |
| AtlasOps | 3 | 0 | 6 | 1 | true |
| Looply | 1 | 0 | 8 | 1 | true |
| ClinIQ | 0 | 0 | 10 | 0 | false |
| LedgerBridge | 2 | 0 | 8 | 0 | true |
| Gridwise Carbon | 2 | 0 | 6 | 2 | true |

### Relevance Breakdown

| Company | Strong Fit | Partial Fit | Weak Fit | Bad Fit | Unknown |
| ------- | ---------: | ----------: | -------: | ------: | ------: |
| AtlasOps | 9 | 1 | 0 | 0 | 0 |
| Looply | 5 | 5 | 0 | 0 | 0 |
| ClinIQ | 5 | 5 | 0 | 0 | 0 |
| LedgerBridge | 9 | 1 | 0 | 0 | 0 |
| Gridwise Carbon | 6 | 4 | 0 | 0 | 0 |

### Outreach Sequence Review

- AtlasOps: false (all generated sequences inspected)
- Looply: false (all generated sequences inspected)
- ClinIQ: false (all generated sequences inspected)
- LedgerBridge: false (all generated sequences inspected)
- Gridwise Carbon: false (all generated sequences inspected)

## UI Rendering Results

Screenshot directory: docs\qa\artifacts\screenshots

| Screen | Status | Result | Notes |
| --- | --- | --- | --- |
| /dashboard/deck-analyser | 307 | Auth redirect | /login?redirectTo=%2Fdashboard%2Fdeck-analyser |
| /dashboard/financial-model | 307 | Auth redirect | /login?redirectTo=%2Fdashboard%2Ffinancial-model |
| /dashboard/investor-matching | 307 | Auth redirect | /login?redirectTo=%2Fdashboard%2Finvestor-matching |
| /dashboard/billing | 307 | Auth redirect | /login?redirectTo=%2Fdashboard%2Fbilling |
| /dashboard/settings | 307 | Auth redirect | /login?redirectTo=%2Fdashboard%2Fsettings |

Console errors: not captured. Authenticated rendered-state checks and screenshots require a safe test account/session. No production auth/session was created by this script.

## Plan Gates and Limits

| Plan | Expected | Observed | Pass/Fail |
| --- | --- | --- | --- |
| Free | 1 deck upload, second WhatsApp bonus, third paywall, financial/investor locked | Constants and access helpers found; no live account mutation | Partial |
| Starter | Deck + financial unlocked, investor locked | plans.ts/access.ts match expectation | Pass static |
| Pro | Deck + financial + investor unlocked, 35 matches/run, 10 runs/month | plans.ts/v2 sizing match expectation | Pass static |
| Lifetime | 5 deck, 5 financial, 2 investor runs/month, 50 matches/run, no subscription mode | plans.ts matches expectation; UI CTA not auth-tested | Partial |

## Email Results

| Email | Result | Notes |
| --- | --- | --- |
| Welcome | Blocked | No test account created; no email sent. |
| Score ready | Blocked | Deck upload API persistence not run against remote Supabase. |
| Upgrade prompt | Blocked | Requires authenticated free-user paywall flow. |
| Re-engagement cron | Blocked | Would require mutating scheduled email rows. |
| Payment failed | Blocked | Stripe failure lifecycle not run. |
| Subscription paused | Blocked | Stripe failure lifecycle not run. |

## Bugs Found

| ID | Severity | Module | Issue | Steps to Reproduce | Expected | Actual | Suggested Fix |
| -- | -------- | ------ | ----- | ------------------ | -------- | ------ | ------------- |
| QA-001 | P1 | Financial Model | Financial model generation failed for AtlasOps | Run generateFinancialModel for AtlasOps with deck context. | A structured 36-month projection with charts, assumptions, runway, and narrative. | Expected ',' or ']' after array element in JSON at position 53431 (line 21022 column 4) | Check OpenAI financial model credentials/schema and model prompt compatibility. |
| QA-002 | P1 | Investor Matching | AtlasOps outreach sequence quality failed | Inspect outreach sequence length, days, placeholders, company/investor names, and personalization. | Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders. | One or more outreach sequences failed QA checks. | Add server-side outreach validation and regenerate/reject placeholder or generic copy. |
| QA-003 | P1 | Investor Matching | Looply outreach sequence quality failed | Inspect outreach sequence length, days, placeholders, company/investor names, and personalization. | Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders. | One or more outreach sequences failed QA checks. | Add server-side outreach validation and regenerate/reject placeholder or generic copy. |
| QA-004 | P1 | Investor Matching | ClinIQ outreach sequence quality failed | Inspect outreach sequence length, days, placeholders, company/investor names, and personalization. | Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders. | One or more outreach sequences failed QA checks. | Add server-side outreach validation and regenerate/reject placeholder or generic copy. |
| QA-005 | P1 | Investor Matching | LedgerBridge has generic investor fit explanations | Inspect each matchRationale for company sector/stage/traction and investor metadata. | Rationales mention the startup and concrete investor thesis/data. | One or more rationales lacked company-specific or investor-specific evidence. | Require ranker rationale fields to cite one founder detail and one supplied investor detail; reject generic outputs. |
| QA-006 | P1 | Investor Matching | LedgerBridge outreach sequence quality failed | Inspect outreach sequence length, days, placeholders, company/investor names, and personalization. | Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders. | One or more outreach sequences failed QA checks. | Add server-side outreach validation and regenerate/reject placeholder or generic copy. |
| QA-007 | P1 | Investor Matching | Gridwise Carbon has generic investor fit explanations | Inspect each matchRationale for company sector/stage/traction and investor metadata. | Rationales mention the startup and concrete investor thesis/data. | One or more rationales lacked company-specific or investor-specific evidence. | Require ranker rationale fields to cite one founder detail and one supplied investor detail; reject generic outputs. |
| QA-008 | P1 | Investor Matching | Gridwise Carbon outreach sequence quality failed | Inspect outreach sequence length, days, placeholders, company/investor names, and personalization. | Exactly 3 personalized steps: Day 0, Day 5, Day 12; no placeholders. | One or more outreach sequences failed QA checks. | Add server-side outreach validation and regenerate/reject placeholder or generic copy. |
| QA-009 | P1 | Investor Matching | High investor overlap: AtlasOps vs Gridwise Carbon | Compare normalized firm names across company investor lists. | Less than 50% overlap between unrelated companies. | 6 shared firms; 60.0% overlap. | Make discovery filters more sector/stage/geography specific and reduce generic broad-fund dominance. |

## Product Quality Findings

- Generic output issues: Yes, see bugs table.
- Repeated investors: Concern recorded.
- Wrong investor sector/stage/geography: see per-company investor tables and relevance breakdown.
- Weak financial assumptions: see Financial Model Results.
- Missing weighted scoring: weighted scoring exists in code and was checked in artifacts; any failures are in Bugs Found.
- Missing CFO/investor loop: financial prompt includes CFO/investor narrative, but authenticated persisted result/UI loop was not E2E verified.
- Weak outreach: see Outreach Sequence Review and Bugs Found.

## Final Recommendation

**Do not ship**

Direct reasoning: the core quality modules were exercised from real generated PDF fixtures and live model/provider outputs where credentials/network allowed. Authenticated API persistence, paid/free UI rendering, exports, emails, and billing flows remain blocked without an explicit staging/test account because the local environment points at a remote Supabase project with production-capable credentials.

## Raw Artifact Index

- Deck analysis: docs\qa\artifacts\deck-analysis
- Financial models: docs\qa\artifacts\financial-models
- Investor matching: docs\qa\artifacts\investor-matching
- Screenshots: docs\qa\artifacts\screenshots
- Machine-readable summary: docs\qa\RAISEWISE_PRODUCT_QUALITY_SUMMARY.json

## API Smoke Checks

| Endpoint | Status | Expected | Result |
| --- | --- | --- | --- |
| /api/deck/analyse | 401 | 401 unauthenticated | Pass |
| /api/financial-model/generate | 401 | 401 unauthenticated | Pass |
| /api/investors/match | 401 | 401 unauthenticated | Pass |
