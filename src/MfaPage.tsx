import { useCallback, useEffect, useState } from 'react';
import './mfa.css';

type Language = 'ar' | 'en';
type Theme = 'dark' | 'light';

const TOTP_PERIOD_SECONDS = 10 * 60;
const TOTP_PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;

const translations = {
  ar: {
    secret: 'Secret ID',
    generate: 'إنشاء الرمز',
    copy: 'نسخ الرمز',
    clear: 'مسح',
    expiresIn: 'ينتهي خلال',
    seconds: 'ثانية',
    missingSecret: 'أدخل مفتاح 2FA أولاً',
    invalidSecret: 'المفتاح غير صالح. استخدم Base32 فقط.',
    copied: 'تم نسخ الرمز',
    theme: 'المظهر',
    lang: 'اللغة',
  },
  en: {
    secret: 'Secret ID',
    generate: 'Generate Code',
    copy: 'Copy Code',
    clear: 'Clear',
    expiresIn: 'Expires in',
    seconds: 'seconds',
    missingSecret: 'Enter a 2FA secret first',
    invalidSecret: 'Invalid secret. Use Base32 only.',
    copied: 'Code copied',
    theme: 'Theme',
    lang: 'Language',
  },
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
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('mfa_lang');
    return stored === 'en' ? 'en' : 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('mfa_theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [initialSecret] = useState(getSecretFromUrl);
  const [secret, setSecret] = useState(initialSecret);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expiryAt, setExpiryAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TOTP_PERIOD_SECONDS);

  const t = translations[lang];
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
  }, [t.invalidSecret, t.missingSecret]);

  const handleCopy = useCallback(async () => {
    if (!code) {
      return;
    }

    await navigator.clipboard.writeText(code);
    setSuccess(t.copied);
    setError('');
    window.setTimeout(() => setSuccess(''), 2500);
  }, [code, t.copied]);

  const handleClear = useCallback(() => {
    setSecret('');
    setCode('');
    setError('');
    setSuccess('');
    setExpiryAt(null);
    setCountdown(TOTP_PERIOD_SECONDS);
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
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = 'MFA';
    localStorage.setItem('mfa_lang', lang);
  }, [lang]);

  useEffect(() => {
    document.body.classList.toggle('mfa-light-theme', theme === 'light');
    localStorage.setItem('mfa_theme', theme);

    return () => {
      document.body.classList.remove('mfa-light-theme');
    };
  }, [theme]);

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
      <main className={`mfa-shell ${theme === 'light' ? 'light' : 'dark'}`}>
        <header className="mfa-header">
          <div className="mfa-header-actions">
            <button type="button" className="mfa-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t.theme} aria-label={t.theme}>
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 12.5a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1Zm7.5-5a1 1 0 0 1 1 1 1 1 0 0 1-1 1H18a1 1 0 1 1 0-2h1.5Zm-12.5 0a1 1 0 1 1 0 2H5.5a1 1 0 1 1 0-2H7Zm9.19-4.19a1 1 0 0 1 1.42 1.42L16.56 10.3a1 1 0 0 1-1.42-1.42l1.05-1.07Zm-7.34 7.33a1 1 0 1 1 1.42 1.42L9.23 17.6a1 1 0 1 1-1.42-1.42l1.04-1.06Zm7.71 2.46a1 1 0 0 1-1.42 0l-1.05-1.06a1 1 0 0 1 1.42-1.42l1.05 1.06a1 1 0 0 1 0 1.42Zm-7.7-7.7a1 1 0 0 1-1.42 0L7.8 8.89a1 1 0 1 1 1.42-1.42l1.04 1.06a1 1 0 0 1 0 1.42ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M14.8 3.1a1 1 0 0 1 .88 1.64A8 8 0 1 0 19.3 13a1 1 0 0 1 1.73.96A10 10 0 1 1 13.86 2.2a1 1 0 0 1 .94.9Z" />
                </svg>
              )}
            </button>
            <button type="button" className="mfa-icon-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title={t.lang} aria-label={t.lang}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm6.92 8h-2.34a14.7 14.7 0 0 0-1.18-4.3A7.02 7.02 0 0 1 18.92 11ZM12 5.08c.84 1.12 1.48 2.71 1.78 4.92h-3.56c.3-2.2.94-3.8 1.78-4.92ZM8.6 6.7A14.7 14.7 0 0 0 7.42 11H5.08A7.02 7.02 0 0 1 8.6 6.7ZM5.08 13h2.34c.13 1.56.55 3.03 1.18 4.3A7.02 7.02 0 0 1 5.08 13Zm5.14 0h3.56c-.3 2.2-.94 3.8-1.78 4.92-.84-1.12-1.48-2.71-1.78-4.92Zm5.18 4.3c.63-1.28 1.05-2.74 1.18-4.3h2.34a7.02 7.02 0 0 1-3.52 4.3Z" />
              </svg>
            </button>
          </div>
        </header>

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

        <section className="mfa-code-card" aria-live="polite">
          <div className="mfa-code-value">{codeForDisplay}</div>
          <div className="mfa-countdown">{t.expiresIn} {countdown} {t.seconds}</div>
          <div className="mfa-progress-track" aria-hidden="true">
            <span className="mfa-progress-fill" style={{ width: `${progressWidth}%` }} />
          </div>
        </section>

        {error && <p className="mfa-feedback mfa-feedback-error">{error}</p>}
        {success && <p className="mfa-feedback mfa-feedback-success">{success}</p>}
      </main>
    </div>
  );
}
