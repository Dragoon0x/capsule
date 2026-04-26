/**
 * Sensitive-info detector. Pure function. Designed to flag the most common
 * "oh no I'm about to send my AWS key to an LLM" cases. Intentionally
 * conservative — false positives are better than false negatives here.
 */

export type SecretKind =
  | 'aws-access-key-id'
  | 'aws-secret-key'
  | 'github-token'
  | 'openai-key'
  | 'anthropic-key'
  | 'slack-token'
  | 'google-api-key'
  | 'jwt'
  | 'rsa-private-key'
  | 'ssh-private-key'
  | 'generic-api-key'
  | 'ssn-us'
  | 'credit-card'
  | 'email-list'
  | 'ipv4-private';

export interface SecretFinding {
  kind: SecretKind;
  label: string;
  match: string;
  startsAt: number;
  /** Severity: 'high' = almost certainly a credential; 'medium' = likely; 'low' = informational */
  severity: 'low' | 'medium' | 'high';
}

interface Detector {
  kind: SecretKind;
  label: string;
  pattern: RegExp;
  severity: SecretFinding['severity'];
  /** Optional gate: false → skip a regex match (e.g. additional Luhn check). */
  gate?: (match: string) => boolean;
}

function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  const parity = digits.length % 2;
  for (let i = 0; i < digits.length; i += 1) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (i % 2 === parity) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const DETECTORS: Detector[] = [
  {
    kind: 'aws-access-key-id',
    label: 'AWS access key ID',
    severity: 'high',
    pattern: /\b(?:AKIA|ASIA|AGPA|AIDA|ANPA|ANVA|AROA|APKA)[0-9A-Z]{16}\b/g,
  },
  {
    kind: 'aws-secret-key',
    label: 'AWS secret key',
    severity: 'high',
    // Heuristic: 40-char base64-ish following an obvious key context. Avoid bare 40-char tokens.
    pattern:
      /(?:aws[_-]?(?:secret[_-]?access[_-]?key|secret[_-]?key|sak)\s*[:=]\s*['"]?)([A-Za-z0-9/+=]{40})/gi,
  },
  {
    kind: 'github-token',
    label: 'GitHub token',
    severity: 'high',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,251}\b/g,
  },
  {
    kind: 'openai-key',
    label: 'OpenAI API key',
    severity: 'high',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    kind: 'anthropic-key',
    label: 'Anthropic API key',
    severity: 'high',
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    kind: 'slack-token',
    label: 'Slack token',
    severity: 'high',
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    kind: 'google-api-key',
    label: 'Google API key',
    severity: 'high',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    kind: 'jwt',
    label: 'JWT',
    severity: 'medium',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    kind: 'rsa-private-key',
    label: 'Private key block',
    severity: 'high',
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY-----/g,
  },
  {
    kind: 'ssh-private-key',
    label: 'SSH private key',
    severity: 'high',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
  },
  {
    kind: 'generic-api-key',
    label: 'Possible secret in assignment',
    severity: 'low',
    // Looks for `(api_key|secret|token|password)\s*[:=]\s*['"<value>][20+ chars]`.
    // Low severity because false positives are common.
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|secret|password|passwd|auth[_-]?token|client[_-]?secret)\s*[:=]\s*['"]([A-Za-z0-9_\-+/=.]{16,})['"]/gi,
  },
  {
    kind: 'ssn-us',
    label: 'US Social Security Number',
    severity: 'medium',
    // Avoid matching patterns like 000-00-0000 or version numbers.
    pattern: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  },
  {
    kind: 'credit-card',
    label: 'Credit card number',
    severity: 'high',
    // Flexible spacing/dashes; gated on Luhn.
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    gate: (m) => luhnValid(m),
  },
  {
    kind: 'email-list',
    label: 'Email address',
    severity: 'low',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
];

export function scanForSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  if (!text) return findings;
  const seen = new Set<string>(); // dedupe overlapping matches
  for (const det of DETECTORS) {
    let m: RegExpExecArray | null;
    det.pattern.lastIndex = 0;
    m = det.pattern.exec(text);
    while (m !== null) {
      const matched = m[0];
      if (det.gate && !det.gate(matched)) {
        m = det.pattern.exec(text);
        continue;
      }
      const key = `${det.kind}:${m.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          kind: det.kind,
          label: det.label,
          match: matched,
          startsAt: m.index,
          severity: det.severity,
        });
      }
      m = det.pattern.exec(text);
    }
  }
  // Sort by position for stable output.
  findings.sort((a, b) => a.startsAt - b.startsAt);
  return findings;
}

/** Redact a finding to its first/last 2 chars: `AKIA12…XYZW` */
export function redact(match: string): string {
  if (match.length <= 6) return '••••';
  return `${match.slice(0, 2)}…${match.slice(-2)}`;
}

/** Replace all findings in text with redacted placeholders. */
export function redactText(text: string, findings: SecretFinding[]): string {
  if (findings.length === 0) return text;
  // Walk in reverse so earlier offsets stay valid.
  const ordered = [...findings].sort((a, b) => b.startsAt - a.startsAt);
  let out = text;
  for (const f of ordered) {
    out = out.slice(0, f.startsAt) + redact(f.match) + out.slice(f.startsAt + f.match.length);
  }
  return out;
}
