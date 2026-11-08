import React, { useState, useEffect } from 'react';
import { Globe, GitBranch, Archive, CheckCircle2, ArrowRight, Sparkles, FolderCheck, Plus, RefreshCw } from '../ui/Icons';
import { useProjectStore } from '../../stores/useProjectStore';
import { airshipApi } from '../../services/airshipApi';

export const Step1Source: React.FC = () => {
  const { currentProject, setProject, nextStep, projects, setProjects, selectProject, createNewProject } = useProjectStore();
  const [sourceType, setSourceType] = useState<'url' | 'github' | 'zip'>(currentProject.sourceType || 'github');
  const [sourceRef, setSourceRef] = useState(currentProject.sourceRef || '');
  const [name, setName] = useState(currentProject.name || '');
  const [bundleId, setBundleId] = useState(currentProject.bundleId || '');
  const [webDir, setWebDir] = useState(currentProject.webDir || 'dist');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<{
    framework?: string;
    detectedPlugins?: string[];
  } | null>(null);

  // Sync state if currentProject changes in store
  useEffect(() => {
    setSourceType(currentProject.sourceType || 'github');
    setSourceRef(currentProject.sourceRef || '');
    setName(currentProject.name || '');
    setBundleId(currentProject.bundleId || '');
    setWebDir(currentProject.webDir || 'dist');
    setErrorMsg(null);
  }, [currentProject]);

  // Load existing projects from server
  useEffect(() => {
    let active = true;
    const fetchExisting = async () => {
      try {
        const list = await airshipApi.getProjects();
        if (active && Array.isArray(list)) {
          setProjects(list);
        }
      } catch (err) {
        console.warn('[Step1Source] Error loading projects:', err);
      }
    };
    fetchExisting();
    return () => { active = false; };
  }, [setProjects]);

  // Dynamic Inspection & Auto-Detection
  const handleInspectSource = async () => {
    if (!sourceRef.trim()) {
      setErrorMsg('Please enter a GitHub repository URL, live web URL, or local project folder path to inspect.');
      return;
    }

    setErrorMsg(null);
    setIsInspecting(true);
    setInspectionResult(null);

    try {
      const result = await airshipApi.inspectProject({ sourceType, sourceRef: sourceRef.trim() });
      if (result) {
        if (result.name) setName(result.name);
        if (result.bundleId) setBundleId(result.bundleId);
        if (result.webDir) setWebDir(result.webDir);
        setInspectionResult({
          framework: result.framework || 'Web / HTML5',
          detectedPlugins: result.detectedPlugins || []
        });
      }
    } catch (err: any) {
      console.warn('[Step1Source] Auto-inspection failed:', err);
      setErrorMsg('Inspection error: ' + (err.message || 'Could not auto-inspect source. You can still fill fields manually.'));
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSelectExisting = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setErrorMsg(null);
    if (val === 'NEW') {
      createNewProject();
      setInspectionResult(null);
    } else {
      const match = projects.find(p => p.id === val);
      if (match) {
        selectProject(match);
      }
    }
  };

  const handleSaveAndProceed = async () => {
    if (!name.trim() || !bundleId.trim()) {
      setErrorMsg('Please provide an Application Name and Bundle Identifier.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const serverProject = await airshipApi.createProject({
        name: name.trim(),
        bundleId: bundleId.trim(),
        sourceType,
        sourceRef: sourceRef.trim(),
        webDir: webDir.trim()
      });

      if (serverProject && serverProject.id) {
        setProject({
          id: serverProject.id,
          sourceType: serverProject.sourceType,
          sourceRef: serverProject.sourceRef,
          name: serverProject.name,
          bundleId: serverProject.bundleId,
          webDir: serverProject.webDir,
          status: serverProject.status
        });
      } else {
        setProject({
          sourceType,
          sourceRef,
          name,
          bundleId,
          webDir,
          status: 'configured'
        });
      }
      nextStep();
    } catch (err) {
      console.warn('[Step1Source] Failed to reach API, saving to local store:', err);
      setProject({
        sourceType,
        sourceRef,
        name,
        bundleId,
        webDir,
        status: 'configured'
      });
      nextStep();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>1. Autonomous Source Intake</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Provide any GitHub repository, live web URL, or local project folder. Airship auto-inspects dependencies and prepares the native Capacitor shell.
            </p>
          </div>

          <div className="glass-badge badge-cyan">
            <Sparkles size={14} />
            <span>DYNAMIC INTAKE ENGINE</span>
          </div>
        </div>

        {/* Error Notification Banner */}
        {errorMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--crimson-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--crimson-danger)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Saved Projects Switcher */}
        {projects.length > 0 && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Active Project:</span>
              <select 
                value={currentProject.id || 'NEW'} 
                onChange={handleSelectExisting}
                style={{ 
                  background: 'var(--bg-surface-elevated)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="NEW">➕ Start Fresh Project (from Git, URL, or Path)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name} ({p.bundleId})
                  </option>
                ))}
              </select>
            </div>

            <button 
              type="button" 
              onClick={createNewProject}
              className="glass-btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px', gap: '4px' }}
            >
              <Plus size={12} />
              <span>New App</span>
            </button>
          </div>
        )}

        {/* Source Type Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div 
            onClick={() => setSourceType('github')}
            className="glass-card" 
            style={{ 
              cursor: 'pointer',
              border: sourceType === 'github' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: sourceType === 'github' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(18, 22, 31, 0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <GitBranch size={18} color={sourceType === 'github' ? 'var(--cyan-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>GitHub Repository</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Auto-inspects public or private GitHub repository, reads dependencies, and packages from git.
            </p>
          </div>

          <div 
            onClick={() => setSourceType('url')}
            className="glass-card" 
            style={{ 
              cursor: 'pointer',
              border: sourceType === 'url' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: sourceType === 'url' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(18, 22, 31, 0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Globe size={18} color={sourceType === 'url' ? 'var(--cyan-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>Live Web App (URL)</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Wraps any existing web application or PWA in an accelerated native Capacitor 7 shell.
            </p>
          </div>

          <div 
            onClick={() => setSourceType('zip')}
            className="glass-card" 
            style={{ 
              cursor: 'pointer',
              border: sourceType === 'zip' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
              background: sourceType === 'zip' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(18, 22, 31, 0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Archive size={18} color={sourceType === 'zip' ? 'var(--cyan-primary)' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>Local Folder / ZIP</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Point directly to a local project workspace directory (e.g. Syncura or any local app).
            </p>
          </div>
        </div>

        {/* Source Reference Input with Inspect Action */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>
              {sourceType === 'github' ? 'GitHub Repository URL' : sourceType === 'url' ? 'Live Application URL' : 'Local Project Folder Path'}
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {sourceType === 'github' ? 'e.g. https://github.com/tastejs/todomvc' : sourceType === 'url' ? 'e.g. https://myapp.com' : 'e.g. G:\\My Drive\\.GENIEFLOW_MASTER\\03_APPS\\syncura'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={sourceRef} 
              onChange={(e) => setSourceRef(e.target.value)} 
              placeholder={sourceType === 'github' ? 'https://github.com/organization/repository' : sourceType === 'url' ? 'https://yourapp.com' : 'C:\\path\\to\\project'}
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                borderRadius: '10px', 
                background: 'var(--bg-surface-elevated)', 
                border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                outline: 'none'
              }}
            />

            <button 
              type="button"
              onClick={handleInspectSource}
              disabled={isInspecting || !sourceRef.trim()}
              className="glass-btn-secondary"
              style={{ 
                padding: '0 18px', 
                whiteSpace: 'nowrap',
                gap: '8px',
                borderColor: 'var(--cyan-primary)',
                color: 'var(--cyan-primary)'
              }}
            >
              <RefreshCw size={14} className={isInspecting ? 'spin' : ''} />
              <span>{isInspecting ? 'Inspecting...' : '⚡ Inspect & Auto-Detect'}</span>
            </button>
          </div>
        </div>

        {/* Auto-Detection Notification Card */}
        {inspectionResult && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FolderCheck size={22} color="var(--cyan-primary)" />
              <div>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block' }}>
                  Source Inspected: {name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Framework: <strong>{inspectionResult.framework}</strong> • Build Output: <code>{webDir}</code>
                  {inspectionResult.detectedPlugins && inspectionResult.detectedPlugins.length > 0 && (
                    <span> • Native Plugins: {inspectionResult.detectedPlugins.join(', ')}</span>
                  )}
                </span>
              </div>
            </div>

            <div className="glass-badge badge-emerald">
              <CheckCircle2 size={14} />
              <span>AUTO-CONFIGURED</span>
            </div>
          </div>
        )}

        {/* Identity & Bundle Config */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Application Display Name
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="My Mobile App"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                background: 'var(--bg-surface-elevated)', 
                border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Reverse Domain Bundle Identifier
            </label>
            <input 
              type="text" 
              value={bundleId} 
              onChange={(e) => setBundleId(e.target.value)} 
              placeholder="com.mycompany.app"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                background: 'var(--bg-surface-elevated)', 
                border: '1px solid var(--border-subtle)', 
                color: 'var(--cyan-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Web Build Directory
            </label>
            <input 
              type="text" 
              value={webDir} 
              onChange={(e) => setWebDir(e.target.value)} 
              placeholder="dist"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                background: 'var(--bg-surface-elevated)', 
                border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSaveAndProceed} 
            disabled={isSubmitting || !name || !bundleId} 
            className="glass-btn-primary"
            style={{ opacity: !name || !bundleId ? 0.5 : 1 }}
          >
            <span>{isSubmitting ? 'Registering Project...' : 'Proceed to Brand Suite'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
