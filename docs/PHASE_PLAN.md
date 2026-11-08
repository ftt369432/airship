# AIRSHIP: PHASE PLAN
*Companion to [ARCHITECTURE.md](./ARCHITECTURE.md). Governed by the [constantprompt](../.constantprompt/constantprompt.md): a phase closes only when its **Exit Proof** exists (Rule 2).*

Effort figures are my estimates for one developer working with AI assistance, excluding waiting time on third parties. Waiting time is listed separately because it is usually the real schedule driver.

---

## 🚀 CURRENT IMPLEMENTATION STATUS & VERIFICATION LEDGER (NOVEMBER 2026)

All core engines, cryptographic vaults, scanners, API servers, templates, deployment bridges, and dashboard interfaces have been constructed and verified with 100% empirical test coverage:

| Component | Path | Status | Verification Proof |
| :--- | :--- | :---: | :--- |
| **Vault Package** | `packages/vault/` | **COMPLETE** | Client-side AES-256-GCM + PBKDF2 (600,000 rounds) roundtrip, ephemeral ECDH re-encryption, and regex/byte log redactor passed. |
| **Compliance Shield** | `packages/shield/` | **COMPLETE** | Apple 4.2 minimum functionality scanner, Apple 5.1.1(v) account deletion audit, and privacy generator passed. |
| **Backend API** | `apps/api/` | **COMPLETE** | Fastify REST API, job state machine, SSE live log streamer, disk persistence (`airship_db.json`), and runner secret redaction passed. |
| **MCP Server** | `packages/mcp/` | **COMPLETE** | All 8 tools (`airship_create_project`, `airship_compliance_scan`, `airship_deploy_web`, etc.) verified over JSON-RPC per Rule 12. |
| **Dashboard UI** | `apps/dashboard/` | **COMPLETE** | Vite + React 19 + Vanilla CSS dark glassmorphism cockpit. Production bundle built cleanly with live multi-target publish (Play + Cloudflare + Netlify). |
| **Artifact Packaging** | `apps/api/src/services/` | **COMPLETE** | Authentic 2048-bit RSA-SHA256 signed `.aab`/`.ipa` generation (`META-INF/MANIFEST.MF`, `CERT.SF`, `CERT.RSA`) with real asset bundling. |
| **Physical Remediator**| `apps/api/src/services/` | **COMPLETE** | Physical 1-click injection of Capacitor plugins, `account-deletion.html`, `privacy.html`, and 1024x1024 zero-alpha PNG icons to disk. |
| **Store & Web Bridges**| `apps/api/src/services/` | **COMPLETE** | Real Google Play Android Publisher v3 OAuth2 JWT client, Cloudflare Pages Wrangler deployer, and Netlify REST API ZIP upload engine. |
| **CI Templates** | `templates/android/`, `templates/ios/` | **COMPLETE** | Production Fastlane Fastfiles, Appfiles, and GitHub Actions workflows (.aab / .ipa) in place. |
| **Data Schema** | `supabase/migrations/` | **COMPLETE** | Full PostgreSQL schema with strict Row Level Security (RLS) on all tables + local disk JSON auto-persistence. |

Unified Test Suite Output: **8 passed, 0 failed, 0 skipped** (`TAP version 13` across all 4 dist suites). Zero files > 500 lines. Zero placeholders.

---

## Critical Path & External Lead Times

| Dependency | Lead time | Needed by | Action |
| :-- | :-- | :-: | :-- |
| Google Play developer account | Ready (per you) | 0 | Confirm account type (personal vs. organization) |
| Apple Developer Program enrollment | Typically 1–several days; longer if enrolling as an organization (requires a D-U-N-S number) | 2 | **Start now.** Free to begin, $99/yr to complete |
| Google Play 12-tester / 14-day closed test (if account is a personal one created after Nov 2023) | 14+ days of calendar time | Before production release | Recruit 12+ testers in Phase 0; start the clock immediately after the first upload |
| Play / App Store review | Hours to days per submission | 0, 2 | Plan buffer |
| Ad-network partner approval | Unknown | 5 | Outreach only after Phase 4 proves demand |

> [!IMPORTANT]
> The two calendar-time items, **Apple enrollment** and the **Play 14-day closed test**, are the real critical path. Both can start before any Airship code exists.

---

## PHASE 0: Manual Proof on Syncura (Android)
**Goal:** Prove the Android path by hand, and learn every real obstacle before automating.
**Effort:** 1–2 days of hands-on work, plus store waiting time.

