# 🚀 AIRSHIP: MASTER CONSTANTPROMPT
> **The build constitution for Airship, the one-stop platform that takes a web app (URL, GitHub repo, or ZIP) and ships it to Google Play and the Apple App Store with subscriptions, ads, and live updates wired in.**
> These rules are non-negotiable and override all other instructions when working in this project.

---

## 🧭 SECTION I: PRODUCT IDENTITY

- **Name:** Airship
- **Mission:** Collapse the "10-tab problem" (Capacitor setup, Gradle/Xcode, signing, store consoles, RevenueCat, ad SDKs, review rejections) into one guided flow.
- **Proving ground:** Syncura (`health.syncura.app`, `I:\Syncura`). Nothing ships to customers until the same pipeline has shipped Syncura to both stores.
- **Core moat:** integration, a compliance pre-flight, and automatic provisioning of store products into RevenueCat. The wrapper itself is table stakes (Median.co, Natively, Despia and AppMySite already offer one).

---

## ⛔ SECTION II: CARDINAL BUILD RULES (NON-NEGOTIABLE)

### RULE 1: ANTI-PLACEHOLDER MANDATE
**Every function, service, and component MUST do what its name says.**
- No `// TODO`, stub logic, fake success returns, or simulated build/upload results.
- Every pipeline step must call a **real** system: GitHub Actions API, Fastlane, Google Play Developer API, App Store Connect API, RevenueCat REST API, Supabase.
- If a step cannot be implemented yet, it is **not shown in the UI**. No disabled "coming soon" fakes that pretend to work.

### RULE 2: PROVE-IT-WORKS GATE
No feature is complete until verified empirically:
1. **INVOKE** it with a real project (Syncura is the reference fixture).
2. **OBSERVE** the physical effect (an `.aab` artifact exists and is signed, a build appears in Play Console Internal Testing, a product appears in RevenueCat).
3. **CAPTURE** proof (CI run URL, store API response, screenshot).

### RULE 3: MODULARITY (Soft 500 / Hard 800 lines)
Files stay under ~500 lines and never exceed 800. Decompose into `/components`, `/hooks`, `/services`. Page orchestrators wire state only.

### RULE 4: VERTICAL SLICE PATTERN
Build one complete path end to end before widening:
`Button → Zustand store → API route → queue job → CI runner → store API → live status in UI`.
Android-first slice ships and is proven before the iOS slice starts.

### RULE 5: LEAVE NO TRACE
Delete replaced code immediately. Never commit `dist/`, `build/`, `*.log`, `node_modules/`, `.gradle/`, `Pods/`, or debug dumps. Build artifacts live in object storage, never in git.

### RULE 6: CENTRALIZED STATE
Domain-scoped **Zustand** stores: `useProjectStore`, `useBuildStore`, `useStoreConnectionStore`, `useMonetizationStore`, `useAuthStore`. No fragmented Context Providers.

### RULE 7: SECRETS & SIGNING-KEY CUSTODY (ZERO-KNOWLEDGE BY DEFAULT)
Airship will hold other people's most dangerous credentials. Treat this as the trust core of the product.
- **Never commit** keystores (`*.jks`, `*.keystore`), Apple keys (`*.p8`, `*.p12`, `*.mobileprovision`), Google service-account JSON, `.env` files, or RevenueCat secret keys. `.gitignore` enforces this from the first commit.
- Customer credentials are encrypted **client-side** (Web Crypto, AES-256-GCM, Argon2id/PBKDF2-derived key) before upload. The server stores ciphertext it cannot read. Decryption happens only inside an ephemeral, isolated build runner that is destroyed after the job.
- Logs, error reports, and CI output must be **redacted**. Secrets never appear in a log line, URL, or analytics event.
- Every vault access is audit-logged (who, when, which job). Customers can revoke and purge at any time.
- Principle of least privilege: request the narrowest Google service-account role and the narrowest App Store Connect API key role that works.

### RULE 8: AI PAIR-PROGRAMMING DISCIPLINE
Targeted reads (`grep_search`, 50–100 line slices). Surgical edits (`replace_file_content` / `multi_replace_file_content`). Never regenerate whole files for small changes.

### RULE 9: BUILD & VERIFICATION GATE
`npm run build` and `tsc --noEmit` must pass at every milestone. No untyped `any` leaks into main. Pipeline changes must pass a dry run against the Syncura fixture.

### RULE 10: DEPLOYABILITY
`netlify.toml` (`command = "npm run build"`, `publish = "dist"`, SPA rewrite `/* -> /index.html 200`, security headers) and `public/_redirects`. The dashboard is deployable on day one.

### RULE 11: PWA & NATIVE READINESS (APPLIES TO AIRSHIP ITSELF)
`public/manifest.json`, Capacitor config, and a responsive layout. Builders will check their builds from their phones.

### RULE 12: MCP-NATIVE TOOLING
Expose Airship as MCP tools so Cursor, Antigravity, and Claude users can ship from their editor:
`airship_create_project`, `airship_build_android`, `airship_build_ios`, `airship_submit_play`, `airship_submit_testflight`, `airship_provision_revenuecat`, `airship_compliance_scan`.
Each tool has a complete schema, deterministic output, and structured errors.

---

## 🏛️ SECTION III: STORE-POLICY & COMPLIANCE LAWS

These come from Apple and Google, not from us. Violating them gets customers rejected or banned.

