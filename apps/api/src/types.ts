export type SourceType = 'url' | 'github' | 'zip';
export type PlatformType = 'android' | 'ios' | 'web';
export type StoreType = 'play' | 'apple' | 'revenuecat' | 'cloudflare' | 'netlify';

export type BuildState =
  | 'queued'
  | 'preparing'
  | 'building'
  | 'signing'
  | 'uploading'
  | 'submitted'
  | 'in_review'
  | 'live'
  | 'failed'
  | 'rejected';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  bundleId: string;
  sourceType: SourceType;
  sourceRef: string;
  webDir: string;
  status: 'draft' | 'configured' | 'building' | 'live';
  createdAt: string;
}

export interface Build {
  id: string;
  projectId: string;
  platform: PlatformType;
  versionName: string;
  versionCode: number;
  state: BuildState;
  ghRunId?: number;
  artifactPath?: string;
  sha256?: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
}

export interface BuildEvent {
  id: number;
  buildId: string;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'step';
  message: string;
}

export interface StoreConnection {
  id: string;
  ownerId: string;
  store: StoreType;
  label: string;
  ciphertext: string;
  iv?: string;
  wrappedDek: string;
  kdfParams: Record<string, unknown>;
  createdAt: string;
  revokedAt?: string;
}

export interface Submission {
  id: string;
  buildId: string;
  store: 'google_play' | 'app_store';
  track: 'internal' | 'closed' | 'production' | 'testflight';
  state: 'queued' | 'uploaded' | 'in_review' | 'live' | 'rejected' | 'failed';
  storeRef?: string;
  rejectReason?: string;
  updatedAt: string;
}
