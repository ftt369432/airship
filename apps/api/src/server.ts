import fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import type { Project, Build, BuildEvent, StoreConnection } from './types.js';
import { BuildStateMachine } from './state_machine.js';
import { redactLog } from '../../../packages/vault/dist/index.js';
import { runComplianceScan } from '../../../packages/shield/dist/index.js';
import { inspectProjectSource, gatherScanPayload } from './services/projectInspector.js';
import { generateSignedArtifactBuffer } from './services/artifactGenerator.js';
import { executeBuildWorkflow } from './services/buildRunner.js';
import { deployWebTarget } from './services/webDeployer.js';
import { publishToStore } from './services/storePublisher.js';
import { remediateComplianceFinding, saveBrandIconToDisk } from './services/complianceRemediator.js';
import { PersistentStore } from './services/persistenceStore.js';

export function buildServer() {
  const app = fastify({ logger: false });

  app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Persistent Disk + Optional Supabase Repository
  const store = new PersistentStore();
  const { projects, storeConnections, builds, buildEvents, complianceReports, submissions, webDeployments } = store;

  // Event stream listeners for SSE: buildId -> Set of callback listeners
  const sseClients = new Map<string, Set<(event: string) => void>>();

  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'Airship API & Automation Engine',
    persistence: 'disk_json_active',
    timestamp: new Date().toISOString()
  }));

  // 1. Projects: Inspect & Auto-Detect (Git, URL, or local path)
  app.post('/api/projects/inspect', async (request, reply) => {
    const InspectSchema = z.object({ sourceType: z.enum(['url', 'github', 'zip']), sourceRef: z.string().min(1) });
    const parsed = InspectSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    return reply.send(await inspectProjectSource(parsed.data.sourceType, parsed.data.sourceRef));
  });

  // 1. Projects: Create
  app.post('/api/projects', async (request, reply) => {
    const ProjectSchema = z.object({
      name: z.string().min(1),
      bundleId: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i, 'Invalid bundle ID format'),
      sourceType: z.enum(['url', 'github', 'zip']),
      sourceRef: z.string().min(1),
      webDir: z.string().default('dist')
    });
    const parsed = ProjectSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const project: Project = {
      id: projectId,
      ownerId: 'usr_default',
      name: parsed.data.name,
      bundleId: parsed.data.bundleId,
      sourceType: parsed.data.sourceType,
      sourceRef: parsed.data.sourceRef,
      webDir: parsed.data.webDir,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    projects.set(projectId, project);
    store.saveToDisk();
    void store.syncTableToSupabase('projects', project as unknown as Record<string, unknown>);
    return reply.status(201).send(project);
  });

  app.get('/api/projects', async () => Array.from(projects.values()));

  app.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return {
      project,
      builds: Array.from(builds.values()).filter(b => b.projectId === id),
      compliance: complianceReports.get(id) || null
    };
  });

  app.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!projects.delete(id)) return reply.status(404).send({ error: 'Project not found' });
    store.saveToDisk();
    return reply.send({ success: true, deletedId: id });
  });

  // 2. Brand: Save 1024x1024 Zero-Alpha PNG Icon to Disk
  app.post('/api/projects/:id/brand', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    const parsed = z.object({ iconDataUrl: z.string().min(10) }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    return reply.send({ success: true, ...saveBrandIconToDisk(project, parsed.data.iconDataUrl) });
  });

  // 2. Compliance: Trigger Shield Scan & Remediation
  app.post('/api/projects/:id/compliance/scan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    const { packageJson, files, fileContents } = gatherScanPayload(project.sourceRef, project.id);
    const report = await runComplianceScan({ projectPath: project.sourceRef, files, packageJson, fileContents });
    complianceReports.set(id, report);
    store.saveToDisk();
    return reply.send(report);
  });

  app.post('/api/projects/:id/compliance/remediate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    const parsed = z.object({ findingId: z.string().default('all') }).safeParse(request.body);
    const { report, remediatedFiles } = await remediateComplianceFinding(project, parsed.success ? parsed.data.findingId : 'all');
    complianceReports.set(id, report);
    store.saveToDisk();
    return reply.send({ ...report, remediatedFiles });
  });

  // 3. Vault: Save store connection (Encrypted ciphertext only)
  app.post('/api/store-connections', async (request, reply) => {
    const ConnectionSchema = z.object({
      store: z.enum(['play', 'apple', 'revenuecat', 'cloudflare', 'netlify']),
      label: z.string().min(1),
      ciphertext: z.string().min(1),
      iv: z.string().optional(),
      wrappedDek: z.string().min(1),
      kdfParams: z.record(z.unknown())
    });

    const parsed = ConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const connectionId = `conn_${Date.now()}`;
    const connection: StoreConnection = {
      id: connectionId,
      ownerId: 'usr_default',
      store: parsed.data.store,
      label: parsed.data.label,
      ciphertext: parsed.data.ciphertext,
      iv: parsed.data.iv,
      wrappedDek: parsed.data.wrappedDek,
      kdfParams: parsed.data.kdfParams,
      createdAt: new Date().toISOString()
    };

    storeConnections.set(connectionId, connection);
    store.saveToDisk();
    void store.syncTableToSupabase('store_connections', connection as unknown as Record<string, unknown>);

    return reply.status(201).send({
      id: connection.id,
      store: connection.store,
      label: connection.label,
      createdAt: connection.createdAt
    });
  });

  // 3. Vault: List connections (Metadata only — ciphertext never leaked in list)
  app.get('/api/store-connections', async () =>
    Array.from(storeConnections.values())
      .filter(c => !c.revokedAt)
      .map(c => ({
        id: c.id,
        store: c.store,
        label: c.label,
        createdAt: c.createdAt
      }))
  );

  // 3. Vault: Retrieve Encrypted Envelope for Client-Side Browser Decryption
  app.get('/api/store-connections/:id/envelope', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connection = storeConnections.get(id);
    if (!connection || connection.revokedAt) {
      return reply.status(404).send({ error: 'Encrypted envelope not found' });
    }
    return reply.send({
      id: connection.id,
      store: connection.store,
      label: connection.label,
      ciphertext: connection.ciphertext,
      iv: connection.iv || (connection.kdfParams?.iv as string) || '',
      wrappedDek: connection.wrappedDek,
      kdfParams: connection.kdfParams,
      createdAt: connection.createdAt,
      version: 1
    });
  });

  // 3. Vault: Revoke / purge
  app.delete('/api/store-connections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connection = storeConnections.get(id);
    if (!connection) return reply.status(404).send({ error: 'Connection not found' });

    connection.revokedAt = new Date().toISOString();
    store.saveToDisk();
    return reply.send({ success: true, purgedId: id });
  });

  // 4. Builds: Dispatch Build Job
  app.post('/api/projects/:id/builds', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const BuildSchema = z.object({
      platform: z.enum(['android', 'ios']),
      versionName: z.string().default('1.0.0'),
      versionCode: z.number().int().default(1),
      track: z.enum(['internal', 'closed', 'production', 'testflight']).default('internal')
    });

    const parsed = BuildSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const buildId = `bld_${Date.now()}`;
    const newBuild: Build = {
      id: buildId,
      projectId: id,
      platform: parsed.data.platform,
      versionName: parsed.data.versionName,
      versionCode: parsed.data.versionCode,
      state: 'queued',
      startedAt: new Date().toISOString()
    };

    builds.set(buildId, newBuild);
    buildEvents.set(buildId, [
      {
        id: 1,
        buildId,
        ts: new Date().toISOString(),
        level: 'step',
        message: `Build queued for ${parsed.data.platform.toUpperCase()} (${parsed.data.versionName}#${parsed.data.versionCode})`
      }
    ]);
    project.status = 'building';
    store.saveToDisk();

    const emitEvent = (level: 'info' | 'warn' | 'error' | 'step', rawMessage: string, transitionTo?: any) => {
      const cleanMessage = redactLog(rawMessage);
      const events = buildEvents.get(buildId) || [];
      const eventObj: BuildEvent = {
        id: events.length + 1,
        buildId,
        ts: new Date().toISOString(),
        level,
        message: cleanMessage
      };
      events.push(eventObj);
      buildEvents.set(buildId, events);

      if (transitionTo) {
        const b = builds.get(buildId);
        if (b && b.state !== transitionTo) {
          try {
            builds.set(buildId, BuildStateMachine.transition(b, transitionTo));
          } catch (e) {
            console.error('[StateMachine] Transition error:', e);
          }
        }
      }
      store.saveToDisk();

      const listeners = sseClients.get(buildId);
      if (listeners) {
        const payload = JSON.stringify(eventObj);
        listeners.forEach(fn => fn(payload));
      }
    };

    executeBuildWorkflow({
      project,
      build: newBuild,
      platform: parsed.data.platform,
      versionName: parsed.data.versionName,
      versionCode: parsed.data.versionCode,
      track: parsed.data.track,
      emitEvent,
      onArtifactReady: (artifactPath, sha256) => {
        const currentBuild = builds.get(buildId);
        if (currentBuild) {
          currentBuild.artifactPath = artifactPath;
          currentBuild.sha256 = sha256;
          store.saveToDisk();
        }
      },
      onComplete: () => {
        project.status = 'live';
        store.saveToDisk();
      }
    });

    return reply.status(201).send(newBuild);
  });

  // 4. Builds: Live SSE Streaming Redacted Logs
  app.get('/api/builds/:id/stream', (request, reply) => {
    const { id } = request.params as { id: string };
    if (!builds.has(id)) return reply.status(404).send({ error: 'Build not found' });

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    for (const evt of buildEvents.get(id) || []) {
      reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
    }

    const clientListener = (eventData: string) => reply.raw.write(`data: ${eventData}\n\n`);
    if (!sseClients.has(id)) sseClients.set(id, new Set());
    sseClients.get(id)!.add(clientListener);

    request.raw.on('close', () => {
      sseClients.get(id)?.delete(clientListener);
    });

    return reply;
  });

  // 4. Builds: Ingest Event from Runner with Redaction
  app.post('/api/builds/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const build = builds.get(id);
    if (!build) return reply.status(404).send({ error: 'Build not found' });

    const EventSchema = z.object({
      level: z.enum(['info', 'warn', 'error', 'step']),
      message: z.string(),
      transitionTo: z.string().optional()
    });
    const parsed = EventSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });

    const cleanMessage = redactLog(parsed.data.message);
    const events = buildEvents.get(id) || [];
    const eventObj: BuildEvent = {
      id: events.length + 1,
      buildId: id,
      ts: new Date().toISOString(),
      level: parsed.data.level,
      message: cleanMessage
    };
    events.push(eventObj);
    buildEvents.set(id, events);

    if (parsed.data.transitionTo) {
      try {
        builds.set(id, BuildStateMachine.transition(build, parsed.data.transitionTo as any));
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
    store.saveToDisk();

    const listeners = sseClients.get(id);
    if (listeners) {
      const payload = JSON.stringify(eventObj);
      listeners.forEach(fn => fn(payload));
    }

    return reply.status(201).send(eventObj);
  });

  // 5. Publish: Google Play Android Publisher v3 API / App Store Connect Deployment
  app.post('/api/projects/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const PublishSchema = z.object({
      track: z.enum(['internal', 'closed', 'production', 'testflight']).default('internal'),
      connectionId: z.string().optional(),
      credentialSecret: z.string().optional()
    });
    const parsed = PublishSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const submission = await publishToStore({
      project,
      track: parsed.data.track,
      connectionId: parsed.data.connectionId,
      credentialSecret: parsed.data.credentialSecret
    });

    submissions.set(submission.id, submission);
    project.status = 'live';
    store.saveToDisk();
    return reply.status(200).send(submission);
  });

  // 6. Web Deploy: Direct Launch to Cloudflare Pages or Netlify
  app.post('/api/projects/:id/deploy-web', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = projects.get(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const WebSchema = z.object({
      provider: z.enum(['cloudflare', 'netlify']).default('cloudflare'),
      siteName: z.string().optional(),
      connectionId: z.string().optional(),
      credentialSecret: z.string().optional()
    });
    const parsed = WebSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const result = await deployWebTarget({
      project,
      provider: parsed.data.provider,
      siteName: parsed.data.siteName,
      connectionId: parsed.data.connectionId,
      credentialSecret: parsed.data.credentialSecret
    });

    webDeployments.set(result.id, result);
    project.status = 'live';
    store.saveToDisk();
    return reply.status(200).send(result);
  });

  // 7. Artifacts: Serve / Download Real Signed AAB / IPA / Web ZIP Package
  const handleArtifactDownload = async (request: any, reply: any) => {
    const { filename } = request.params as { filename: string };
    const { buffer, cleanFilename } = generateSignedArtifactBuffer(filename);

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    reply.header('Content-Length', buffer.length);
    return reply.send(buffer);
  };

  app.get('/artifacts/:filename', handleArtifactDownload);
  app.get('/api/artifacts/:filename', handleArtifactDownload);

  return app;
}

if (process.argv[1]?.endsWith('server.js')) {
  const server = buildServer();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`🚀 Airship API running at ${address}`);
  });
}
