# 🚀 Airship: Autonomous Web-to-App Deployment Engine

> **The unified platform that transforms a web app (URL, GitHub repo, or ZIP) into production-ready Google Play and Apple App Store packages with zero-knowledge vault security, compliance pre-flight checks, and live telemetry.**
> Governed strictly by the [constantprompt.md](.constantprompt/constantprompt.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🧭 Executive Overview

Airship collapses the traditional "10-tab problem" of mobile application packaging:
1. **Intake:** Ingests any web app (Vite, Next.js static, React, Vue, HTML5).
2. **Branding:** Uploads one 1024x1024 master icon; automatically strips illegal iOS alpha transparency channels and renders Android mipmap densities (`xxxhdpi` to `mdpi`) and iOS variants.
3. **Compliance Shield:** Executes static audits against Apple Guideline 4.2 (minimum native functionality), Apple 5.1.1(v) & Google Play mandatory in-app account deletion, and custom privacy policy disclosures.
4. **Cloud Build:** Provisions Capacitor 7 runtime, triggers Fastlane compilation (`./gradlew bundleRelease` / `xcodebuild`), and monitors real-time streaming logs through a strict secret-redacting telemetry pipeline.
5. **Universal Launch Bridge:** Pushes signed `.aab` bundles directly to Google Play Internal Testing, `.ipa` archives to Apple TestFlight, and static SPA bundles to **Cloudflare Pages (`pages.dev`)** and **Netlify (`netlify.app`)** global edge CDNs with zero-knowledge credential custody.

---

## 🏗️ Architecture & Monorepo Topology

```
i:\.genieflowai.brain\03_APPS\airship\
├── .constantprompt/
│   └── constantprompt.md              # Immutable product constitution
├── docs/
│   ├── ARCHITECTURE.md                 # System architecture specification
│   └── PHASE_PLAN.md                   # Milestone execution & proof ledger
├── packages/
│   ├── vault/                          # Zero-knowledge AES-256-GCM + PBKDF2 + Log Redactor
│   ├── shield/                         # Compliance engine (Apple 4.2, account deletion, privacy)
│   └── mcp/                            # Model Context Protocol server (7 tools per Rule 12)
├── apps/
│   ├── api/                            # Node.js + Fastify + SSE Live Telemetry Stream
│   └── dashboard/                      # Vite + React 19 + Vanilla CSS Dark Glassmorphism Cockpit
├── templates/
│   ├── android/                        # Fastlane Fastfile + Appfile + android-build.yml
│   └── ios/                            # Fastlane Fastfile + Appfile + ios-build.yml
└── supabase/
    └── migrations/                     # Complete PostgreSQL schema with Row Level Security (RLS)
```

---

## 🔒 Security Core (Rule 7: Zero-Knowledge Vault)

Airship implements client-side encryption so customer credentials never touch persistent servers in plaintext:
* **Key Derivation (KEK):** Derived client-side via PBKDF2 (600,000 iterations, 16-byte random salt, SHA-256).
* **Data Encryption (DEK):** Random 256-bit AES-GCM key per store connection.
* **Ephemeral Runner Envelope:** When an attended build executes, the ephemeral runner generates a one-time ECDH keypair; the browser re-encrypts the credential directly to the runner's public key.
* **Log Redaction:** All build output passes through `LogRedactor` (regex pattern scrubbing + dynamic secret byte scrubbing) before writing to the database or streaming via SSE.

---

## 🧪 Verification & Empirical Test Results

All test suites run natively via Node's test runner across all modules:

```bash
# Run unified verification across all packages
node --test packages/vault/dist/vault.test.js packages/shield/dist/shield.test.js packages/mcp/dist/mcp.test.js apps/api/dist/api.test.js
```

### Verified Test Ledger:
```
TAP version 13
# Subtest: API: Full autonomous deployment pipeline workflow
ok 1 - API: Full autonomous deployment pipeline workflow
# Subtest: MCP: Lists all 8 core tools per Rule 12
ok 2 - MCP: Lists all 8 core tools per Rule 12
# Subtest: MCP: Dispatches airship_create_project, airship_compliance_scan, and airship_deploy_web
ok 3 - MCP: Dispatches airship_create_project, airship_compliance_scan, and airship_deploy_web
# Subtest: Shield: Scans bare web project and detects critical store blockers
ok 4 - Shield: Scans bare web project and detects critical store blockers
# Subtest: Shield: Scans fully equipped native app and awards 100% store readiness
ok 5 - Shield: Scans fully equipped native app and awards 100% store readiness
# Subtest: Vault: Client-side credential encryption and unlocking
ok 6 - Vault: Client-side credential encryption and unlocking
# Subtest: Vault: Ephemeral runner envelope re-encryption
ok 7 - Vault: Ephemeral runner envelope re-encryption
# Subtest: Redactor: Scans and replaces sensitive secrets
ok 8 - Redactor: Scans and replaces sensitive secrets
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# duration_ms 4288.1542
```

---

## 💻 Running the Systems Locally

### 1. Fastify Backend API
```bash
npm run dev:api
# Or directly:
node apps/api/dist/server.js
# Runs at http://localhost:4000
```

### 2. Dashboard Cockpit (Vite + React)
```bash
npm run dev:dashboard
# Runs at http://localhost:5173
```

### 3. Production Builds & Verification Gate
```bash
# Compile all 5 packages/apps in one shot
npm run build

# Run full unified test suite
npm test
```

### 4. MCP Server (IDE Integration)
```bash
node packages/mcp/dist/server.js
# Exposes JSON-RPC stdio protocol (8 tools per Rule 12) for Antigravity, Cursor, and Claude
```

---

## ⚡ Deployment Channels & Live API Execution
* **Mobile Stores:** Direct Google Play Android Publisher v3 REST API upload & track assignment (Internal, Closed/Alpha, Production) via RSA-signed Service Account OAuth2 JWT tokens; App Store Connect JWT staging.
* **Web Edge CDNs:** Direct Cloudflare Pages (`pages.dev`) deployment via Wrangler CLI and Netlify (`netlify.app`) atomic zip API deployments with SPA rewrite support (`/* -> /index.html 200`).
* **Zero-Simulation Guarantee:** Real disk persistence (`apps/api/data/airship_db.json`), physical compliance code/HTML injection (`apps/api/src/services/complianceRemediator.ts`), 2048-bit RSA-SHA256 manifest packaging (`apps/api/src/services/artifactGenerator.ts`), and client-side Web Crypto PBKDF2 (600,000 rounds) vault decryption.

---

## 📜 Compliance & Definition of Done
* [x] **Zero Placeholders:** 100% functional implementations. Zero `TODO` or stub methods (Rule 1).
* [x] **Empirical Proof:** All 8 test suites pass clean (Rule 2).
* [x] **Modularity Enforced:** All files remain strictly under 500 lines (Rule 3).
* [x] **Zero Secrets in Git:** Strict `.gitignore` blocking `.p8`, `.jks`, `service_account.json` (Rule 7).
* [x] **Honesty in UI:** Never reports "Published" until store API confirms live release (Rule VII.6).
* [x] **Deployability:** Complete Netlify configuration and security headers in place (Rule 10).
