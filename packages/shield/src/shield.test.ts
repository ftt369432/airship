import test from 'node:test';
import assert from 'node:assert/strict';
import { runComplianceScan } from './index.js';
import type { ProjectContext } from './types.js';

test('Shield: Scans bare web project and detects critical store blockers', async () => {
  const bareContext: ProjectContext = {
    projectPath: '/test/bare-app',
    files: ['index.html', 'src/main.js'],
    packageJson: {
      dependencies: {
        'react': '^19.0.0'
      }
    }
  };

  const report = await runComplianceScan(bareContext);
  assert.ok(report.score < 100);
  assert.ok(report.blockers >= 2); // Guideline 4.2 + Missing Privacy Policy + Missing Icon

  const blockerIds = report.findings.map(f => f.id);
  assert.ok(blockerIds.includes('apple-4.2-minimum-functionality'));
  assert.ok(blockerIds.includes('store-privacy-policy-missing'));
  assert.ok(blockerIds.includes('asset-master-icon-missing'));
});

test('Shield: Scans fully equipped native app and awards 100% store readiness', async () => {
  const readyContext: ProjectContext = {
    projectPath: '/test/ready-app',
    files: [
      'index.html',
      'src/main.js',
      'public/icon.png',
      'public/splash.png',
      'PRIVACY_POLICY.md'
    ],
    packageJson: {
      dependencies: {
        'react': '^19.0.0',
        '@capacitor/core': '^7.0.0',
        '@capacitor/haptics': '^7.0.0',
        '@capacitor/share': '^7.0.0',
        '@revenuecat/purchases-capacitor': '^11.3.0',
        '@supabase/supabase-js': '^2.49.0'
      }
    },
    fileContents: {
      'src/services/auth.ts': `
        export async function deleteUserAccount(userId: string) {
          await supabase.rpc('delete_user', { user_id: userId });
        }
      `
    }
  };

  const report = await runComplianceScan(readyContext);
  assert.equal(report.blockers, 0);
  assert.equal(report.score, 100);
  assert.ok(report.summary.includes('100% Store Ready'));
});
