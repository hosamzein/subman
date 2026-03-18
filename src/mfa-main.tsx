import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './mfa.css';

type Language = 'ar' | 'en';
type Theme = 'dark' | 'light';

const TOTP_PERIOD_SECONDS = 10 * 60;
const TOTP_PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;

const translations = {
  ar: {
    title: 'صفحة MFA',
    intro: 'أدخل مفتاح Base32 لتوليد رمز تحقق مرة واحدة. يتم التوليد محلياً داخل المتصفح فقط.',
    secret: 'Secret Code',
    generate: 'إنشاء الرمز',
    copy: 'نسخ الرمز',
    clear: 'مسح',
    currentCode: 'الرمز الحالي',
    expiresIn: 'ينتهي خلال',
    seconds: 'ثانية',
    missingSecret: 'أدخل مفتاح 2FA أولاً',
    invalidSecret: 'المفتاح غير صالح. استخدم Base32 فقط.',
    copied: 'تم نسخ الرمز',
    theme: 'المظهر',
    lang: 'اللغة',
    neverStored: 'لا يتم حفظ المفتاح أو الرمز على الخادم.',
  },
  en: {
    title: 'MFA Page',
    intro: 'Enter a Base32 secret to generate a one-time code. Generation happens locally in your browser only.',
    secret: 'Secret Code',
    generate: 'Generate Code',
    copy: 'Copy Code',
    clear: 'Clear',
    currentCode: 'Current Code',
    expiresIn: 'Expires in',
    seconds: 'seconds',
    missingSecret: 'Enter a 2FA secret first',
    invalidSecret: 'Invalid secret. Use Base32 only.',
    copied: 'Code copied',
    theme: 'Theme',
    lang: 'Language',
    neverStored: 'Your secret and code are never stored on the server.',
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

function MfaPage() {
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('mfa_lang');
    return stored === 'en' ? 'en' : 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('mfa_theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expiryAt, setExpiryAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TOTP_PERIOD_SECONDS);

  const t = translations[lang];
  const codeForDisplay = code ? `${code.slice(0, 3)} ${code.slice(3, 6)}` : '--- ---';
  const progressWidth = expiryAt ? Math.max(0, Math.min(100, (countdown / TOTP_PERIOD_SECONDS) * 100)) : 0;

  const secretFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeBase32Secret(params.get('secret') ?? '');
  }, []);

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
    if (!secretFromUrl) {
      return;
    }

    setSecret(secretFromUrl);
    void handleGenerate(secretFromUrl);
  }, [handleGenerate, secretFromUrl]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'صفحة MFA' : 'MFA Page';
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
          <h1>{t.title}</h1>
          <div className="mfa-header-actions">
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t.theme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title={t.lang}>
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>
          </div>
        </header>

        <p className="mfa-intro">{t.intro}</p>

        <label className="mfa-label" htmlFor="mfa-secret-input">{t.secret}</label>
        <input
          id="mfa-secret-input"
          className="mfa-input"
          type="text"
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
          <button type="button" className="mfa-btn mfa-btn-primary" onClick={() => void handleGenerate(secret)}>{t.generate}</button>
          <button type="button" className="mfa-btn" onClick={() => void handleCopy()} disabled={!code}>{t.copy}</button>
          <button type="button" className="mfa-btn" onClick={handleClear}>{t.clear}</button>
        </div>

        <section className="mfa-code-card" aria-live="polite">
          <span className="mfa-code-label">{t.currentCode}</span>
          <div className="mfa-code-value">{codeForDisplay}</div>
          <div className="mfa-countdown">{t.expiresIn} {countdown} {t.seconds}</div>
          <div className="mfa-progress-track" aria-hidden="true">
            <span className="mfa-progress-fill" style={{ width: `${progressWidth}%` }} />
          </div>
        </section>

        {error && <p className="mfa-feedback mfa-feedback-error">{error}</p>}
        {success && <p className="mfa-feedback mfa-feedback-success">{success}</p>}

        <p className="mfa-footnote">{t.neverStored}</p>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MfaPage />
  </StrictMode>,
);