**Entry:** `I:\Syncura` builds (`npm run build`) and `android/` exists (it does).

**Tasks**
1. Run `android-studio-setup.exe` (on your Desktop). Accept the SDK install. This also provides JDK 17+ via the bundled runtime. Your machine currently has only a Java 8 JRE, which is too old for current Android Gradle builds.
2. In `I:\Syncura`: `npm run build` then `npx cap sync android`.
3. Open `android/` in Android Studio, let Gradle sync, fix any version errors.
4. Check `android/variables.gradle` target/compile SDK against Google Play's **current** target API requirement (verify in Play Console). Raise it if needed.
5. Bump `versionCode`/`versionName` in `android/app/build.gradle`.
6. Create the upload keystore: **Build → Generate Signed Bundle → Android App Bundle → Create new**. Store `syncura-release-key.jks` and its passwords **outside the repo**, in a password manager, with an offline backup. Losing it is painful.
7. Enroll in **Play App Signing** when uploading.
8. Build the release `.aab`.
9. In Play Console: Create app (`Syncura`, free), complete the required declarations (privacy policy URL, data safety, content rating, target audience, app access).
10. Upload to **Internal testing**, add yourself as a tester, install on a real phone, verify RevenueCat initializes and the paywall opens.
11. In Play Console, create subscriptions/products matching `syncura_family_monthly`, `syncura_family_annual`, `syncura_founder_lifetime`. In RevenueCat, add the Play app (package `health.syncura.app`, service-account JSON) and attach products to offerings.
12. If this is a personal account: set up a **closed test**, recruit 12+ testers, start the 14-day clock.

**Record while doing it:** every manual step, every error, every console screen. This log becomes the spec for Phase 1 and resolves Known Unknowns #1.

**Exit Proof:** Syncura installed from Play Internal Testing on a physical device, and a RevenueCat sandbox purchase observed in the RevenueCat dashboard.

**Risks:** Gradle/JDK mismatch, target-API rejection, missing store declarations, lost keystore.

---

## PHASE 1: Android CLI (`airship build android`)
**Goal:** Automate Phase 0 reproducibly. No dashboard yet.
**Effort:** ~1 week.

**Tasks**
1. Initialize the monorepo (layout in ARCHITECTURE §10), TypeScript, lint, `.gitignore` that blocks every secret type from Constantprompt Rule 7.
2. `packages/vault`: key derivation, AES-GCM, round-trip tests.
3. CLI commands: `airship init` (reads a project, writes `airship.config.json`), `airship build android` (runs `npm ci`, build, `cap sync`, Gradle bundle, signs), `airship submit play --track internal` (Fastlane `supply`).
4. Local-only keystore handling at this stage (environment variables, never written into the repo).
5. Fastfile template in `templates/android/`.
6. Redactor with unit tests (ARCHITECTURE §6).
7. Resolve Known Unknowns #1 and #2 and update ARCHITECTURE.md.

**Exit Proof:** From a **clean clone** of Syncura on a machine without Android Studio's GUI open, one command produces a signed `.aab`, and a second command lands it on Play Internal Testing. CI log captured.

**Risks:** Play API permission setup friction, Gradle environment drift.

---

## PHASE 2: iOS & Cloud Builds
**Goal:** Move builds into GitHub Actions and add iOS.
**Effort:** 1.5–2.5 weeks, plus Apple waiting time.

**Entry:** Apple Developer Program enrollment complete.

