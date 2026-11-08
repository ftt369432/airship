import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from './server.js';

test('API: Full autonomous deployment pipeline workflow', async () => {
  const server = buildServer();

  // 1. Create Project
  const projectRes = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: {
      name: 'Airship Reference Test App',
      bundleId: 'com.airship.testapp',
      sourceType: 'url',
      sourceRef: 'https://test.airship.dev',
      webDir: 'dist'
    }
  });

  assert.equal(projectRes.statusCode, 201);
  const project = JSON.parse(projectRes.body);
  assert.ok(project.id);
  assert.equal(project.bundleId, 'com.airship.testapp');

  // 2. Trigger Compliance Shield Scan
  const complianceRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/compliance/scan`
  });
  assert.equal(complianceRes.statusCode, 200);
  const report = JSON.parse(complianceRes.body);
  assert.ok(report.score >= 0);
  assert.ok(Array.isArray(report.findings));

  // 2b. Trigger Physical Brand Icon Save & 1-Click Compliance Remediation on Disk
  const brandRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/brand`,
    payload: {
      iconDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC'
    }
  });
  assert.equal(brandRes.statusCode, 200);
  const brandData = JSON.parse(brandRes.body);
  assert.equal(brandData.success, true);
  assert.ok(brandData.bytesWritten > 0);

  const remediateRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/compliance/remediate`,
    payload: { findingId: 'all' }
  });
  assert.equal(remediateRes.statusCode, 200);
  const remediatedReport = JSON.parse(remediateRes.body);
  assert.equal(remediatedReport.score, 100);
  assert.equal(remediatedReport.blockers, 0);
  assert.ok(Array.isArray(remediatedReport.remediatedFiles));
  assert.ok(remediatedReport.remediatedFiles.length >= 4);

  // 3. Save Store Connection (Vault Ciphertext)
  const vaultRes = await server.inject({
    method: 'POST',
    url: '/api/store-connections',
    payload: {
      store: 'play',
      label: 'Google Play Release Key',
      ciphertext: 'BASE64_CIPHERTEXT_MOCK',
      iv: 'BASE64_IV_MOCK',
      wrappedDek: 'WRAPPED_DEK_MOCK',
      kdfParams: { salt: 'SALT_MOCK', iterations: 600000, hash: 'SHA-256' }
    }
  });
  assert.equal(vaultRes.statusCode, 201);
  const connection = JSON.parse(vaultRes.body);
  assert.ok(connection.id);
  assert.equal(connection.store, 'play');
  // Crucial security check: Ciphertext MUST NOT leak in list/create response
  assert.equal(connection.ciphertext, undefined);

  // 3b. Verify Client-Side Decryption Envelope Retrieval
  const envRes = await server.inject({
    method: 'GET',
    url: `/api/store-connections/${connection.id}/envelope`
  });
  assert.equal(envRes.statusCode, 200);
  const envelope = JSON.parse(envRes.body);
  assert.equal(envelope.ciphertext, 'BASE64_CIPHERTEXT_MOCK');
  assert.equal(envelope.iv, 'BASE64_IV_MOCK');

  // 4. Dispatch Android Build Job
  const buildRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/builds`,
    payload: {
      platform: 'android',
      versionName: '1.0.0',
      versionCode: 1,
      track: 'internal'
    }
  });
  assert.equal(buildRes.statusCode, 201);
  const build = JSON.parse(buildRes.body);
  assert.ok(build.id);
  assert.equal(build.state, 'queued');

  // 5. Ingest Runner Event containing a secret and verify redaction
  const eventRes = await server.inject({
    method: 'POST',
    url: `/api/builds/${build.id}/events`,
    payload: {
      level: 'info',
      message: 'Signing bundle with key: -----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----',
      transitionTo: 'preparing'
    }
  });
  assert.equal(eventRes.statusCode, 201);
  const event = JSON.parse(eventRes.body);
  assert.ok(!event.message.includes('-----BEGIN PRIVATE KEY-----'));
  assert.ok(event.message.includes('[REDACTED_PRIVATE_KEY]'));

  // 6. Verify State Transition
  const projectGetRes = await server.inject({
    method: 'GET',
    url: `/api/projects/${project.id}`
  });
  const detail = JSON.parse(projectGetRes.body);
  assert.equal(detail.builds[0].state, 'preparing');

  // 7. Verify Artifact Download (Authentic signed zip/aab)
  const artifactRes = await server.inject({
    method: 'GET',
    url: `/artifacts/${project.bundleId}-v1.0.0.aab`
  });
  assert.equal(artifactRes.statusCode, 200);
  assert.equal(artifactRes.headers['content-type'], 'application/octet-stream');
  assert.ok(artifactRes.rawPayload.length > 100);
  // Verify PKZIP magic bytes (0x50, 0x4b, 0x03, 0x04)
  assert.equal(artifactRes.rawPayload[0], 0x50);
  assert.equal(artifactRes.rawPayload[1], 0x4b);

  // 8. Trigger Store Publish
  const publishRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/publish`,
    payload: {
      track: 'internal',
      connectionId: connection.id
    }
  });
  assert.equal(publishRes.statusCode, 200);
  const publishData = JSON.parse(publishRes.body);
  assert.ok(publishData.submissionId);
  assert.equal(publishData.status, 'submitted');
  assert.equal(publishData.reviewStatus, 'live_internal');
  assert.ok(publishData.logs.length > 0);

  // 9. Trigger Web Deploy to Cloudflare Pages
  const cfRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/deploy-web`,
    payload: {
      provider: 'cloudflare',
      siteName: 'sutraflow-cf-test'
    }
  });
  assert.equal(cfRes.statusCode, 200);
  const cfData = JSON.parse(cfRes.body);
  assert.ok(cfData.id);
  assert.equal(cfData.provider, 'cloudflare');
  assert.ok(cfData.url.includes('.pages.dev'));
  assert.equal(cfData.status, 'live');
  assert.ok(cfData.logs.length > 0);

  // 10. Trigger Web Deploy to Netlify
  const netlifyRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/deploy-web`,
    payload: {
      provider: 'netlify',
      siteName: 'genieflow-netlify-test'
    }
  });
  assert.equal(netlifyRes.statusCode, 200);
  const netlifyData = JSON.parse(netlifyRes.body);
  assert.ok(netlifyData.id);
  assert.equal(netlifyData.provider, 'netlify');
  assert.ok(netlifyData.url.includes('.netlify.app'));
  assert.equal(netlifyData.status, 'live');
  assert.ok(netlifyData.logs.length > 0);
});
