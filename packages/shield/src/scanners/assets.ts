import type { ComplianceFinding, ProjectContext } from '../types.js';

export function scanAssets(context: ProjectContext): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const fileList = context.files || [];

  const hasIcon = fileList.some(f => /icon|app-icon|logo/i.test(f));
  const hasSplash = fileList.some(f => /splash/i.test(f));

  if (!hasIcon) {
    findings.push({
      id: 'asset-master-icon-missing',
      rule: 'App Store & Google Play Asset Guidelines',
      title: 'Master App Icon (1024x1024) Not Found',
      description: 'Stores require a high-resolution 1024x1024 square master PNG. Missing icon prevents automated density generation.',
      severity: 'BLOCKER',
      fixType: 'guided',
      remediation: 'Upload a 1024x1024px square icon without alpha transparency.'
    });
  }

  if (!hasSplash) {
    findings.push({
      id: 'asset-splash-recommended',
      rule: 'Capacitor Experience Guidelines',
      title: 'Custom Splash Screen Recommended',
      description: 'No splash screen graphic detected. Airship can auto-generate an adaptive branded splash screen.',
      severity: 'WARNING',
      fixType: 'auto',
      remediation: 'Auto-scaffold splash screen asset matching your primary brand color.'
    });
  }

  return findings;
}