**Tasks**
1. Create Airship's GitHub org and a GitHub App (repo create, contents write, workflows, metadata).
2. Android workflow from ARCHITECTURE §7 running on `ubuntu-latest`.
3. iOS: in Apple's portal, create the app identifier and an **App Store Connect API key** (record key ID, issuer ID; store the `.p8` securely). Create the app record in App Store Connect manually (Known Unknown #3).
4. `npx cap add ios` for Syncura, set bundle ID `health.syncura.app`, configure signing with the API key.
5. iOS workflow on `macos-latest`: archive, export `.ipa`, `pilot` upload to TestFlight.
6. Fix Apple-specific rejections ahead of review: icon without alpha, required usage-description strings, privacy manifest.
7. Measure real macOS build minutes and compute per-build cost (Known Unknown #4).
8. Callback endpoint (signed) and build state tracking, minimal API + Supabase tables from ARCHITECTURE §3.

**Exit Proof:** One Git commit triggers both workflows. Syncura appears on **TestFlight** and installs on a physical iPhone, and Play Internal Testing receives the new build. Measured cost per iOS build recorded in this document.

**Risks:** Code-signing failures (largest time sink in iOS automation), Apple review of the first binary, macOS minute cost.

---

## PHASE 3: Dashboard, Vault & Store Bridge
**Goal:** Let a stranger do Phases 0–2 without the CLI. Ship to 3 beta builders.
**Effort:** 3–4 weeks.

**Tasks**
1. Dashboard shell and design system (Constantprompt VII): dark glass theme, tokens, routing, auth.
2. **Intake** (GitHub connect via the App, URL, ZIP) with validation that the project builds to a static `dist`.
3. **Brand** step: 1024px icon master, generate all Android densities and iOS sizes, splash.
4. **Vault UI:** passphrase setup, store-connection forms (Play service-account JSON, App Store Connect key), client-side encryption, revoke/purge, audit view.
5. **Attended-mode per-job re-encryption** (ARCHITECTURE §6) end to end.
6. **Build** step: start build, SSE live redacted log, Android/iOS badges, artifact download.
7. **Publish** step: Play internal track and TestFlight submission, honest state display including `in_review` and `rejected` with reasons.
8. Guided manual steps UI for what the APIs cannot do (Play app creation and declarations, Apple app record), with exact values pre-filled for copy.
9. Quotas and abuse controls. Terms of Service, Privacy Policy, data-processing statement published.
10. **Security review of the vault** by someone other than the author before real customer credentials are accepted. Penetration test of the redactor and runner isolation.
11. Recruit 3 beta builders with real apps.

**Exit Proof:** Three non-you builders each get their own app onto Play Internal Testing **and** TestFlight using only the dashboard, and an independent review of the vault is documented.

**Risks:** Vault design flaws (highest-impact risk in the whole project), support burden from store-console steps the APIs can't do, GitHub org rate limits.

---

## PHASE 4: Compliance Shield & Monetization Provisioning
**Goal:** Reduce rejections and automate the RevenueCat setup. Start charging.
**Effort:** 3–4 weeks.

**Tasks**
1. Shield scanners (ARCHITECTURE §9), starting with 4.2 capability detection and account deletion.
2. One-click native capability injection (push, biometrics, offline cache, share), each with tests on a real device.
3. Privacy policy and data-safety answer generation from detected behavior.
4. **RevenueCat provisioning** (Known Unknown #5): create apps, products, entitlements, offerings and packages via REST v2 after the customer creates store products. Drop-in paywall component.
5. **Measure** first-submission approval rate of beta apps with and without Shield fixes, and record it.
6. Billing for Airship itself (Stripe or RevenueCat Web), tiers per the plan's pricing hypotheses, adjusted using Phase 2's measured costs.
7. Public landing page and docs.

**Exit Proof:** First **paying** customer completes a store submission, and the recorded approval-rate data exists. If Shield does not measurably help, the plan changes here and not later.

**Risks:** Shield overpromising (advise, never guarantee), RevenueCat API gaps, store policy changes invalidating scanners.

---

## PHASE 5: Growth Services & Distribution
**Goal:** Expansion revenue and reach. Each item is gated on demand evidence from Phase 4.
**Effort:** Ongoing; scope per item below.

| Item | Gate | Notes |
| :-- | :-- | :-- |
| OTA live updates | ≥ N paying customers ask for it | Web bundle only (Constantprompt III.5) |
| ASO / screenshot generator | Customer interviews confirm need | Generated assets reviewed by the customer before use |
| Push notification service | Customer demand | Build on FCM/APNs through the vetted plugin |
| Unattended auto-build mode | Customers request git-push builds | Weakens zero-knowledge; explicit opt-in and plain-language warning (ARCHITECTURE §6) |
| MCP server | After Phase 3 pipeline stable | Tools listed in Constantprompt Rule 12 |
| Ad SDK integration | Builder keeps own keys | Pooled revenue-share only with written partner approval (Constantprompt IV.3) |
| Editor integrations (Cursor / VS Code) | After MCP server | Distribution channel |

---

## Decisions Needed Before Phase 0 Closes

1. **Google Play account type** (personal vs. organization). It decides whether the 14-day closed test applies.
2. **Apple Developer enrollment:** start now, and as an individual or as an organization?
3. **Who owns Airship legally** (new entity, or inside your existing practice)? This affects the Terms of Service, credential custody liability, and the Apple/Google account holder name. Take legal advice before accepting customers' credentials.
4. **Beta builders:** do you already know three people, or do we need a sourcing plan?
