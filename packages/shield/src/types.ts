export type FindingSeverity = 'BLOCKER' | 'WARNING' | 'INFO';
export type FixType = 'auto' | 'guided' | 'manual';

export interface ComplianceFinding {
  id: string;
  rule: string;                   // E.g. "Apple Guideline 4.2", "Apple 5.1.1(v)", "Google Play Data Safety"
  title: string;
  description: string;
  severity: FindingSeverity;
  fixType: FixType;
  remediation?: string;           // Actionable explanation
  actionPayload?: Record<string, unknown>; // Data needed for 1-click injection or generation
}

export interface ComplianceReport {
  score: number;                  // 0 to 100
  blockers: number;
  warnings: number;
  findings: ComplianceFinding[];
  timestamp: string;
  summary: string;
}

export interface ProjectContext {
  projectPath: string;
  files: string[];
  packageJson?: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
  };
  capacitorConfig?: Record<string, unknown>;
  fileContents?: Record<string, string>; // Sample snippets or key file contents
}