1. **Apple Guideline 4.2 (Minimum Functionality):** A thin website wrapper is rejected. The Compliance Shield must verify and inject real native capability (push, biometrics, offline cache, native share, haptics) and warn when an app has none.
2. **Apple 5.1.1(v) and Google Play policy:** Apps with account creation must offer in-app account deletion. Privacy Policy URL and data-safety disclosures are mandatory. Airship generates them from the app's actual behavior and never from boilerplate that contradicts it.
3. **Apple 3.1.1 / Google Play Billing:** Digital goods and subscriptions go through the platform's in-app purchase system (via RevenueCat). Airship must never steer customers around it.
4. **Google Play new personal-account rule:** a personal developer account created after Nov 2023 needs a closed test with 12+ testers for 14 days before production. The flow must track this and remind the customer. Verify current terms in Play Console before shipping this feature.
5. **OTA updates:** Only web-bundle changes. Never change an app's primary purpose through OTA. Native code changes require a store resubmission.
6. **Each customer owns their own developer accounts** (Apple $99/yr, Google $25 one time). Airship never publishes under its own account on a customer's behalf.

---

## 💰 SECTION IV: MONETIZATION RULES

1. **RevenueCat is the subscription layer.** Product IDs follow `<bundleid_suffix>_<plan>` (e.g. `syncura_family_monthly`). Airship provisions them in both stores and attaches them to RevenueCat offerings via the REST API.
2. **Ads (AppLovin MAX / AdMob / LevelPlay):** the builder keeps their **own** publisher account and keys. Airship only integrates the SDK and wiring.
3. **Pooled "master account" ad rev-share is BLOCKED.** It likely violates network terms (publisher identity, `app-ads.txt`). Do not build it unless Airship holds **written approval** from the ad network. Record that approval in `/docs/partner-approvals/` before any code is started.
4. **Airship's own revenue:** SaaS tiers and per-submission fees. Pricing hypotheses are validated with real beta customers before they are hard-coded.

---

## 🏗️ SECTION V: ARCHITECTURE & STACK

| Layer | Decision |
| :--- | :--- |
| Dashboard | Vite + React + TypeScript + Vanilla CSS design system |
| State | Zustand (domain-scoped) |
| API | Node + TypeScript (Fastify). One language end to end. |
| Auth / DB | Supabase (Postgres + RLS, Auth, Storage for artifacts) |
| Build orchestration | GitHub Actions: `ubuntu` runner for `.aab`, `macos` runner for `.ipa`, triggered via the REST API |
| Delivery | Fastlane (`supply` for Google Play, `pilot`/`deliver` for TestFlight) |
| Native shell | Capacitor 7 (the proven Syncura configuration) |
| Secrets | Client-side encryption + ephemeral runner decryption (Rule 7) |
| Our billing | RevenueCat Web / Stripe |

**Domain map**
```
src/features/
  intake/        URL, GitHub, ZIP ingestion and validation
  branding/      icon (1024px master), splash, bundle ID, per-density asset generation
  compliance/    Shield: 4.2 scan, privacy/ToS/account-deletion generators, store-readiness score
  builds/        queue, live logs, artifact registry (Android + iOS)
  stores/        Play + App Store Connect connections, metadata and screenshot push
  monetization/  RevenueCat provisioning, paywall components, ad SDK wiring
  growth/        OTA channels, ASO, push (post-MVP)
  vault/         encrypted credential custody (Rule 7)
```

---

## 🛣️ SECTION VI: PHASE GATES

A phase is closed only when its Proof exists (Rule 2). No skipping ahead.

| Phase | Deliverable | Proof |
| :-: | :--- | :--- |
| 0 | Signed Syncura `.aab` built by hand | Syncura live on Play Internal Testing |
| 1 | `airship build android` CLI automates Phase 0 | Reproducible build from a clean checkout |
| 2 | iOS via GitHub Actions macOS runner + Fastlane | Syncura on TestFlight |
| 3 | Dashboard + vault + Store Bridge | 3 beta builders ship their own apps |
| 4 | Compliance Shield + RevenueCat auto-provisioning | First paying customers |
| 5 | OTA + ASO + push; ads only with partner approval (Section IV.3) | Expansion revenue |

---

## 🎨 SECTION VII: AESTHETIC & UX ENGINE

A functioning app with a generic UI is considered broken.
1. **Look:** dark mode, glassmorphism, tailored HSL tokens, Inter/Outfit/Geist typography, smooth gradients.
2. **Flow:** one project page with a 5-step wizard (Source → Brand → Compliance → Build → Publish). Status is live, with Android and iOS badges and a streaming build log.
3. **Empty states are actionable:** a "ship the sample app" launcher and a drag-and-drop zone.
4. **Micro-animations:** hover feedback, progress pulses on running builds, success confetti only on a verified store upload.
5. **Transparency HUD:** collapsible reasoning for any AI-driven compliance fix, so the builder sees exactly what changed and why.
6. **Honesty in UI:** never show "Published" until the store API confirms it. Show "In review" and "Rejected: reason" faithfully.

---

## 📏 SECTION VIII: DEFINITION OF DONE

A feature ships only when **all** are true:
- [ ] Real implementation, no placeholders (Rule 1)
- [ ] Proven against the Syncura fixture with captured proof (Rule 2)
- [ ] Files within size limits (Rule 3)
- [ ] `npm run build` and `tsc --noEmit` pass (Rule 9)
- [ ] No secrets in code, logs, or git (Rule 7)
- [ ] Store-policy impact checked against Section III
- [ ] Old code deleted (Rule 5)
