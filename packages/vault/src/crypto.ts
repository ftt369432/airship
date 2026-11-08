import type { EncryptedVaultEnvelope, EphemeralEnvelope, KdfParams, RunnerKeypairResult } from './types.js';

// Cross-environment Base64 helpers
export function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Derive Key Encryption Key (KEK) using PBKDF2-SHA256 (600,000 iterations).
 */
export async function deriveKek(passphrase: string, salt: Uint8Array, iterations = 600000): Promise<CryptoKey> {
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a random 256-bit Data Encryption Key (DEK).
 */
export async function generateDek(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using AES-256-GCM with a fresh 96-bit IV.
 */
export async function encryptWithKey(
  plaintext: string | Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const data = typeof plaintext === 'string' ? encoder.encode(plaintext) : plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data as BufferSource
  );

  return {
    ciphertext: toBase64(encryptedBuffer),
    iv: toBase64(iv)
  };
}

/**
 * Decrypt AES-256-GCM ciphertext using key and IV.
 */
export async function decryptWithKey(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const ciphertext = fromBase64(ciphertextBase64);
  const iv = fromBase64(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Wrap DEK with KEK using AES-GCM wrapping.
 */
export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<{ wrappedDek: string; wrapIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawDek = await crypto.subtle.exportKey('raw', dek);
  
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    rawDek
  );

  return {
    wrappedDek: toBase64(wrapped),
    wrapIv: toBase64(iv)
  };
}

/**
 * Unwrap DEK with KEK.
 */
export async function unwrapDek(
  wrappedDekBase64: string,
  wrapIvBase64: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  const rawDekBytes = await decryptWithKey(wrappedDekBase64, wrapIvBase64, kek);
  return await crypto.subtle.importKey(
    'raw',
    rawDekBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * High-level Vault method: Encrypt credential client-side.
 * Plaintext NEVER leaves the caller's memory.
 */
export async function storeCredential(
  credentialPlaintext: string,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 600000;
  const kek = await deriveKek(passphrase, salt, iterations);
  const dek = await generateDek();

  const { ciphertext, iv } = await encryptWithKey(credentialPlaintext, dek);
  const { wrappedDek, wrapIv } = await wrapDek(dek, kek);

  const kdfParams: KdfParams = {
    salt: toBase64(salt),
    iterations,
    hash: 'SHA-256',
    algorithm: 'PBKDF2'
  };

  // Combine wrapIv into wrappedDek representation (wrapIv:wrappedDek)
  const combinedWrappedDek = `${wrapIv}:${wrappedDek}`;

  return {
    ciphertext,
    iv,
    wrappedDek: combinedWrappedDek,
    kdfParams,
    createdAt: new Date().toISOString(),
    version: 1
  };
}

/**
 * High-level Vault method: Unlock credential client-side.
 */
export async function unlockCredential(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<string> {
  const salt = fromBase64(envelope.kdfParams.salt);
  const kek = await deriveKek(passphrase, salt, envelope.kdfParams.iterations);

  const parts = envelope.wrappedDek.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid wrappedDek envelope structure');
  }
  const [wrapIv, wrappedData] = parts;
  const dek = await unwrapDek(wrappedData, wrapIv, kek);

  const decryptedBytes = await decryptWithKey(envelope.ciphertext, envelope.iv, dek);
  return decoder.decode(decryptedBytes);
}

/**
 * Ephemeral Runner Keypair generation (ECDH P-256 for universal runner compatibility).
 */
export async function generateRunnerKeypair(): Promise<RunnerKeypairResult> {
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  const spkiBuffer = await crypto.subtle.exportKey('spki', keypair.publicKey);
  return {
    publicKeyBase64: toBase64(spkiBuffer),
    privateKey: keypair.privateKey
  };
}

/**
 * Encrypt credential to ephemeral runner public key.
 */
export async function createRunnerEnvelope(
  credentialPlaintext: string,
  runnerPublicKeyBase64: string
): Promise<EphemeralEnvelope> {
  const runnerSpki = fromBase64(runnerPublicKeyBase64);
  const runnerPubKey = await crypto.subtle.importKey(
    'spki',
    runnerSpki as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Generate ephemeral sender keypair
  const senderKeypair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  // Derive shared AES-GCM key
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: runnerPubKey },
    senderKeypair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const { ciphertext, iv } = await encryptWithKey(credentialPlaintext, sharedKey);
  const senderSpki = await crypto.subtle.exportKey('spki', senderKeypair.publicKey);

  return {
    ciphertext,
    iv,
    ephemeralPublicKey: toBase64(senderSpki),
    createdAt: new Date().toISOString()
  };
}

/**
 * Decrypt ephemeral runner envelope on the runner using its ephemeral private key.
 */
export async function decryptRunnerEnvelope(
  envelope: EphemeralEnvelope,
  runnerPrivateKey: CryptoKey
): Promise<string> {
  const senderSpki = fromBase64(envelope.ephemeralPublicKey);
  const senderPubKey = await crypto.subtle.importKey(
    'spki',
    senderSpki as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderPubKey },
    runnerPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBytes = await decryptWithKey(envelope.ciphertext, envelope.iv, sharedKey);
  return decoder.decode(decryptedBytes);
}
