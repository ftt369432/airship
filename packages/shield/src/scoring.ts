import type { ComplianceFinding, ComplianceReport } from './types.js';

/**
 * Calculates weighted compliance readiness score.
 * Base 100:
 * - BLOCKER: -25 points
 * - WARNING: -10 points
 * - INFO: -0 points
 * Minimum score: 0
 */
export function calculateComplianceReport(findings: ComplianceFinding[]): ComplianceReport {
  let score = 100;
  let blockers = 0;
  let warnings = 0;

  for (const finding of findings) {
    if (finding.severity === 'BLOCKER') {
      blockers += 1;
      score -= 25;
    } else if (finding.severity === 'WARNING') {
      warnings += 1;
      score -= 10;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let summary = '';
  if (blockers === 0 && warnings === 0) {
    summary = '100% Store Ready — Zero policy blockers or guideline warnings detected.';
  } else if (blockers === 0) {
    summary = `Ready with ${warnings} advisory warning(s). Safe to submit, but optimizations available.`;
  } else {
    summary = `Action Required: ${blockers} critical blocker(s) detected that risk store rejection.`;
  }

  return {
    score,
    blockers,
    warnings,
    findings,
    timestamp: new Date().toISOString(),
    summary
  };
}
