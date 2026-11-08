-- ========================================================================
-- AIRSHIP DATABASE SCHEMA (SUPABASE POSTGRESQL + ROW LEVEL SECURITY)
-- Governed by ARCHITECTURE.md §3 and constantprompt.md Rule 7
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bundle_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('url', 'github', 'zip')),
    source_ref TEXT NOT NULL,
    web_dir TEXT NOT NULL DEFAULT 'dist',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'configured', 'building', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Brand Assets
CREATE TABLE IF NOT EXISTS public.brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('icon', 'splash', 'screenshot')),
    storage_path TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Store Connections (Zero-Knowledge Ciphertext Only)
CREATE TABLE IF NOT EXISTS public.store_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store TEXT NOT NULL CHECK (store IN ('play', 'apple', 'revenuecat')),
    label TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    wrapped_dek TEXT NOT NULL,
    kdf_params JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- 4. Builds Table & State Machine
CREATE TABLE IF NOT EXISTS public.builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
    version_name TEXT NOT NULL,
    version_code INT NOT NULL,
    state TEXT NOT NULL DEFAULT 'queued' CHECK (
        state IN ('queued', 'preparing', 'building', 'signing', 'uploading', 'submitted', 'in_review', 'live', 'failed', 'rejected')
    ),
    gh_run_id BIGINT,
    artifact_path TEXT,
    sha256 TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_code TEXT,
    UNIQUE(project_id, platform, version_code)
);

-- 5. Redacted Build Events (Streaming Logs)
CREATE TABLE IF NOT EXISTS public.build_events (
    id BIGSERIAL PRIMARY KEY,
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'step')),
    message TEXT NOT NULL
);

-- 6. Store Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    store TEXT NOT NULL CHECK (store IN ('google_play', 'app_store')),
    track TEXT NOT NULL CHECK (track IN ('internal', 'closed', 'production', 'testflight')),
    state TEXT NOT NULL DEFAULT 'queued' CHECK (
        state IN ('queued', 'uploaded', 'in_review', 'live', 'rejected', 'failed')
    ),
    store_ref TEXT,
    reject_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Compliance Reports
CREATE TABLE IF NOT EXISTS public.compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    findings JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Monetization State
CREATE TABLE IF NOT EXISTS public.monetization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    rc_project_id TEXT,
    products JSONB DEFAULT '[]'::jsonb,
    ads_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Vault Audit Trail (Append-Only)
CREATE TABLE IF NOT EXISTS public.vault_audit (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    connection_id UUID NOT NULL REFERENCES public.store_connections(id),
    build_id UUID REFERENCES public.builds(id),
    action TEXT NOT NULL CHECK (action IN ('create', 'access', 'revoke', 'purge')),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================================
-- INDEXES FOR PERFORMANCE & HIGH FREQUENCY SSE POLLING
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_connections_owner ON public.store_connections(owner_id);
CREATE INDEX IF NOT EXISTS idx_builds_project ON public.builds(project_id);
CREATE INDEX IF NOT EXISTS idx_build_events_build ON public.build_events(build_id, ts);
CREATE INDEX IF NOT EXISTS idx_submissions_build ON public.submissions(build_id);
CREATE INDEX IF NOT EXISTS idx_compliance_project ON public.compliance_reports(project_id);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users only read and mutate their own resources
-- ========================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_audit ENABLE ROW LEVEL SECURITY;

-- Projects RLS
CREATE POLICY "Users can manage own projects"
ON public.projects FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Brand Assets RLS
CREATE POLICY "Users can manage brand assets for own projects"
ON public.brand_assets FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = brand_assets.project_id AND projects.owner_id = auth.uid()));

-- Store Connections RLS
CREATE POLICY "Users can manage own store connections"
ON public.store_connections FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Builds RLS
CREATE POLICY "Users can view builds for own projects"
ON public.builds FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = builds.project_id AND projects.owner_id = auth.uid()));

-- Build Events RLS
CREATE POLICY "Users can view build events for own projects"
ON public.build_events FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.builds
    JOIN public.projects ON projects.id = builds.project_id
    WHERE builds.id = build_events.build_id AND projects.owner_id = auth.uid()
));

-- Submissions RLS
CREATE POLICY "Users can view submissions for own projects"
ON public.submissions FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.builds
    JOIN public.projects ON projects.id = builds.project_id
    WHERE builds.id = submissions.build_id AND projects.owner_id = auth.uid()
));

-- Compliance Reports RLS
CREATE POLICY "Users can view compliance reports for own projects"
ON public.compliance_reports FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = compliance_reports.project_id AND projects.owner_id = auth.uid()));

-- Monetization RLS
CREATE POLICY "Users can manage monetization for own projects"
ON public.monetization FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = monetization.project_id AND projects.owner_id = auth.uid()));

-- Vault Audit RLS (Append and read only for owner)
CREATE POLICY "Users can read own vault audit trail"
ON public.vault_audit FOR SELECT
USING (auth.uid() = owner_id);
