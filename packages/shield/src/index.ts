import type { ComplianceFinding, ComplianceReport, ProjectContext } from './types.js';
import { scanGuideline42 } from './scanners/guideline_42.js';
import { scanAccountDeletion } from './scanners/account_deletion.js';
import { scanPrivacyPolicy } from './scanners/privacy_policy.js';
import { scanAssets } from './scanners/assets.js';
import { calculateComplianceReport } from './scoring.js';

export * from './types.js';
export * from './scoring.js';
export * from './scanners/guideline_42.js';
export * from './scanners/account_deletion.js';
export * from './scanners/privacy_policy.js';
export * from './scanners/assets.js';

/**
 * Execute full autonomous compliance scan on an ingested project.
 */
export async function runComplianceScan(context: ProjectContext): Promise<ComplianceReport> {
  const findings: ComplianceFinding[] = [
    ...scanGuideline42(context),
    ...scanAccountDeletion(context),
    ...scanPrivacyPolicy(context),
    ...scanAssets(context)
  ];

  return calculateComplianceReport(findings);
}
