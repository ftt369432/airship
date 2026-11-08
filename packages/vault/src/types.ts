export type StoreType = 'play' | 'apple' | 'revenuecat' | 'cloudflare' | 'netlify';

export interface KdfParams {
  salt: string;          // Base64-encoded random salt (minimum 16 bytes)
  iterations: number;    // PBKDF2 iterations (default: 600,000)
  hash: string;          // Hash algorithm ('SHA-256')
  algorithm: string;     // KDF algorithm name ('PBKDF2')
}

export interface EncryptedVaultEnvelope {
  ciphertext: string;    // Base64-encoded AES-256-GCM ciphertext (payload + auth tag)
  iv: string;            // Base64-encoded 96-bit initialization vector
  wrappedDek: string;    // Base64-encoded Data Encryption Key wrapped by KEK
  kdfParams: KdfParams;  // Key Derivation Function parameters
  createdAt: string;     // ISO timestamp
  version: number;       // Envelope schema version
}

export interface EphemeralEnvelope {
  ciphertext: string;    // Base64-encoded AES-256-GCM ciphertext
  iv: string;            // Base64-encoded 96-bit IV
  ephemeralPublicKey: string; // Base64-encoded SPKI public key of sender
  createdAt: string;     // ISO timestamp
}

export interface RunnerKeypairResult {
  publicKeyBase64: string;
  privateKey: CryptoKey;
}
