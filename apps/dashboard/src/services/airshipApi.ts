export interface ProjectPayload {
  name: string;
  bundleId: string;
  sourceType: 'url' | 'github' | 'zip';
  sourceRef: string;
  webDir?: string;
}

export interface BuildPayload {
  platform: 'android' | 'ios';
  versionName?: string;
  versionCode?: number;
  track?: 'internal' | 'closed' | 'production' | 'testflight';
}

export interface StoreConnectionPayload {
  store: 'play' | 'apple' | 'revenuecat' | 'cloudflare' | 'netlify';
  label: string;
  ciphertext: string;
  iv?: string;
  wrappedDek: string;
  kdfParams: Record<string, unknown>;
}

const API_BASE = '/api';

export const airshipApi = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getProjects() {
    const res = await fetch(`${API_BASE}/projects`);
    return res.json();
  },

  async getProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    return res.json();
  },

  async inspectProject(payload: { sourceType: 'url' | 'github' | 'zip'; sourceRef: string }) {
    const res = await fetch(`${API_BASE}/projects/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async createProject(data: ProjectPayload) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async saveBrandIcon(projectId: string, iconDataUrl: string) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iconDataUrl })
    });
    return res.json();
  },

  async runComplianceScan(projectId: string) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/compliance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return res.json();
  },

  async remediateCompliance(projectId: string, findingId: string) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/compliance/remediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId })
    });
    return res.json();
  },

  async createBuild(projectId: string, payload: BuildPayload) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  getBuildStreamUrl(buildId: string) {
    return `${API_BASE}/builds/${buildId}/stream`;
  },

  async getStoreConnections() {
    const res = await fetch(`${API_BASE}/store-connections`);
    return res.json();
  },

  async getStoreConnectionEnvelope(id: string) {
    const res = await fetch(`${API_BASE}/store-connections/${id}/envelope`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveStoreConnection(data: StoreConnectionPayload) {
    const res = await fetch(`${API_BASE}/store-connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async revokeStoreConnection(id: string) {
    const res = await fetch(`${API_BASE}/store-connections/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async publishProject(
    projectId: string,
    payload: { track: string; connectionId?: string; credentialSecret?: string }
  ) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async deployWeb(
    projectId: string,
    payload: {
      provider: 'cloudflare' | 'netlify';
      siteName?: string;
      connectionId?: string;
      credentialSecret?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/deploy-web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
