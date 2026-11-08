import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, Send, ExternalLink, RefreshCw, Globe, Cloud, Zap } from '../ui/Icons';
import { useVaultStore } from '../../stores/useVaultStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { airshipApi } from '../../services/airshipApi';
import { unlockCredential } from '../../services/vaultCrypto';
import { ZeroKnowledgeVaultPanel } from './ZeroKnowledgeVaultPanel';

type DeployTarget = 'play_internal' | 'play_production' | 'cloudflare_pages' | 'netlify_web';

export const Step5Publish: React.FC = () => {
  const { prevStep, currentProject } = useProjectStore();
  const { isUnlocked, passphrase, setConnections } = useVaultStore();

  const [activeTarget, setActiveTarget] = useState<DeployTarget>('play_internal');
  const [selectedConnection, setSelectedConnection] = useState<string>('conn_play_default');

  const decryptSelectedConnectionSecret = async (): Promise<string | undefined> => {
    if (!selectedConnection || selectedConnection === 'conn_play_default' || !passphrase) {
      return undefined;
    }
    try {
      const envelope = await airshipApi.getStoreConnectionEnvelope(selectedConnection);
      if (envelope && envelope.ciphertext && envelope.wrappedDek && envelope.kdfParams) {
        return await unlockCredential(envelope, passphrase);
      }
    } catch (err) {
      console.warn('[Step5Publish] Client-side Vault envelope decryption notice:', err);
    }
    return undefined;
  };
  
  // Mobile Store Submission state
  const [submissionState, setSubmissionState] = useState<'idle' | 'uploading' | 'submitted' | 'failed'>('idle');
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [publishLogs, setPublishLogs] = useState<string[]>([]);
  
  // Web Edge Deployment state (Cloudflare & Netlify)
  const [webState, setWebState] = useState<'idle' | 'deploying' | 'live' | 'failed'>('idle');
  const [webResult, setWebResult] = useState<any>(null);
  const [webLogs, setWebLogs] = useState<string[]>([]);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch connections from server on mount
  useEffect(() => {
    let active = true;
    const fetchConns = async () => {
      try {
        const list = await airshipApi.getStoreConnections();
        if (active && Array.isArray(list) && list.length > 0) {
          setConnections(list);
          setSelectedConnection(list[0].id);
        }
      } catch (err) {
        console.warn('[Step5Publish] Store connection load fallback:', err);
      }
    };
    fetchConns();
    return () => { active = false; };
  }, [setConnections]);

  const handleMobilePublish = async () => {
    if (!isUnlocked) {
      setErrorMsg('Zero-Knowledge Vault is locked. Enter Master Vault Passphrase in the vault panel below to decrypt credentials client-side.');
      return;
    }

    setErrorMsg(null);
    setSubmissionState('uploading');
    const track = activeTarget === 'play_production' ? 'production' : 'internal';
    setPublishLogs([
      `[Fastlane:supply] Authenticating runner with client-decrypted keystore...`,
      `[Fastlane:supply] Target: ${track.toUpperCase()} track for package '${currentProject.bundleId}'...`
    ]);

    try {
      const credentialSecret = await decryptSelectedConnectionSecret();
      const result = await airshipApi.publishProject(currentProject.id || 'proj_syncura_official', {
        track,
        connectionId: selectedConnection,
        credentialSecret
      });

      if (result && result.submissionId) {
        setSubmissionResult(result);
        if (Array.isArray(result.logs)) {
          setPublishLogs(result.logs);
        }
        setSubmissionState('submitted');
      } else {
        throw new Error('Server returned invalid submission format.');
      }
    } catch (err: any) {
      console.error('[Step5Publish] Publish failed:', err);
      setSubmissionState('failed');
      setErrorMsg('Publication failed: ' + (err.message || 'Fastlane API dispatch error.'));
    }
  };

  const handleWebDeploy = async (provider: 'cloudflare' | 'netlify') => {
    setErrorMsg(null);
    setWebState('deploying');
    const providerLabel = provider === 'cloudflare' ? 'Cloudflare Pages' : 'Netlify';
    setWebLogs([
      `[${providerLabel}] Initiating instant global edge launch for '${currentProject.name}'...`,
      `[${providerLabel}] Reading production assets from /${currentProject.webDir || 'dist'}...`
    ]);

    try {
      const credentialSecret = await decryptSelectedConnectionSecret();
      const result = await airshipApi.deployWeb(currentProject.id || 'proj_sutraflow_official', {
        provider,
        siteName: currentProject.name,
        connectionId: selectedConnection,
        credentialSecret
      });

      if (result && result.url) {
        setWebResult(result);
        if (Array.isArray(result.logs)) {
          setWebLogs(result.logs);
        }
        setWebState('live');
      } else {
        throw new Error('Server returned invalid deployment response.');
      }
    } catch (err: any) {
      console.error('[Step5Publish] Web Deploy failed:', err);
      setWebState('failed');
      setErrorMsg('Web deployment failed: ' + (err.message || 'Edge dispatch error.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>5. Autonomous Launch & Zero-Knowledge Vault</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Ship to Mobile App Stores (Google Play / TestFlight) and Web Global Edge (Cloudflare Pages / Netlify) in one unified cockpit.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="glass-badge badge-emerald">
              <Zap size={14} />
              <span>CLOUDFLARE EDGE ACTIVE</span>
            </div>
            <div className="glass-badge badge-cyan">
              <CheckCircle size={14} />
              <span>PLAY API ONLINE</span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--crimson-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--crimson-danger)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Multi-Target Deployment Hub Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {/* Target 1: Cloudflare Pages */}
          <div
            onClick={() => setActiveTarget('cloudflare_pages')}
            className="glass-card"
            style={{
              cursor: 'pointer',
              border: activeTarget === 'cloudflare_pages' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: activeTarget === 'cloudflare_pages' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={16} color="var(--cyan-primary)" />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Cloudflare Pages</span>
              </div>
              <span className="glass-badge badge-emerald" style={{ fontSize: '9px' }}>5 SECONDS</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              SutraFlow.us global edge architecture. Zero review friction, instant SSL, custom DNS CNAME.
            </p>
          </div>

          {/* Target 2: Netlify Web */}
          <div
            onClick={() => setActiveTarget('netlify_web')}
            className="glass-card"
            style={{
              cursor: 'pointer',
              border: activeTarget === 'netlify_web' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: activeTarget === 'netlify_web' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} color="var(--cyan-primary)" />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Netlify Web CDN</span>
              </div>
              <span className="glass-badge badge-cyan" style={{ fontSize: '9px' }}>INSTANT SPA</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              GenieFlowAI.com production framework. Automatic SPA redirects, atomic deploys, instant rollback.
            </p>
          </div>

          {/* Target 3: Google Play Internal */}
          <div
            onClick={() => setActiveTarget('play_internal')}
            className="glass-card"
            style={{
              cursor: 'pointer',
              border: activeTarget === 'play_internal' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: activeTarget === 'play_internal' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Play Internal</span>
              <span className="glass-badge badge-emerald" style={{ fontSize: '9px' }}>NO REVIEW</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Direct .AAB delivery for testers within 15 minutes. Bypass Google human review queue.
            </p>
          </div>

          {/* Target 4: Google Play Production */}
          <div
            onClick={() => setActiveTarget('play_production')}
            className="glass-card"
            style={{
              cursor: 'pointer',
              border: activeTarget === 'play_production' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: activeTarget === 'play_production' ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Play Production</span>
              <span className="glass-badge badge-amber" style={{ fontSize: '9px' }}>STORE REVIEW</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Public release bundle on Google Play Store. Requires compliance pass & account review.
            </p>
          </div>
        </div>

        {/* Zero-Knowledge Vault Sub-Panel Component */}
        <ZeroKnowledgeVaultPanel
          selectedConnection={selectedConnection}
          onSelectConnection={setSelectedConnection}
          onError={setErrorMsg}
        />

        {/* Action Button Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Destination:</span>
            <span className="glass-badge badge-cyan" style={{ fontWeight: '700' }}>
              {activeTarget === 'cloudflare_pages' ? 'CLOUDFLARE PAGES (EDGE)' :
               activeTarget === 'netlify_web' ? 'NETLIFY (GLOBAL CDN)' :
               activeTarget === 'play_production' ? 'GOOGLE PLAY (PRODUCTION)' : 'GOOGLE PLAY (INTERNAL TESTING)'}
            </span>
          </div>

          {/* Trigger button branches depending on Web vs Mobile destination */}
          {activeTarget === 'cloudflare_pages' || activeTarget === 'netlify_web' ? (
            <button
              onClick={() => handleWebDeploy(activeTarget === 'cloudflare_pages' ? 'cloudflare' : 'netlify')}
              disabled={webState === 'deploying'}
              className="glass-btn-primary"
              style={{ padding: '12px 28px', fontSize: '14px', gap: '10px' }}
            >
              {webState === 'deploying' ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Deploying to {activeTarget === 'cloudflare_pages' ? 'Cloudflare Pages' : 'Netlify'}...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Launch Live on {activeTarget === 'cloudflare_pages' ? 'Cloudflare Pages' : 'Netlify'} (5s)</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleMobilePublish}
              disabled={submissionState === 'uploading' || submissionState === 'submitted'}
              className="glass-btn-primary"
              style={{ padding: '12px 28px', fontSize: '14px', gap: '10px' }}
            >
              {submissionState === 'uploading' ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Deploying via Fastlane Supply...</span>
                </>
              ) : submissionState === 'submitted' ? (
                <>
                  <CheckCircle size={16} />
                  <span>Deployed to Google Play</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Deploy to Google Play</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Web Deployment Live Receipt HUD */}
        {webState === 'live' && webResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CheckCircle size={28} color="var(--emerald-success)" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--emerald-success)' }}>
                      Web Application Live on {webResult.provider === 'cloudflare' ? 'Cloudflare Pages' : 'Netlify'}
                    </span>
                    <span className="glass-badge badge-emerald">STATUS: 200 OK</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Production site active at: <a href={webResult.url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan-primary)', fontWeight: '600', textDecoration: 'underline' }}>{webResult.url}</a>
                  </span>
                </div>
              </div>

              <a
                href={webResult.url}
                target="_blank"
                rel="noreferrer"
                className="glass-btn-primary"
                style={{ padding: '10px 18px', fontSize: '13px', gap: '8px' }}
              >
                <span>Open Live Site</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Edge Deployment Telemetry Terminal */}
            {webLogs.length > 0 && (
              <div className="glass-terminal" style={{ maxHeight: '160px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  ⚡ EDGE ROUTING & CDN DISPATCH TELEMETRY
                </span>
                {webLogs.map((line, idx) => (
                  <div key={idx} style={{ color: '#c9d1d9', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Submission Receipt HUD */}
        {submissionState === 'submitted' && submissionResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CheckCircle size={28} color="var(--emerald-success)" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--emerald-success)' }}>
                      Submission Accepted by Google Play Developer API
                    </span>
                    <span className="glass-badge badge-emerald">SUBMISSION: {submissionResult.submissionId}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    App Bundle accepted for package <strong>{currentProject.bundleId}</strong>. Track: <strong>{activeTarget === 'play_production' ? 'PRODUCTION' : 'INTERNAL'}</strong>. Review Status: <strong>{submissionResult.reviewStatus}</strong>.
                  </span>
                </div>
              </div>

              <a
                href={submissionResult.consoleUrl || "https://play.google.com/console"}
                target="_blank"
                rel="noreferrer"
                className="glass-btn-secondary"
              >
                <span>Open Play Console</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Fastlane Deployment Log Output */}
            {publishLogs.length > 0 && (
              <div className="glass-terminal" style={{ maxHeight: '160px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  ⚡ FASTLANE SUPPLY DISPATCH TELEMETRY
                </span>
                {publishLogs.map((line, idx) => (
                  <div key={idx} style={{ color: '#c9d1d9', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={prevStep} className="glass-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Build & Telemetry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
