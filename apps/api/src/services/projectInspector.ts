import fs from 'node:fs';
import path from 'node:path';

export interface InspectResult {
  name: string;
  bundleId: string;
  webDir: string;
  framework: string;
  detectedPlugins: string[];
  iconUrl: string | null;
  sourceType: 'url' | 'github' | 'zip';
  sourceRef: string;
}

export async function inspectProjectSource(sourceType: 'url' | 'github' | 'zip', sourceRef: string): Promise<InspectResult> {
  let detectedName = 'New Application';
  let detectedBundleId = 'com.airship.app';
  let detectedWebDir = 'dist';
  let framework = 'Web / HTML5';
  let iconUrl: string | null = null;
  const detectedPlugins: string[] = [];

  if (sourceType === 'github') {
    try {
      const cleanRef = sourceRef.trim();
      const urlMatch = cleanRef.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git|\/)?$/i);
      const owner = urlMatch ? urlMatch[1] : 'developer';
      const repo = urlMatch ? urlMatch[2] : 'webapp';

      detectedName = repo.charAt(0).toUpperCase() + repo.slice(1).replace(/[-_]/g, ' ');
      const cleanOwner = owner.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanRepo = repo.toLowerCase().replace(/[^a-z0-9]/g, '');
      detectedBundleId = `com.${cleanOwner || 'developer'}.${cleanRepo || 'webapp'}`;

      // Fast inspect via GitHub raw content
      try {
        const rawPkgUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const rawRes = await fetch(rawPkgUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (rawRes.ok) {
          const pkg: any = await rawRes.json();
          if (pkg.name) {
            detectedName = pkg.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
          if (pkg.dependencies) {
            if (pkg.dependencies['react']) framework = 'React';
            if (pkg.dependencies['vue']) framework = 'Vue';
            if (pkg.dependencies['next']) framework = 'Next.js (Static)';
            if (pkg.dependencies['svelte']) framework = 'Svelte';
            if (pkg.dependencies['@capacitor/core']) detectedPlugins.push('@capacitor/core');
            if (pkg.dependencies['@capacitor/haptics']) detectedPlugins.push('@capacitor/haptics');
            if (pkg.dependencies['@revenuecat/purchases-capacitor']) detectedPlugins.push('@revenuecat/purchases-capacitor');
          }
        }
      } catch (fetchErr: any) {
        console.warn('[Inspect] Fast GitHub fetch fallback:', fetchErr?.message);
      }
    } catch (err: any) {
      console.warn('[Inspect] Git inspection fallback:', err.message);
    }
  } else if (sourceType === 'zip') {
    if (fs.existsSync(sourceRef)) {
      try {
        const pkgPath = path.join(sourceRef, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.name) {
            detectedName = pkg.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
          if (pkg.dependencies) {
            if (pkg.dependencies['react']) framework = 'React';
            if (pkg.dependencies['vue']) framework = 'Vue';
            if (pkg.dependencies['next']) framework = 'Next.js (Static)';
            if (pkg.dependencies['@capacitor/core']) detectedPlugins.push('@capacitor/core');
            if (pkg.dependencies['@capacitor/haptics']) detectedPlugins.push('@capacitor/haptics');
            if (pkg.dependencies['@revenuecat/purchases-capacitor']) detectedPlugins.push('@revenuecat/purchases-capacitor');
          }
        }
        if (fs.existsSync(path.join(sourceRef, 'dist'))) detectedWebDir = 'dist';
        else if (fs.existsSync(path.join(sourceRef, 'build'))) detectedWebDir = 'build';
        else if (fs.existsSync(path.join(sourceRef, 'out'))) detectedWebDir = 'out';

        const cleanBase = path.basename(sourceRef).toLowerCase().replace(/[^a-z0-9]/g, '');
        detectedBundleId = `com.local.${cleanBase || 'app'}`;
      } catch (err: any) {
        console.warn('[Inspect] Local path inspection fallback:', err.message);
      }
    }
  } else if (sourceType === 'url') {
    try {
      const parsedUrl = new URL(sourceRef.startsWith('http') ? sourceRef : `https://${sourceRef}`);
      const parts = parsedUrl.hostname.split('.');
      const domain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      detectedName = domain.charAt(0).toUpperCase() + domain.slice(1);
      detectedBundleId = `app.${parts.slice().reverse().join('.')}`;
      framework = 'Live Remote Web App (Capacitor URL Mode)';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(parsedUrl.href, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          detectedName = titleMatch[1].trim();
        }
      }
    } catch (err: any) {
      console.warn('[Inspect] URL fetch error:', err.message);
    }
  }

  return {
    name: detectedName,
    bundleId: detectedBundleId,
    webDir: detectedWebDir,
    framework,
    detectedPlugins,
    iconUrl,
    sourceType,
    sourceRef
  };
}

export function resolveProjectWorkspace(sourceRef: string, projectId?: string): string {
  if (sourceRef && fs.existsSync(sourceRef)) {
    return sourceRef;
  }
  const workspaceRoot = path.resolve(process.cwd(), 'workspaces', projectId || 'default');
  if (!fs.existsSync(workspaceRoot)) {
    fs.mkdirSync(workspaceRoot, { recursive: true });
  }
  return workspaceRoot;
}

export function gatherScanPayload(
  sourceRef: string,
  projectId?: string
): { packageJson: any; files: string[]; fileContents: Record<string, string> } {
  let packageJson: any = {
    dependencies: {
      'react': '^19.0.0',
      '@capacitor/core': '^7.0.0',
      '@capacitor/haptics': '^7.0.0',
      '@revenuecat/purchases-capacitor': '^11.3.0'
    }
  };
  let files: string[] = ['index.html', 'src/main.tsx', 'public/icon.png'];
  const fileContents: Record<string, string> = {};

  const candidateDirs: string[] = [];
  if (sourceRef && fs.existsSync(sourceRef)) {
    candidateDirs.push(sourceRef);
  }
  if (projectId) {
    const wsDir = path.resolve(process.cwd(), 'workspaces', projectId);
    if (fs.existsSync(wsDir) && !candidateDirs.includes(wsDir)) {
      candidateDirs.push(wsDir);
    }
  }

  try {
    if (candidateDirs.length > 0) {
      const mergedFiles = new Set<string>();
      for (const dir of candidateDirs) {
        const pkgPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
          packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        }
        const rootEntries = fs.readdirSync(dir);
        for (const entry of rootEntries) {
          mergedFiles.add(entry);
          const fullEntry = path.join(dir, entry);
          if (/\.(html|md|ts|tsx|js|json)$/i.test(entry) && fs.statSync(fullEntry).isFile()) {
            try {
              fileContents[entry] = fs.readFileSync(fullEntry, 'utf8').slice(0, 16384);
            } catch {
              // Ignore binary or locked files
            }
          }
        }
        for (const sub of ['public', 'src']) {
          const subDir = path.join(dir, sub);
          if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
            for (const f of fs.readdirSync(subDir)) {
              const rel = `${sub}/${f}`;
              mergedFiles.add(rel);
              const fullSub = path.join(subDir, f);
              if (/\.(html|md|ts|tsx|js)$/i.test(f) && fs.statSync(fullSub).isFile()) {
                try {
                  fileContents[rel] = fs.readFileSync(fullSub, 'utf8').slice(0, 16384);
                } catch {
                  // Ignore read error
                }
              }
            }
          }
        }
      }
      if (mergedFiles.size > 0) {
        files = Array.from(mergedFiles);
      }
    }
  } catch (err) {
    console.warn('[gatherScanPayload] Error reading source path:', err);
  }

  return { packageJson, files, fileContents };
}

