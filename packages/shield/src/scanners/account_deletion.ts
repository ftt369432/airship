import type { ComplianceFinding, ProjectContext } from '../types.js';

const AUTH_PACKAGES = [
  '@supabase/supabase-js',
  'firebase',
  '@firebase/auth',
  '@auth0/auth0-react',
  '@clerk/clerk-react',
  'next-auth',
  '@lucia-auth/adapter-postgresql',
  'aws-amplify'
];

export function scanAccountDeletion(context: ProjectContext): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const deps = {
    ...context.packageJson?.dependencies,
    ...context.packageJson?.devDependencies
  };

  const hasAuthPackage = AUTH_PACKAGES.some(pkg => Boolean(deps[pkg]));
  const fileList = context.files || [];
  const hasAuthFiles = fileList.some(f => 
    /auth|login|signup|register|user-profile/i.test(f)
  );

  const hasAccountCreation = hasAuthPackage || hasAuthFiles;

  if (hasAccountCreation) {
    // Check if account deletion is implemented
    let hasDeletionMechanism = false;
    if (context.fileContents) {
      for (const content of Object.values(context.fileContents)) {
        if (/delete_user|deleteUser|deleteAccount|delete-account|account\/delete/i.test(content)) {
          hasDeletionMechanism = true;
          break;
        }
      }
    }

    if (!hasDeletionMechanism) {
      findings.push({
        id: 'apple-5.1.1-account-deletion',
        rule: 'Apple 5.1.1(v) & Google Play Account Deletion Policy',
        title: 'Mandatory In-App Account Deletion Missing',
        description: 'Your app supports user registration/authentication, but no in-app account deletion flow was detected. Both Apple and Google reject apps that allow account creation without a permanent self-serve deletion option.',
        severity: 'BLOCKER',
        fixType: 'auto',
        remediation: 'Inject the standardized Account Deletion modal and serverless webhook deletion handler.',
        actionPayload: {
          modalComponentSnippet: `// Drop-in Account Deletion Dialog:
export function AccountDeletionModal({ isOpen, onConfirm, onCancel }: any) {
  if (!isOpen) return null;
  return (
    <div className="airship-modal-overlay">
      <div className="airship-modal-card">
        <h3>Delete Account & Data</h3>
        <p>This action is permanent and deletes all your stored health/app records.</p>
        <button onClick={onConfirm} className="btn-danger">Confirm Delete</button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}`
        }
      });
    } else {
      findings.push({
        id: 'apple-5.1.1-compliant',
        rule: 'Apple 5.1.1(v)',
        title: 'In-App Account Deletion Verified',
        description: 'Account deletion flow detected in client/server code. Meets Apple and Google Play store mandates.',
        severity: 'INFO',
        fixType: 'manual'
      });
    }
  }

  return findings;
}
