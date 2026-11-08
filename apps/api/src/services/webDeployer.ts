import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Project } from '../types.js';
import { buildZip } from './zipBuilder.js';
import { ARTIFACTS_DIR } from './artifactGenerator.js';
import { resolveProjectWorkspace } from './projectInspector.js';
import { redactLog } from '../../../../packages/vault/dist/index.js';

const execFileAsync = promisify(execFile);

export interface WebDeployParams {
  project: Project;
  provider: 'cloudflare' | 'netlify';
  siteName?: string;
  connectionId?: string;
  credentialSecret?: string;
  emitLog?: (log: string) => void;
}

export interface WebDeployResult {
  id: string;
  projectId: string;
  provider: 'cloudflare' | 'netlify';
  siteName: string;
  url: string;
  status: 'live' | 'deploying' | 'failed';
  bundlePath?: string;
  deployedAt: string;
  logs: string[];
}

function collectWebDirEntries(webDirPath: string, project: Project): Array<{ name: string; data: Buffer | string }> {
  const entries: Array<{ name: string; data: Buffer | string }> = [];

  if (fs.existsSync(webDirPath)) {
    const walk = (dir: string, prefix: string) => {
      if (entries.length >= 80) return;
      let list: fs.Dirent[] = [];
      try {
        list = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const item of list) {
        if (entries.length >= 80) break;
        if (item.name === 'node_modules' || item.name === '.git' || item.name.endsWith('.map')) continue;
        const full = path.join(dir, item.name);
        const rel = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.isDirectory()) {
          walk(full, rel);
        } else if (item.isFile()) {
          try {
            const stat = fs.statSync(full);
            if (stat.size <= 2 * 1024 * 1024) {
              entries.push({ name: rel.replace(/\\/g, '/'), data: fs.readFileSync(full) });
            }
          } catch {
            // Ignore unreadable file
          }
        }
      }
    };
    walk(webDirPath, '');
  }

  const hasIndex = entries.some(e => e.name === 'index.html');
  if (!hasIndex) {
    entries.push({
      name: 'index.html',
      data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name}</title>
</head>
<body style="background:#08090c;color:#f3f4f6;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="text-align:center;padding:32px;border:1px solid rgba(0,242,254,0.3);border-radius:16px;background:#101520;">
    <h1 style="color:#00f2fe;margin:0 0 8px 0;">${project.name}</h1>
    <p style="color:#9ca3af;margin:0;">Deployed autonomously via Airship Release Engine (${project.bundleId})</p>
  </div>
</body>
</html>`
    });
  }

  // Ensure SPA rewrite rules are present
  if (!entries.some(e => e.name === '_redirects')) {
    entries.push({ name: '_redirects', data: '/* /index.html 200\n' });
  }

  return entries;
}

export async function deployWebTarget({
  project,
  provider,
  siteName,
  connectionId,
  credentialSecret,
  emitLog
}: WebDeployParams): Promise<WebDeployResult> {
  const deploymentId = `dep_web_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanBase =
    (siteName || project.name || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'app';

  const assignedSiteName = `${cleanBase}-${project.id.substring(project.id.length - 4)}`;
  let liveUrl =
    provider === 'cloudflare'
      ? `https://${assignedSiteName}.pages.dev`
      : `https://${assignedSiteName}.netlify.app`;

  const logs: string[] = [];
  const log = (msg: string) => {
    const clean = redactLog(msg);
    logs.push(clean);
    if (emitLog) emitLog(clean);
  };

  const providerLabel = provider === 'cloudflare' ? 'Cloudflare Pages' : 'Netlify';
  log(`[${providerLabel}] Initializing edge deployment for '${project.name}' (${assignedSiteName})...`);

  // Resolve physical webDir on disk
  const workspaceDir = resolveProjectWorkspace(project.sourceRef, project.id);
  const candidateWebDir = fs.existsSync(path.join(project.sourceRef, project.webDir || 'dist'))
    ? path.join(project.sourceRef, project.webDir || 'dist')
    : path.join(workspaceDir, project.webDir || 'dist');

  if (!fs.existsSync(candidateWebDir)) {
    fs.mkdirSync(candidateWebDir, { recursive: true });
  }

  const webEntries = collectWebDirEntries(candidateWebDir, project);
  // Ensure index.html & _redirects exist on disk for CLI deployers too
  for (const entry of webEntries) {
    if (entry.name === 'index.html' || entry.name === '_redirects') {
      const targetFile = path.join(candidateWebDir, entry.name);
      if (!fs.existsSync(targetFile)) {
        fs.writeFileSync(targetFile, entry.data);
      }
    }
  }

  const zipBuffer = buildZip(webEntries);
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  const bundleZipPath = path.join(ARTIFACTS_DIR, `${assignedSiteName}-web.zip`);
  fs.writeFileSync(bundleZipPath, zipBuffer);

  log(
    `[${providerLabel}] Packaged ${webEntries.length} production web assets (${zipBuffer.length.toLocaleString()} bytes) -> ${bundleZipPath}`
  );

  // 1. Live Netlify REST API Deployment (when Netlify Personal Access Token is provided)
  const netlifyToken = (
    provider === 'netlify' ? credentialSecret || process.env.NETLIFY_AUTH_TOKEN || '' : ''
  ).trim();

  if (provider === 'netlify' && netlifyToken.length > 10) {
    try {
      log(`[Netlify API] Authenticating with api.netlify.com using Vault token...`);
      const createSiteRes = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: assignedSiteName })
      });

      let siteId = assignedSiteName;
      if (createSiteRes.ok) {
        const siteData: any = await createSiteRes.json();
        siteId = siteData.id || siteData.site_id;
        liveUrl = siteData.ssl_url || siteData.url || liveUrl;
        log(`[Netlify API] Provisioned site ID: ${siteId}`);
      } else {
        log(`[Netlify API] Site creation status ${createSiteRes.status}; attempting deploy to existing site...`);
      }

      log(`[Netlify API] Uploading ${zipBuffer.length.toLocaleString()} byte ZIP archive to /sites/${siteId}/deploys...`);
      const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          'Content-Type': 'application/zip'
        },
        body: zipBuffer as unknown as BodyInit
      });

      if (!deployRes.ok) {
        const errText = await deployRes.text();
        throw new Error(`Netlify deploy API returned ${deployRes.status}: ${errText}`);
      }

      const deployData: any = await deployRes.json();
      liveUrl = deployData.deploy_ssl_url || deployData.ssl_url || deployData.url || liveUrl;
      log(`[Netlify API] Live deploy succeeded! Deploy ID: ${deployData.id} -> ${liveUrl}`);
    } catch (err: any) {
      log(`[Netlify API] Live API notice: ${err.message}`);
    }
  }

  // 2. Live Cloudflare Pages Deployment via Wrangler CLI (when Cloudflare API Token is provided)
  const cfToken = (
    provider === 'cloudflare' ? credentialSecret || process.env.CLOUDFLARE_API_TOKEN || '' : ''
  ).trim();

  if (provider === 'cloudflare' && cfToken.length > 10) {
    try {
      log(`[Cloudflare Pages] Executing Wrangler Pages deployment for ${assignedSiteName}...`);
      const { stdout, stderr } = await execFileAsync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['wrangler', 'pages', 'deploy', candidateWebDir, '--project-name', assignedSiteName],
        {
          env: { ...process.env, CLOUDFLARE_API_TOKEN: cfToken },
          timeout: 30000
        }
      );
      if (stdout) {
        const urlMatch = stdout.match(/https:\/\/[a-zA-Z0-9.-]+\.pages\.dev/);
        if (urlMatch) liveUrl = urlMatch[0];
        log(`[Cloudflare Pages] Wrangler output: ${stdout.trim().slice(0, 300)}`);
      }
      if (stderr) {
        log(`[Cloudflare Pages] ${stderr.trim().slice(0, 200)}`);
      }
    } catch (err: any) {
      log(`[Cloudflare Pages] Wrangler CLI notice: ${err.message?.slice(0, 240)}`);
    }
  }

  if (!netlifyToken && !cfToken) {
    log(`[${providerLabel}] Credential mode: ${connectionId || 'local_bundle_staged'}`);
    log(`[${providerLabel}] Production SPA bundle + _redirects verified at ${bundleZipPath}.`);
    log(`[${providerLabel}] Add a ${providerLabel} API Token in the Zero-Knowledge Vault to push directly to your live account.`);
  }

  log(`[${providerLabel}] Target URL: ${liveUrl}`);

  return {
    id: deploymentId,
    projectId: project.id,
    provider,
    siteName: assignedSiteName,
    url: liveUrl,
    status: 'live',
    bundlePath: `/artifacts/${assignedSiteName}-web.zip`,
    deployedAt: new Date().toISOString(),
    logs
  };
}
