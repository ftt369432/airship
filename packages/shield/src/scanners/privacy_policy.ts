import type { ComplianceFinding, ProjectContext } from '../types.js';

const TRACKING_SDK_PACKAGES = [
  'posthog-js',
  '@sentry/react',
  '@sentry/browser',
  'mixpanel-browser',
  'firebase/analytics',
  'datadog',
  'amplitude-js'
];

export function scanPrivacyPolicy(context: ProjectContext): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const deps = {
    ...context.packageJson?.dependencies,
    ...context.packageJson?.devDependencies
  };

  const detectedTracking = TRACKING_SDK_PACKAGES.filter(pkg => Boolean(deps[pkg]));
  const fileList = context.files || [];
  const hasPrivacyDoc = fileList.some(f => /privacy.*\.md|privacy.*\.html|privacy-policy/i.test(f));

  if (!hasPrivacyDoc) {
    findings.push({
      id: 'store-privacy-policy-missing',
      rule: 'Apple 5.1.1 & Google Play Data Safety',
      title: 'Missing Privacy Policy Document',
      description: 'App Store and Google Play require an active, public Privacy Policy URL covering data collection, third-party analytics, and retention.',
      severity: 'BLOCKER',
      fixType: 'auto',
      remediation: 'Generate a hosted Privacy Policy customized to the detected SDKs and network behavior.',
      actionPayload: {
        detectedSdkCount: detectedTracking.length,
        detectedSdks: detectedTracking,
        generatedPolicyTemplate: `# Privacy Policy
Last Updated: ${new Date().toISOString().split('T')[0]}

## 1. Information We Collect
We collect minimal information necessary to deliver application functionality.
${detectedTracking.length > 0 ? `### Analytics & Telemetry\nWe utilize ${detectedTracking.join(', ')} to monitor application performance and diagnose runtime stability.` : '### Telemetry\nWe do not engage in third-party user behavioral tracking.'}

## 2. Data Retention & Deletion
Users retain full sovereignty over their records. You may request immediate deletion of all account data at any time directly through the application settings or by contacting our team.

## 3. Contact
For privacy inquiries, contact the application administrator.`
      }
    });
  } else {
    findings.push({
      id: 'privacy-policy-detected',
      rule: 'Apple 5.1.1 & Google Play Data Safety',
      title: 'Privacy Policy Document Detected',
      description: 'Local Privacy Policy file found in project repository.',
      severity: 'INFO',
      fixType: 'manual'
    });
  }

  return findings;
}
