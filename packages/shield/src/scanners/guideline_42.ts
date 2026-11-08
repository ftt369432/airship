import type { ComplianceFinding, ProjectContext } from '../types.js';

const NATIVE_CAPACITOR_PLUGINS = [
  '@capacitor/push-notifications',
  '@capacitor/haptics',
  '@capacitor/share',
  '@revenuecat/purchases-capacitor',
  '@capacitor/network',
  '@capacitor/preferences',
  '@capacitor/camera',
  '@capacitor/local-notifications',
  '@capacitor/geolocation',
  '@capacitor/device',
  '@capacitor/biometrics',
  '@capacitor/app'
];

export function scanGuideline42(context: ProjectContext): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const deps = {
    ...context.packageJson?.dependencies,
    ...context.packageJson?.devDependencies
  };

  const detectedPlugins = NATIVE_CAPACITOR_PLUGINS.filter(pkg => Boolean(deps[pkg]));

  if (detectedPlugins.length === 0) {
    findings.push({
      id: 'apple-4.2-minimum-functionality',
      rule: 'Apple Guideline 4.2 (Minimum Functionality)',
      title: 'Missing Native Capabilities (Rejection Risk)',
      description: 'Your application contains no native hardware or system plugins. Apple routinely rejects pure web wrappers under Guideline 4.2 for failing to provide differentiated native functionality.',
      severity: 'BLOCKER',
      fixType: 'auto',
      remediation: 'Inject at least 2 native capabilities (e.g. Native Haptic Feedback and Native Share or Push Notifications).',
      actionPayload: {
        suggestedPlugins: [
          '@capacitor/haptics',
          '@capacitor/share',
          '@capacitor/network'
        ],
        codeSnippet: `// 1-Click Injection Example:
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export async function triggerNativeFeedback() {
  await Haptics.impact({ style: ImpactStyle.Medium });
}
export async function triggerNativeShare(title: string, url: string) {
  await Share.share({ title, url, dialogTitle: 'Share with friends' });
}`
      }
    });
  } else if (detectedPlugins.length === 1 && detectedPlugins[0] === '@capacitor/app') {
    findings.push({
      id: 'apple-4.2-low-native-presence',
      rule: 'Apple Guideline 4.2',
      title: 'Low Native Plugin Footprint',
      description: 'Only the base @capacitor/app plugin was detected. Adding push notifications, offline detection, or haptics significantly increases store approval velocity.',
      severity: 'WARNING',
      fixType: 'guided',
      remediation: 'Consider adding @capacitor/haptics or @capacitor/network.'
    });
  } else {
    findings.push({
      id: 'apple-4.2-compliant',
      rule: 'Apple Guideline 4.2',
      title: 'Native Hardware Integration Verified',
      description: `Detected ${detectedPlugins.length} native plugin(s): ${detectedPlugins.join(', ')}. App demonstrates native capability.`,
      severity: 'INFO',
      fixType: 'manual'
    });
  }

  return findings;
}
