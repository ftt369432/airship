import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, Build, BuildEvent, StoreConnection } from '../types.js';
import type { ComplianceReport } from '../../../../packages/shield/dist/index.js';
import { seedDefaultProjects } from './pathResolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'airship_db.json');

export interface DatabaseSnapshot {
  projects: Record<string, Project>;
  storeConnections: Record<string, StoreConnection>;
  builds: Record<string, Build>;
  buildEvents: Record<string, BuildEvent[]>;
  complianceReports: Record<string, ComplianceReport>;
  submissions: Record<string, any>;
  webDeployments: Record<string, any>;
}

/**
 * Dual-Mode Persistent Store:
 * 1. Atomic Local JSON Disk Database (apps/api/data/airship_db.json)
 * 2. Optional Live Supabase PostgreSQL Sync when SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are set
 */
export class PersistentStore {
  public projects = new Map<string, Project>();
  public storeConnections = new Map<string, StoreConnection>();
  public builds = new Map<string, Build>();
  public buildEvents = new Map<string, BuildEvent[]>();
  public complianceReports = new Map<string, ComplianceReport>();
  public submissions = new Map<string, any>();
  public webDeployments = new Map<string, any>();

  constructor() {
    this.loadFromDisk();
  }

  public loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed: Partial<DatabaseSnapshot> = JSON.parse(raw);

        if (parsed.projects) {
          for (const [k, v] of Object.entries(parsed.projects)) this.projects.set(k, v);
        }
        if (parsed.storeConnections) {
          for (const [k, v] of Object.entries(parsed.storeConnections)) this.storeConnections.set(k, v);
        }
        if (parsed.builds) {
          for (const [k, v] of Object.entries(parsed.builds)) this.builds.set(k, v);
        }
        if (parsed.buildEvents) {
          for (const [k, v] of Object.entries(parsed.buildEvents)) this.buildEvents.set(k, v);
        }
        if (parsed.complianceReports) {
          for (const [k, v] of Object.entries(parsed.complianceReports)) this.complianceReports.set(k, v);
        }
        if (parsed.submissions) {
          for (const [k, v] of Object.entries(parsed.submissions)) this.submissions.set(k, v);
        }
        if (parsed.webDeployments) {
          for (const [k, v] of Object.entries(parsed.webDeployments)) this.webDeployments.set(k, v);
        }
      }
    } catch (err) {
      console.warn('[PersistentStore] Failed to load existing snapshot, initializing fresh:', err);
    }

    // Ensure default sovereign reference fixtures are always seeded
    if (!this.projects.has('proj_syncura_official') || !this.projects.has('proj_sutraflow_official')) {
      seedDefaultProjects(this.projects);
      this.saveToDisk();
    }
  }

  public saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const snapshot: DatabaseSnapshot = {
        projects: Object.fromEntries(this.projects),
        storeConnections: Object.fromEntries(this.storeConnections),
        builds: Object.fromEntries(this.builds),
        buildEvents: Object.fromEntries(this.buildEvents),
        complianceReports: Object.fromEntries(this.complianceReports),
        submissions: Object.fromEntries(this.submissions),
        webDeployments: Object.fromEntries(this.webDeployments)
      };

      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.warn('[PersistentStore] Disk write warning:', err);
    }
  }

  /**
   * Optional asynchronous Supabase REST API sync when SUPABASE_URL is configured.
   */
  public async syncTableToSupabase(table: string, record: Record<string, unknown>): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    try {
      await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(record)
      });
    } catch (err) {
      console.warn(`[PersistentStore] Supabase sync warning for ${table}:`, err);
    }
  }
}

