/**
 * Production Log Redactor (Rule 7: Zero-Knowledge Secrets Custody)
 * Masks secrets from build logs, console output, and telemetry before persistence.
 */

const STATIC_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Google Cloud Service Account JSON private_key field
  {
    pattern: /"private_key":\s*"[^"]*BEGIN PRIVATE KEY[^"]*"/g,
    replacement: '"private_key": "[REDACTED_GOOGLE_PRIVATE_KEY]"'
  },
  // Google Cloud client_email or private_key_id when coupled
  {
    pattern: /"private_key_id":\s*"[a-f0-9]{30,}"/g,
    replacement: '"private_key_id": "[REDACTED_KEY_ID]"'
  },
  // PKCS#8, RSA, EC Private Keys (e.g. Apple .p8 keys, upload keystores)
  {
    pattern: /-----BEGIN\s+([A-Z0-9 ]*PRIVATE\s+KEY|ENCRYPTED\s+PRIVATE\s+KEY)-----[\s\S]*?-----END\s+\1-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]'
  },
  // X.509 Certificates
  {
    pattern: /-----BEGIN\s+CERTIFICATE-----[\s\S]*?-----END\s+CERTIFICATE-----/g,
    replacement: '[REDACTED_CERTIFICATE]'
  },
  // RevenueCat Secret and Store Keys
  {
    pattern: /\b(appl|goog|sec)_[a-zA-Z0-9_-]{20,}\b/g,
    replacement: '[REDACTED_REVENUECAT_KEY]'
  },
  // JWT Tokens (Supabase Service Role, Auth Headers, App Store Connect JWT)
  {
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replacement: '[REDACTED_JWT_TOKEN]'
  },
  // GitHub Tokens (ghp_, ghs_, gho_, ghu_)
  {
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]'
  },
  // Keystore / Store passwords in CLI commands (e.g. -storepass <pass>, -keypass <pass>)
  {
    pattern: /(-storepass|-keypass|--password|--api-key)\s+([^\s]+)/gi,
    replacement: '$1 [REDACTED_PASSWORD]'
  },
  // Generic Bearer headers
  {
    pattern: /(Authorization:\s*Bearer\s+)[^\s]+/gi,
    replacement: '$1[REDACTED_BEARER_TOKEN]'
  }
];

export class LogRedactor {
  private dynamicSecrets: Set<string> = new Set();

  constructor(initialSecrets?: string[]) {
    if (initialSecrets) {
      this.registerSecrets(initialSecrets);
    }
  }

  /**
   * Register dynamic secrets for exact-byte scrubbing during a build job.
   */
  public registerSecrets(secrets: string[]): void {
    for (const secret of secrets) {
      if (secret && secret.trim().length >= 5) {
        this.dynamicSecrets.add(secret.trim());
      }
    }
  }

  /**
   * Clear dynamic secrets after build job termination.
   */
  public clearDynamicSecrets(): void {
    this.dynamicSecrets.clear();
  }

  /**
   * Redact sensitive information from a raw log message.
   */
  public redact(message: string): string {
    if (!message) return '';

    let redacted = message;

    // 1. Dynamic exact-byte scrubbing (replaces known secrets first)
    for (const secret of this.dynamicSecrets) {
      if (redacted.includes(secret)) {
        redacted = redacted.split(secret).join('[REDACTED_SECRET]');
      }
    }

    // 2. Static regex pattern scrubbing
    for (const { pattern, replacement } of STATIC_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }
}

// Global singleton instance for quick utility calls
export const defaultRedactor = new LogRedactor();

export function redactLog(message: string, dynamicSecrets?: string[]): string {
  if (dynamicSecrets && dynamicSecrets.length > 0) {
    const redactor = new LogRedactor(dynamicSecrets);
    return redactor.redact(message);
  }
  return defaultRedactor.redact(message);
}
