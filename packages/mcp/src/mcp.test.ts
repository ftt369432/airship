import test from 'node:test';
import assert from 'node:assert/strict';
import { AirshipMcpServer } from './server.js';

test('MCP: Lists all 8 core tools per Rule 12', () => {
  const server = new AirshipMcpServer();
  const tools = server.getTools();
  assert.equal(tools.length, 8);

  const toolNames = tools.map(t => t.name);
  assert.ok(toolNames.includes('airship_create_project'));
  assert.ok(toolNames.includes('airship_compliance_scan'));
  assert.ok(toolNames.includes('airship_build_android'));
  assert.ok(toolNames.includes('airship_build_ios'));
  assert.ok(toolNames.includes('airship_submit_play'));
  assert.ok(toolNames.includes('airship_submit_testflight'));
  assert.ok(toolNames.includes('airship_provision_revenuecat'));
  assert.ok(toolNames.includes('airship_deploy_web'));
});

test('MCP: Dispatches airship_create_project, airship_compliance_scan, and airship_deploy_web', async () => {
  const server = new AirshipMcpServer();

  // 1. Create Project
  const createRes = await server.callTool('airship_create_project', {
    name: 'MCP Test App',
    bundleId: 'com.airship.mcptest',
    sourceType: 'url',
    sourceRef: 'https://test.airship.dev'
  });
  assert.equal(createRes.isError, undefined);
  const createData = JSON.parse(createRes.content[0].text);
  assert.ok(createData.projectId);
  assert.equal(createData.bundleId, 'com.airship.mcptest');

  // 2. Compliance Scan
  const scanRes = await server.callTool('airship_compliance_scan', {
    projectId: createData.projectId
  });
  assert.equal(scanRes.isError, undefined);
  const scanData = JSON.parse(scanRes.content[0].text);
  assert.ok(scanData.score >= 0);
  assert.ok(Array.isArray(scanData.findings));

  // 3. Web Deployment (Cloudflare Pages)
  const webRes = await server.callTool('airship_deploy_web', {
    projectId: createData.projectId,
    provider: 'cloudflare',
    siteName: 'sutraflow-demo'
  });
  assert.equal(webRes.isError, undefined);
  const webData = JSON.parse(webRes.content[0].text);
  assert.ok(webData.deploymentId);
  assert.equal(webData.provider, 'cloudflare');
  assert.equal(webData.url, 'https://sutraflow-demo.pages.dev');
  assert.equal(webData.status, 'live');
});
