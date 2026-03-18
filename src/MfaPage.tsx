import { useCallback, useEffect, useState } from 'react';
import './mfa.css';

const TOTP_PERIOD_SECONDS = 10 * 60;
const TOTP_PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;

const t = {
  secret: 'Secret ID',
  generate: 'Generate Code',
  copy: 'Copy Code',
  clear: 'Clear',
  missingSecret: 'Enter a 2FA secret first',
  invalidSecret: 'Invalid secret. Use Base32 only.',
  copied: 'Code copied',
} as const;

const normalizeBase32Secret = (secret: string) => secret.replace(/\s+/g, '').toUpperCase();

const decodeBase32 = (secret: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = normalizeBase32Secret(secret).replace(/=+$/g, '');

  if (!normalized) {
    return new Uint8Array();
  }

  let bits = '';

  for (const char of normalized) {
    const value = alphabet.indexOf(char);

    if (value === -1) {
      throw new Error('Invalid Base32 secret');
    }

    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  }

  return bytes;
};

const generateTotpCode = async (secret: string, period = TOTP_PERIOD_SECONDS, digits = 6) => {
  const keyBytes = decodeBase32(secret);

  if (!keyBytes.length) {
    throw new Error('Missing secret');
  }

  const counter = Math.floor(Date.now() / 1000 / period);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, counter, false);

  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, buffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary = ((signature[offset] & 0x7f) << 24)
    | ((signature[offset + 1] & 0xff) << 16)
    | ((signature[offset + 2] & 0xff) << 8)
    | (signature[offset + 3] & 0xff);

  return (binary % (10 ** digits)).toString().padStart(digits, '0');
};

const getSecretFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return normalizeBase32Secret(params.get('secret') ?? '');
};

export default function MfaPage() {
  const [initialSecret] = useState(getSecretFromUrl);
  const [secret, setSecret] = useState(initialSecret);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expiryAt, setExpiryAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TOTP_PERIOD_SECONDS);

  const codeForDisplay = code ? `${code.slice(0, 3)} ${code.slice(3, 6)}` : '--- ---';
  const progressWidth = expiryAt ? Math.max(0, Math.min(100, (countdown / TOTP_PERIOD_SECONDS) * 100)) : 0;

  const handleGenerate = useCallback(async (rawSecret: string) => {
    const normalized = normalizeBase32Secret(rawSecret);

    if (!normalized) {
      setCode('');
      setError(t.missingSecret);
      setSuccess('');
      return;
    }

    try {
      const nextCode = await generateTotpCode(normalized);
      setCode(nextCode);
      setError('');
      setSuccess('');
      setExpiryAt(Date.now() + TOTP_PERIOD_MS);
      setCountdown(TOTP_PERIOD_SECONDS);
    } catch {
      setCode('');
      setSuccess('');
      setError(t.invalidSecret);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!code) {
      return;
    }

    await navigator.clipboard.writeText(code);
    setSuccess(t.copied);
    setError('');
    window.setTimeout(() => setSuccess(''), 2500);
  }, [code]);

  const handleClear = useCallback(() => {
    setSecret('');
    setCode('');
    setError('');
    setSuccess('');
    setExpiryAt(null);
    setCountdown(TOTP_PERIOD_SECONDS);
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.title = 'MFA';
  }, []);

  useEffect(() => {
    if (!initialSecret) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleGenerate(initialSecret);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [handleGenerate, initialSecret]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(() => {
        if (!expiryAt) {
          return TOTP_PERIOD_SECONDS;
        }

        const next = Math.max(0, Math.ceil((expiryAt - Date.now()) / 1000));

        if (next === 0) {
          setCode('');
          setExpiryAt(null);
          setSuccess('');
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiryAt]);

  return (
    <div className="mfa-page">
      <main className="mfa-shell">
        <div className="mfa-secret-row">
          <input
            id="mfa-secret-input"
            className="mfa-input"
            type="text"
            aria-label={t.secret}
            value={secret}
            onChange={(event) => {
              setSecret(event.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder={t.secret}
          />
          <div className="mfa-inline-code" aria-live="polite">{codeForDisplay}</div>
        </div>

        <div className="mfa-actions">
          <button type="button" className="mfa-btn mfa-btn-primary mfa-icon-btn" onClick={() => void handleGenerate(secret)} title={t.generate} aria-label={t.generate}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M13.4 2.6a1 1 0 0 1 1.82.8l-1.4 4.15h4.58a1 1 0 0 1 .77 1.64l-8.4 10.2a1 1 0 0 1-1.76-.88l1.18-4.02H5.68a1 1 0 0 1-.8-1.6l8.52-10.3Z" />
            </svg>
          </button>
          <button type="button" className="mfa-btn mfa-icon-btn" onClick={() => void handleCopy()} disabled={!code} title={t.copy} aria-label={t.copy}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 3a2 2 0 0 0-2 2v2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h1a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H9Zm7 2v9h-1V9a2 2 0 0 0-2-2H9V5h7Zm-3 4v9H6V9h7Z" />
            </svg>
          </button>
          <button type="button" className="mfa-btn mfa-icon-btn" onClick={handleClear} title={t.clear} aria-label={t.clear}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6.7 5.3a1 1 0 0 1 1.4 0L12 9.18l3.9-3.88a1 1 0 1 1 1.4 1.42L13.4 10.6l3.9 3.9a1 1 0 1 1-1.4 1.4L12 12.02l-3.9 3.88a1 1 0 1 1-1.4-1.42l3.9-3.88-3.9-3.9a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>

        <div className="mfa-progress-track" aria-hidden="true">
          <span className="mfa-progress-fill" style={{ width: `${progressWidth}%` }} />
        </div>

        {error && <p className="mfa-feedback mfa-feedback-error">{error}</p>}
        {success && <p className="mfa-feedback mfa-feedback-success">{success}</p>}
      </main>
    </div>
  );
}
