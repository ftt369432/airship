import React, { useState } from 'react';
import { Rocket, Lock, Unlock, ExternalLink, Sun, Moon, Key, Shield } from '../ui/Icons';
import { useProjectStore } from '../../stores/useProjectStore';
import { useVaultStore } from '../../stores/useVaultStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const Navbar: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { isUnlocked, unlock, lock } = useVaultStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [vaultError, setVaultError] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setVaultError('Passphrase required to derive decryption key.');
      return;
    }
    unlock(passphrase.trim());
    setPassphrase('');
    setVaultError(null);
    setShowVaultModal(false);
  };

  const handleLock = () => {
    lock();
    setShowVaultModal(false);
  };

  return (
    <>
      <header className="glass-panel" style={{ margin: '16px 24px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
              <Rocket size={20} color="#08090c" />
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block', lineHeight: '1.2' }}>
                AIRSHIP
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>AUTONOMOUS MOBILE AGENT</span>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)', margin: '0 8px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {currentProject.name || 'Draft Application'}
            </span>
            <span className="glass-badge badge-cyan" style={{ fontSize: '11px' }}>
              {currentProject.bundleId || 'pending.bundle.id'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Light / Dark Mode Toggle Switch */}
          <div 
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'var(--transition-smooth)'
            }}
            title={`Click to switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {theme === 'dark' ? <Moon size={13} color="var(--cyan-primary)" /> : <Sun size={13} color="#f59e0b" />}
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {theme === 'dark' ? 'DARK' : 'LIGHT'}
              </span>
            </div>

            {/* Sliding Pill Switch */}
            <div style={{
              width: '28px',
              height: '16px',
              borderRadius: '10px',
              background: theme === 'dark' ? '#00f2fe44' : '#f59e0b44',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: theme === 'dark' ? 'var(--cyan-primary)' : '#f59e0b',
                position: 'absolute',
                top: '2px',
                left: theme === 'dark' ? '14px' : '2px',
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
          </div>

          <div className="glass-badge badge-emerald" style={{ cursor: 'default' }}>
            <span className="pulse-indicator pulse-emerald" />
            <span>CAPACITOR 7 ACTIVE</span>
          </div>

          <button 
            onClick={() => setShowVaultModal(true)}
            className={isUnlocked ? "glass-badge badge-cyan" : "glass-badge badge-amber"}
            style={{ cursor: 'pointer', border: '1px solid currentColor', background: 'transparent' }}
            title={isUnlocked ? "Vault is Unlocked in Memory (Click to Manage)" : "Vault is Locked (Click to Unlock)"}
          >
            {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{isUnlocked ? 'VAULT UNLOCKED' : 'VAULT ENCRYPTED'}</span>
          </button>

          {currentProject.sourceRef && currentProject.sourceRef.startsWith('http') && (
            <a 
              href={currentProject.sourceRef} 
              target="_blank" 
              rel="noreferrer" 
              className="glass-btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <span>Live Source</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </header>

      {/* Zero-Knowledge Vault Modal Dialog */}
      {showVaultModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '460px', padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-hover)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} color="var(--cyan-primary)" />
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Zero-Knowledge Vault</span>
              </div>
              <button 
                onClick={() => { setShowVaultModal(false); setVaultError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '18px' }}>
              Under Rule 7 (Zero-Knowledge Custody), store credentials and developer private keys are encrypted in-memory using PBKDF2 (600,000 rounds) and AES-256-GCM. Unencrypted plaintext never crosses the network or touches remote disks.
            </p>

            {vaultError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--crimson-danger)', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {vaultError}
              </div>
            )}

            {isUnlocked ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Unlock size={18} color="var(--emerald-success)" />
                  <span style={{ fontSize: '13px', color: 'var(--emerald-success)', fontWeight: '600' }}>
                    Vault is currently unlocked in browser session memory.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button onClick={() => setShowVaultModal(false)} className="glass-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Close
                  </button>
                  <button onClick={handleLock} className="glass-btn-primary" style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--amber-warning)', color: '#08090c' }}>
                    <Lock size={14} />
                    <span>Lock & Purge Memory</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                    Master Vault Passphrase
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <input 
                      type="password"
                      placeholder="Enter master passphrase to unlock..."
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => { setShowVaultModal(false); setVaultError(null); }} className="glass-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="glass-btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                    <Key size={14} />
                    <span>Unlock Keystore</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
