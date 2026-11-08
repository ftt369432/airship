import { create } from 'zustand';

export interface Finding {
  id: string;
  rule: string;
  title: string;
  description: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  fixType: 'auto' | 'guided' | 'manual';
  remediation?: string;
  actionPayload?: Record<string, unknown>;
}

interface ComplianceState {
  score: number;
  blockers: number;
  warnings: number;
  findings: Finding[];
  summary: string;
  isScanning: boolean;
  setReport: (score: number, blockers: number, warnings: number, findings: Finding[], summary: string) => void;
  resolveFinding: (id: string) => void;
  setIsScanning: (scanning: boolean) => void;
}

export const useComplianceStore = create<ComplianceState>((set) => ({
  score: 85,
  blockers: 1,
  warnings: 1,
  findings: [
    {
      id: 'apple-4.2-minimum-functionality',
      rule: 'Apple Guideline 4.2',
      title: 'Missing Native Capabilities (Rejection Risk)',
      description: 'Your web app lacks native hardware hooks (Haptics, Native Share, Push Notifications).',
      severity: 'BLOCKER',
      fixType: 'auto',
      remediation: '1-Click inject @capacitor/haptics and @capacitor/share.'
    },
    {
      id: 'store-privacy-policy-missing',
      rule: 'Apple 5.1.1 & Google Play Data Safety',
      title: 'Missing Privacy Policy URL',
      description: 'An active, public Privacy Policy URL is mandatory for store publication.',
      severity: 'WARNING',
      fixType: 'auto',
      remediation: 'Auto-generate and host Privacy Policy Markdown.'
    }
  ],
  summary: '1 critical blocker detected. Remediate with 1-click injection before submitting.',
  isScanning: false,
  setReport: (score, blockers, warnings, findings, summary) =>
    set({ score, blockers, warnings, findings, summary }),
  resolveFinding: (id) =>
    set((state) => {
      const updatedFindings = state.findings.filter((f) => f.id !== id);
      const blockers = updatedFindings.filter((f) => f.severity === 'BLOCKER').length;
      const warnings = updatedFindings.filter((f) => f.severity === 'WARNING').length;
      const score = Math.max(0, 100 - blockers * 25 - warnings * 10);
      return {
        findings: updatedFindings,
        blockers,
        warnings,
        score,
        summary:
          blockers === 0
            ? '100% Store Ready — Zero policy blockers detected.'
            : `${blockers} blocker(s) remaining.`
      };
    }),
  setIsScanning: (isScanning) => set({ isScanning })
}));
