import test from 'node:test';
import assert from 'node:assert/strict';
import {
  storeCredential,
  unlockCredential,
  generateRunnerKeypair,
  createRunnerEnvelope,
  decryptRunnerEnvelope,
  LogRedactor
} from './index.js';

test('Vault: Client-side credential encryption and unlocking', async () => {
  const secretData = JSON.stringify({
    type: 'service_account',
    project_id: 'airship-test-project',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'
  });
  const passphrase = 'SuperSecureUserPassphrase2026!';

  // Encrypt
  const envelope = await storeCredential(secretData, passphrase);
  assert.ok(envelope.ciphertext);
  assert.ok(envelope.iv);
  assert.ok(envelope.wrappedDek);
  assert.equal(envelope.kdfParams.algorithm, 'PBKDF2');
  assert.equal(envelope.kdfParams.iterations, 600000);

  // Decrypt with correct passphrase
  const unlocked = await unlockCredential(envelope, passphrase);
  assert.equal(unlocked, secretData);

  // Decrypt with wrong passphrase should fail
  await assert.rejects(
    async () => {
      await unlockCredential(envelope, 'WrongPassphrase123');
    },
    /operation failed|bad decrypt|decrypt/i
  );
});

test('Vault: Ephemeral runner envelope re-encryption', async () => {
  const runnerKeypair = await generateRunnerKeypair();
  assert.ok(runnerKeypair.publicKeyBase64);
  assert.ok(runnerKeypair.privateKey);

  const payload = 'TEST_APPLE_P8_KEY_SECRET_CONTENT_12345';
  const envelope = await createRunnerEnvelope(payload, runnerKeypair.publicKeyBase64);
  assert.ok(envelope.ciphertext);
  assert.ok(envelope.ephemeralPublicKey);

  // Runner decrypts in memory
  const decrypted = await decryptRunnerEnvelope(envelope, runnerKeypair.privateKey);
  assert.equal(decrypted, payload);
});

test('Redactor: Scans and replaces sensitive secrets', () => {
  const rawLog = `
Executing Fastlane supply...
Loaded Apple Key:
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----
Using Google Service Account: {"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBA...\\n-----END PRIVATE KEY-----\\n"}
RevenueCat Key: appl_9837492837498273498273948
Supabase JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
Command line: fastlane pilot --password MySuperSecretPassword123
Dynamic Injected Token: CustomEphemeralSecretToken9988
`;

  const dynamicSecret = 'CustomEphemeralSecretToken9988';
  const redactor = new LogRedactor([dynamicSecret]);
  const cleaned = redactor.redact(rawLog);

  assert.ok(!cleaned.includes('-----BEGIN PRIVATE KEY-----'));
  assert.ok(cleaned.includes('[REDACTED_PRIVATE_KEY]'));
  assert.ok(cleaned.includes('[REDACTED_GOOGLE_PRIVATE_KEY]'));
  assert.ok(cleaned.includes('[REDACTED_REVENUECAT_KEY]'));
  assert.ok(cleaned.includes('[REDACTED_JWT_TOKEN]'));
  assert.ok(cleaned.includes('[REDACTED_PASSWORD]'));
  assert.ok(!cleaned.includes('CustomEphemeralSecretToken9988'));
  assert.ok(cleaned.includes('[REDACTED_SECRET]'));
});
