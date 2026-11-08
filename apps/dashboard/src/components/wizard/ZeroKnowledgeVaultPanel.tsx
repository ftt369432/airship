import React, { useState } from 'react';
import { Lock, Unlock, Key, Plus, Shield } from '../ui/Icons';
import { useVaultStore } from '../../stores/useVaultStore';
import { airshipApi } from '../../services/airshipApi';
import { storeCredential } from '../../services/vaultCrypto';

interface ZeroKnowledgeVaultPanelProps {
  selectedConnection: string;
  onSelectConnection: (id: string) => void;
  onError: (msg: string | null) => void;
}

export const ZeroKnowledgeVaultPanel: React.FC<ZeroKnowledgeVaultPanelProps> = ({
  selectedConnection,
  onSelectConnection,
  onError
}) => {
  const { isUnlocked, unlock, lock, connections, setConnections } = useVaultStore();

  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStore, setNewStore] = useState<'play' | 'apple' | 'revenuecat' | 'cloudflare' | 'netlify'>('play');
  const [newLabel, setNewLabel] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassphrase.trim()) {
      onError('Please enter your Master Vault Passphrase.');
      return;
    }
    unlock(unlockPassphrase.trim());
    setUnlockPassphrase('');
    onError(null);
  };

  const handleSaveNewConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newSecret.trim() || !newPassphrase.trim()) {
      onError('Please fill in credential label, secret payload, and master passphrase.');
      return;
    }

    setIsEncrypting(true);
    onError(null);

    try {
      // 1. Client-Side Web Crypto PBKDF2 (600,000 rounds) + AES-256-GCM
      // Plaintext NEVER leaves the browser memory!
      const envelope = await storeCredential(newSecret.trim(), newPassphrase.trim());

      // 2. Post ONLY ciphertext envelope to sovereign server
      const saved = await airshipApi.saveStoreConnection({
        store: newStore,
        label: newLabel.trim(),
        ciphertext: envelope.ciphertext,
        iv: envelope.iv,
        wrappedDek: envelope.wrappedDek,
        kdfParams: envelope.kdfParams
      });

      if (saved && saved.id) {
        setConnections([...connections, saved]);
        onSelectConnection(saved.id);
        setShowAddForm(false);
        setNewLabel('');
        setNewSecret('');
        setNewPassphrase('');
        unlock(newPassphrase.trim());
      }
    } catch (err: any) {
      console.error('[ZeroKnowledgeVaultPanel] Encryption failure:', err);
      onError('Client-side encryption failed: ' + err.message);
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: '24px', background: 'var(--bg-surface-elevated)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isUnlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isUnlocked ? <Unlock size={18} color="var(--emerald-success)" /> : <Lock size={18} color="var(--cyan-primary)" />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>Zero-Knowledge Vault (Rule 7 Custody)</span>
              <span className={isUnlocked ? "glass-badge badge-emerald" : "glass-badge badge-amber"}>
                {isUnlocked ? 'DECRYPTED IN MEMORY' : 'ENCRYPTED AT REST (AES-256-GCM)'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Plaintext credentials never cross the network. All encryption executed via Web Crypto PBKDF2 (600,000 rounds).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isUnlocked ? (
            <button
              onClick={lock}
              className="glass-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Lock size={13} />
              <span>Lock Vault</span>
            </button>
          ) : null}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="glass-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Plus size={13} />
            <span>{showAddForm ? 'Cancel' : 'Add Store Credential'}</span>
          </button>
        </div>
      </div>

      {/* Inline Unlock Form (when locked) */}
      {!isUnlocked && (
        <form onSubmit={handleUnlockVault} style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
          <Key size={16} color="var(--cyan-primary)" />
          <input
            type="password"
            placeholder="Enter Master Vault Passphrase to unlock credentials in memory..."
            value={unlockPassphrase}
            onChange={(e) => setUnlockPassphrase(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button type="submit" className="glass-btn-primary" style={{ padding: '10px 18px', fontSize: '13px' }}>
            <Unlock size={14} />
            <span>Unlock Vault</span>
          </button>
        </form>
      )}

      {/* Add Credential Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleSaveNewConnection} style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-hover)', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--cyan-primary)" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Add Sovereign Store Credential</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Store Type</label>
              <select
                value={newStore}
                onChange={(e: any) => setNewStore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="play">Google Play Console</option>
                <option value="apple">Apple App Store Connect</option>
                <option value="revenuecat">RevenueCat Secret</option>
                <option value="cloudflare">Cloudflare Pages (Global Edge)</option>
                <option value="netlify">Netlify (Instant Web CDN)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Credential Label</label>
              <input
                type="text"
                placeholder="e.g. Google Play Service Account (Release)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
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

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
              Secret Payload (Service Account JSON or API Key)
            </label>
            <textarea
              rows={3}
              placeholder='Paste Google Play API JSON key {"type": "service_account", ...}'
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                Master Vault Passphrase (Encrypts DEK in Browser)
              </label>
              <input
                type="password"
                placeholder="Enter Master Passphrase..."
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isEncrypting}
              className="glass-btn-primary"
              style={{ padding: '10px 18px', height: '40px', fontSize: '13px' }}
            >
              <Lock size={14} />
              <span>{isEncrypting ? 'Encrypting (PBKDF2)...' : 'Encrypt & Store'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Credentials List */}
      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Active Store Credentials
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {connections.map((c) => (
            <label
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: selectedConnection === c.id ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-card)',
                border: selectedConnection === c.id ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="radio"
                  name="storeConnection"
                  checked={selectedConnection === c.id}
                  onChange={() => onSelectConnection(c.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{c.label}</span>
              </div>

              <span className="glass-badge badge-cyan" style={{ fontSize: '10px' }}>
                {c.store.toUpperCase()} API
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

