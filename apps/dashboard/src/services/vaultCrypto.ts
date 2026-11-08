// Browser-native Web Crypto API implementation for Airship Zero-Knowledge Vault
export interface EncryptedVaultEnvelope {
  ciphertext: string;
  iv: string;
  wrappedDek: string;
  kdfParams: {
    salt: string;
    iterations: number;
    hash: string;
    algorithm: string;
  };
  createdAt: string;
  version: number;
}

export function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function deriveKek(passphrase: string, salt: Uint8Array, iterations = 600000): Promise<CryptoKey> {
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
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

export async function storeCredential(
  credentialPlaintext: string,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iterations = 600000;
  const kek = await deriveKek(passphrase, salt, iterations);

  const dek = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(credentialPlaintext);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    data
  );

  const wrapIv = window.crypto.getRandomValues(new Uint8Array(12));
  const rawDek = await window.crypto.subtle.exportKey('raw', dek);
  const wrappedDekBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv },
    kek,
    rawDek
  );

  return {
    ciphertext: toBase64(encryptedBuffer),
    iv: toBase64(iv),
    wrappedDek: `${toBase64(wrapIv)}:${toBase64(wrappedDekBuffer)}`,
    kdfParams: {
      salt: toBase64(salt),
      iterations,
      hash: 'SHA-256',
      algorithm: 'PBKDF2'
    },
    createdAt: new Date().toISOString(),
    version: 1
  };
}

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
  const [wrapIvBase64, wrappedDataBase64] = parts;
  const wrapIv = fromBase64(wrapIvBase64);
  const wrappedData = fromBase64(wrappedDataBase64);

  const rawDek = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    kek,
    wrappedData as BufferSource
  );

  const dek = await window.crypto.subtle.importKey(
    'raw',
    rawDek,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const ciphertext = fromBase64(envelope.ciphertext);
  const iv = fromBase64(envelope.iv);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    dek,
    ciphertext as BufferSource
  );

  return decoder.decode(decryptedBytes);
}

