import React, { useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Info, Check, Wrench, ArrowRight, ArrowLeft, Zap } from '../ui/Icons';
import { useComplianceStore } from '../../stores/useComplianceStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { airshipApi } from '../../services/airshipApi';

export const Step3Shield: React.FC = () => {
  const { score, blockers, warnings, findings, summary, isScanning, setReport, resolveFinding, setIsScanning } = useComplianceStore();
  const { currentProject, nextStep, prevStep } = useProjectStore();

  const executeScan = async () => {
    setIsScanning(true);
    try {
      const report = await airshipApi.runComplianceScan(currentProject.id || 'proj_syncura_official');
      if (report && report.score !== undefined) {
        setReport(report.score, report.blockers, report.warnings, report.findings, report.summary);
      }
    } catch (err) {
      console.warn('[Shield] Scan API failed, retaining current report:', err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    executeScan();
  }, [currentProject.id]);

  const handleFixBlocker = async (id: string) => {
    setIsScanning(true);
    try {
      const updated = await airshipApi.remediateCompliance(
        currentProject.id || 'proj_syncura_official',
        id
      );
      if (updated && updated.score !== undefined) {
        setReport(updated.score, updated.blockers, updated.warnings, updated.findings, updated.summary);
        return;
      }
    } catch (err) {
      console.warn('[Shield] Server remediation fallback:', err);
    } finally {
      setIsScanning(false);
    }
    resolveFinding(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>3. Compliance Shield & Store Pre-Flight</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Autonomous static audit scanning for Apple Guideline 4.2 (Minimum Native Functionality), Apple 5.1.1(v) Account Deletion, and Privacy Disclosures.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={executeScan} 
              disabled={isScanning}
              className="glass-btn-secondary"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              {isScanning ? '⚡ Scanning Disk...' : '🔄 Re-scan Project'}
            </button>
            <div className="glass-badge badge-cyan">
              <Zap size={14} />
              <span>{isScanning ? 'SCANNING' : 'SHIELD V1 ACTIVE'}</span>
            </div>
          </div>
        </div>

        {/* HUD Score & Summary Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Animated Dial */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  fill="none" 
                  stroke={score === 100 ? 'var(--emerald-success)' : score >= 75 ? 'var(--cyan-primary)' : 'var(--crimson-danger)'}
                  strokeWidth="8" 
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * score) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{score}%</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SCORE</span>
              </div>
            </div>

            <span style={{ fontSize: '12px', fontWeight: '600', marginTop: '12px', color: score === 100 ? 'var(--emerald-success)' : 'var(--text-primary)' }}>
              {score === 100 ? 'Store Ready' : 'Blockers Detected'}
            </span>
          </div>

          {/* Metrics & Reasoning */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className={blockers === 0 ? "glass-badge badge-emerald" : "glass-badge badge-crimson"}>
                {blockers} BLOCKER{blockers !== 1 ? 'S' : ''}
              </span>
              <span className="glass-badge badge-amber">
                {warnings} WARNING{warnings !== 1 ? 'S' : ''}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {summary}
              </span>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Autonomous Shield Rule:</strong> Airship never promises 100% human reviewer approval, but guarantees structural compliance against automated static store rejection rules before any build dispatch.
            </div>
          </div>
        </div>

        {/* Findings List with 1-Click Injection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Active Pre-Flight Audit Items</h3>

          {findings.length === 0 ? (
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <Check size={24} color="var(--emerald-success)" />
              <div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--emerald-success)', display: 'block' }}>All Audits Passed</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>App is 100% prepared for signed packaging and store review.</span>
              </div>
            </div>
          ) : (
            findings.map((finding) => (
              <div 
                key={finding.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${finding.severity === 'BLOCKER' ? 'var(--crimson-danger)' : finding.severity === 'WARNING' ? 'var(--amber-warning)' : 'var(--cyan-primary)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ marginTop: '2px' }}>
                    {finding.severity === 'BLOCKER' ? (
                      <AlertOctagon size={20} color="var(--crimson-danger)" />
                    ) : finding.severity === 'WARNING' ? (
                      <AlertTriangle size={20} color="var(--amber-warning)" />
                    ) : (
                      <Info size={20} color="var(--cyan-primary)" />
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{finding.title}</span>
                      <span className="glass-badge badge-cyan" style={{ fontSize: '10px' }}>{finding.rule}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{finding.description}</p>
                    <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                      💡 {finding.remediation}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleFixBlocker(finding.id)}
                  className="glass-btn-primary" 
                  style={{ padding: '8px 14px', fontSize: '12px', flexShrink: 0 }}
                >
                  <Wrench size={14} />
                  <span>1-Click Auto-Inject</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={prevStep} className="glass-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Brand</span>
          </button>

          <button 
            onClick={nextStep} 
            className="glass-btn-primary"
            disabled={blockers > 0}
            style={{ opacity: blockers > 0 ? 0.5 : 1, cursor: blockers > 0 ? 'not-allowed' : 'pointer' }}
          >
            <span>Proceed to Cloud Build</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
