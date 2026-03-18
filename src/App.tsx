import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseAuthRedirectUrl } from './supabaseClient';
import type {
  DbNotificationRecord,
  DbProfile,
  DbSubscription,
  NotificationRecord,
  Profile,
  SettingRecord,
  Subscription,
  SubscriptionDuration,
  UserAuthMethod,
  UserAuthMethodRow,
} from './supabaseClient';
import type {
  IncomeDistributionItem,
  ServiceDistributionItem,
} from './components/AnalyticsCharts';
import './App.css';

const AnalyticsCharts = lazy(() => import('./components/AnalyticsCharts'));

const SERVICES = ['Grok', 'ChatGPT', 'Perplexity', 'Gemini'];
const SERVICE_CATEGORY_OPTIONS: Record<string, string[]> = {
  Grok: ['supergrok', 'business'],
  ChatGPT: ['go', 'pro', 'plus', 'business'],
  Perplexity: ['pro', 'enterprise pro', 'enterprise max'],
  Gemini: ['pro', 'plus', 'ultra'],
};
const getDefaultCategoryForService = (service: string) => SERVICE_CATEGORY_OPTIONS[service]?.[0] ?? '';
const COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6'];
const DARK_COLORS = ['#8edcff', '#6ee7b7', '#facc15', '#fb923c', '#c084fc'];
const COUNTRY_CODES = [
  { code: '20', label: 'مصر (+20)' },
  { code: '966', label: 'السعودية (+966)' },
  { code: '971', label: 'الإمارات (+971)' },
  { code: '965', label: 'الكويت (+965)' },
  { code: '964', label: 'العراق (+964)' },
  { code: '974', label: 'قطر (+974)' },
];
const SUPPORT_EMAIL = 'geminihossam8@gmail.com';
const DEFAULT_WHATSAPP_MESSAGE = 'مرحباً {name}، نود تذكيرك بأن اشتراك {service} سينتهي بتاريخ {date}.';

const translations = {
  ar: {
    title: "منصة إدارة الإشتراكات",
    login: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    enter: "دخول",
    dashboard: "لوحة البيانات",
    subscribers: "المشتركون",
    serviceAccounts: "حسابات الخدمات",
    twoFactorTool: "أداة 2FA",
    notifications: "التنبيهات",
    access: "الصلاحيات",
    settings: "الإعدادات",
    logout: "خروج",
    periodIncome: "دخل الفترة",
    totalActive: "إجمالي النشط",
    newSubs: "اشتراك جديد",
    activeNow: "حسابات مفعلة الآن",
    serviceDist: "توزيع الخدمات",
    incomeDist: "دخل الخدمات",
    notifCenter: "مركز التنبيهات",
    clearAll: "مسح الكل",
    noNotifs: "لا توجد تنبيهات جديدة",
    manageSubs: "إدارة المشتركين",
    search: "بحث سريع...",
    renewalOnly: "تجديد فقط",
    save: "حفظ",
    update: "تحديث",
    add: "إضافة",
    name: "الاسم",
    email: "البريد",
    facebook: "حساب فيسبوك",
    whatsapp: "واتساب",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    amount: "قيمة الإشتراك",
    workspace: "مساحة العمل",
    actions: "أدوات",
    manageUsers: "إدارة المستخدمين والصلاحيات",
    user: "المستخدم",
    role: "الصلاحية",
    admin: "مدير",
    userLabel: "مستخدم",
    id: "ID",
    service: "الخدمة",
    cancel: "إلغاء",
    rights: "جميع الحقوق محفوظة",
    owner: "حسام زين",
    confirmDelete: "هل تريد الحذف؟",
    userExists: "اسم المستخدم موجود بالفعل!",
    saved: "تم الحفظ!",
    updated: "تم التحديث!",
    waTemplate: "رسالة واتساب الافتراضية",
    waHelp: "استخدم الكلمات التالية للاستبدال التلقائي: {name} للاسم، {service} للخدمة، {date} لتاريخ الانتهاء.",
    export: "تصدير البيانات",
    theme: "المظهر",
    lang: "اللغة",
    duration: "المدة",
    monthly: "شهري",
    quarterly: "ربع سنوي",
    yearly: "سنوي",
    category: "الفئة",
    renew: "تجديد",
    copyFullData: "نسخ كل البيانات",
    openMessenger: "فتح ماسنجر",
    subDetail: "تفاصيل الاشتراك",
    subscriberDetail: "بيانات المشترك",
    manageServiceAccounts: "مكتبة حسابات الخدمات",
    serviceAccountsIntro: "احفظ بيانات دخول كل خدمة ثم اربطها بمشترك من خلال البحث والاختيار.",
    subscriptionEmail: "بريد الاشتراك",
    servicePassword: "كلمة مرور الخدمة",
    mailPassword: "كلمة مرور البريد",
    passwords: "بيانات الدخول",
    serviceAccountTwoFactorSecret: "2FA Secret للخدمة",
    serviceAccountTwoFactorHint: "يستخدم للتوليد فقط داخل الواجهة ولا يتم حفظه",
    linkedSubscriber: "المشترك المرتبط",
    searchSubscriber: "ابحث عن مشترك بالاسم أو البريد أو الواتساب...",
    noSubscriberLinked: "لا يوجد مشترك مرتبط",
    linked: "مربوط",
    unlinked: "غير مربوط",
    quickFilters: "فلاتر سريعة",
    tableDensity: "كثافة الجدول",
    compact: "مضغوط",
    comfortable: "مريح",
    visibleColumns: "الأعمدة الظاهرة",
    contact: "التواصل",
    activity: "آخر تعديل",
    lastUpdated: "آخر تعديل",
    unknownUser: "غير معروف",
    copied: "تم النسخ",
    createSubscriber: "إضافة مشترك جديد",
    editSubscriber: "تعديل المشترك",
    createServiceAccount: "إضافة حساب خدمة",
    editServiceAccount: "تعديل حساب الخدمة",
    close: "إغلاق",
    expiringSoon: "قريب الانتهاء",
    expired: "منتهي",
    missingEmail: "بدون بريد",
    missingWhatsapp: "بدون واتساب",
    missingContact: "بدون وسيلة تواصل",
    linkedOnly: "المربوط فقط",
    unlinkedOnly: "غير المربوط",
    recommendedMatches: "اقتراحات الربط",
    serviceMatched: "مطابق للخدمة",
    contactComplete: "بيانات تواصل مكتملة",
    contactPartial: "بيانات تواصل جزئية",
    contactMissing: "لا توجد وسيلة تواصل",
    contactMissingHint: "يفضل إضافة البريد أو رقم الواتساب حتى يمكن التواصل مع المشترك لاحقاً.",
    contactColumn: "بيانات التواصل",
    twoFactorGenerator: "مولد 2FA",
    twoFactorIntro: "أدخل مفتاح Base32 لتوليد رمز TOTP داخل المتصفح فقط بدون حفظ أي بيانات. يتم مسح السر والرمز محلياً بعد 10 دقائق.",
    twoFactorSecretLabel: "2FA Secret",
    currentCode: "الرمز الحالي",
    nextRefresh: "ينتهي خلال",
    seconds: "ثانية",
    generateCode: "إنشاء / تجديد رمز 2FA",
    copyCode: "نسخ الرمز",
    clear: "مسح",
    secretRequired: "أدخل مفتاح 2FA أولاً",
    invalidSecret: "المفتاح غير صالح. استخدم Base32 فقط.",
    codeCopied: "تم نسخ الرمز",
    toolExpired: "انتهت مهلة 10 دقائق. أدخل السر وأنشئ الرمز مرة أخرى.",
    chatgptMfaHintTitle: "مثال للحصول على السر من ChatGPT",
    chatgptMfaHintBody: "Open ChatGPT -> Profile -> Settings -> Security -> Enable Multi-Factor Authentication (MFA) -> ChatGPT will show a QR code + secret key.",
    pendingTitle: "الحساب قيد المراجعة",
    pendingMsg: `حسابك قيد المراجعة حالياً من قبل الإدارة. يرجى مراجعة المسؤول عبر: ${SUPPORT_EMAIL}`,
    register: "تسجيل حساب جديد",
    alreadyHave: "لديك حساب بالفعل؟ دخول",
    needAccount: "ليس لديك حساب؟ سجل الآن",
    googleLogin: "الدخول بواسطة جوجل",
    mailHint: "استخدم بريدك الإلكتروني عبر تسجيل الدخول بجوجل",
    status: "الحالة",
    approve: "تفعيل",
    reject: "رفض",
    makeAdmin: "تعيين كمدير",
    makeUser: "تعيين كمستخدم",
    authMethod: "طريقة التسجيل",
    emailMethod: "البريد",
    googleMethod: "جوجل",
    emailGoogleMethod: "البريد + جوجل",
    unknownMethod: "غير معروف",
  },
  en: {
    title: "Subscription Management",
    login: "Login",
    username: "Username",
    password: "Password",
    enter: "Enter",
    dashboard: "Dashboard",
    subscribers: "Subscribers",
    serviceAccounts: "Service Accounts",
    twoFactorTool: "2FA Tool",
    notifications: "Notifications",
    access: "Access Mgmt",
    settings: "Settings",
    logout: "Logout",
    periodIncome: "Period Income",
    totalActive: "Total Active",
    newSubs: "New Subs",
    activeNow: "Active accounts",
    serviceDist: "Service Distribution",
    incomeDist: "Income Distribution",
    notifCenter: "Notification Center",
    clearAll: "Clear All",
    noNotifs: "No new notifications",
    manageSubs: "Manage Subscribers",
    search: "Quick search...",
    renewalOnly: "Renewal Only",
    save: "Save",
    update: "Update",
    add: "Add",
    name: "Name",
    email: "Email",
    facebook: "Facebook Account",
    whatsapp: "WhatsApp",
    startDate: "Start Date",
    endDate: "End Date",
    amount: "Subscription Value",
    workspace: "Workspace",
    actions: "Actions",
    manageUsers: "Manage Users & Permissions",
    user: "User",
    role: "Role",
    admin: "Admin",
    userLabel: "User",
    id: "ID",
    service: "Service",
    cancel: "Cancel",
    rights: "All rights reserved",
    owner: "Hosam Zein",
    confirmDelete: "Delete this subscription?",
    userExists: "User already exists!",
    saved: "Saved!",
    updated: "Updated!",
    waTemplate: "Default WA Message",
    waHelp: "Use: {name}, {service}, {date} for auto-replacement.",
    export: "Export Data",
    theme: "Theme",
    lang: "Language",
    duration: "Duration",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    category: "Category",
    renew: "Renew",
    copyFullData: "Copy full data",
    openMessenger: "Open Messenger",
    subDetail: "Subscription Details",
    subscriberDetail: "Subscriber Details",
    manageServiceAccounts: "Service Accounts Library",
    serviceAccountsIntro: "Store each service login profile and link it to a subscriber account by search and select.",
    subscriptionEmail: "Subscription Email",
    servicePassword: "Service Password",
    mailPassword: "Mail Password",
    passwords: "Passwords",
    serviceAccountTwoFactorSecret: "Service 2FA Secret",
    serviceAccountTwoFactorHint: "Used only for on-screen generation and is not saved",
    linkedSubscriber: "Linked Subscriber",
    searchSubscriber: "Search subscriber by name, email, or WhatsApp...",
    noSubscriberLinked: "No linked subscriber",
    linked: "Linked",
    unlinked: "Unlinked",
    quickFilters: "Quick Filters",
    tableDensity: "Table Density",
    compact: "Compact",
    comfortable: "Comfortable",
    visibleColumns: "Visible Columns",
    contact: "Contact",
    activity: "Last Update",
    lastUpdated: "Last Updated",
    unknownUser: "Unknown",
    copied: "Copied",
    createSubscriber: "Create Subscriber",
    editSubscriber: "Edit Subscriber",
    createServiceAccount: "Create Service Account",
    editServiceAccount: "Edit Service Account",
    close: "Close",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    missingEmail: "Missing Email",
    missingWhatsapp: "Missing WhatsApp",
    missingContact: "Missing Contact",
    linkedOnly: "Linked Only",
    unlinkedOnly: "Unlinked",
    recommendedMatches: "Recommended Matches",
    serviceMatched: "Matches service",
    contactComplete: "Contact complete",
    contactPartial: "Contact partial",
    contactMissing: "No contact method",
    contactMissingHint: "Add an email or WhatsApp number so the subscriber can be reached later.",
    contactColumn: "Contact Details",
    twoFactorGenerator: "2FA Generator",
    twoFactorIntro: "Enter a Base32 secret to generate a TOTP code in-browser only. Nothing is stored, and the secret/code are cleared locally after 10 minutes.",
    twoFactorSecretLabel: "2FA Secret",
    currentCode: "Current Code",
    nextRefresh: "Expires in",
    seconds: "seconds",
    generateCode: "Generate / Regenerate 2FA Code",
    copyCode: "Copy Code",
    clear: "Clear",
    secretRequired: "Enter a 2FA secret first",
    invalidSecret: "Invalid secret. Use Base32 only.",
    codeCopied: "Code copied",
    toolExpired: "The 10-minute limit expired. Enter the secret and generate again.",
    chatgptMfaHintTitle: "Example: get the secret from ChatGPT",
    chatgptMfaHintBody: "Open ChatGPT -> Profile -> Settings -> Security -> Enable Multi-Factor Authentication (MFA) -> ChatGPT will show a QR code + secret key.",
    pendingTitle: "Account Pending",
    pendingMsg: `Your account is currently pending approval. Please contact the administrator at ${SUPPORT_EMAIL}`,
    register: "Register New Account",
    alreadyHave: "Already have an account? Login",
    needAccount: "Don't have an account? Register",
    googleLogin: "Login with Google",
    mailHint: "Use your email account with Google sign-in",
    status: "Status",
    approve: "Approve",
    reject: "Reject",
    makeAdmin: "Make Admin",
    makeUser: "Make User",
    authMethod: "Sign-in Method",
    emailMethod: "Email",
    googleMethod: "Google",
    emailGoogleMethod: "Email + Google",
    unknownMethod: "Unknown",
  }
};

type Language = keyof typeof translations;
type Theme = 'dark' | 'light';
type View = 'login' | 'dashboard' | 'subscribers' | 'twoFactorTool' | 'users' | 'notifications' | 'settings';

type SubscriptionFormData = Pick<
  Subscription,
  'service' | 'category' | 'duration' | 'name' | 'email' | 'facebook' | 'countryCode' | 'whatsapp' | 'startDate' | 'endDate' | 'payment' | 'workspace'
>;

type SubscriptionStatus = {
  label: string;
  className: 'badge-danger' | 'badge-warning' | 'badge-success';
  needsRenewal: boolean;
};

type AnalyticsSummary = {
  currentActive: number;
  incomeDist: IncomeDistributionItem[];
  periodIncome: number;
  serviceDist: ServiceDistributionItem[];
  totalInPeriod: number;
};

type ManagedUser = Profile & {
  authMethod: UserAuthMethod;
};

type SubscriberQuickFilter = 'all' | 'expiringSoon' | 'expired' | 'missingEmail' | 'missingWhatsapp' | 'missingContact';

type SubscriberColumnVisibility = {
  category: boolean;
  contact: boolean;
  workspace: boolean;
  payment: boolean;
  activity: boolean;
};

const getStoredLanguage = (): Language => {
  const storedLanguage = localStorage.getItem('subman_lang');
  return storedLanguage === 'en' ? 'en' : 'ar';
};

const getStoredTheme = (): Theme => {
  const storedTheme = localStorage.getItem('subman_theme');
  return storedTheme === 'dark' ? 'dark' : 'light';
};

const createDefaultFormData = (): SubscriptionFormData => ({
  service: 'Grok',
  category: getDefaultCategoryForService('Grok'),
  duration: 'monthly',
  name: '',
  email: '',
  facebook: '',
  countryCode: '20',
  whatsapp: '',
  startDate: '',
  endDate: '',
  payment: 0,
  workspace: '',
});

const sanitizeFormDataForService = (data: SubscriptionFormData, service: string): SubscriptionFormData => {
  const availableCategories = SERVICE_CATEGORY_OPTIONS[service] ?? [];
  const nextCategory = availableCategories.includes(data.category ?? '') ? (data.category ?? '') : getDefaultCategoryForService(service);

  return {
    ...data,
    service,
    category: nextCategory,
  };
};

const normalizeRole = (role: DbProfile['role']): Profile['role'] => (role === 'admin' ? 'admin' : 'user');

const normalizeProfile = (profile: DbProfile): Profile => ({
  ...profile,
  role: normalizeRole(profile.role),
});

const normalizeSubscription = (subscription: DbSubscription): Subscription => ({
  id: subscription.id,
  user_id: subscription.user_id,
  service: subscription.service,
  category: subscription.category,
  duration: subscription.duration,
  name: subscription.name,
  email: subscription.email,
  whatsapp: subscription.whatsapp,
  facebook: subscription.facebook,
  twoFactorSecret: subscription.twofactorsecret ?? subscription.two_factor_secret ?? '',
  twoFactorCode: subscription.twofactorcode ?? subscription.two_factor_code ?? '',
  countryCode: subscription.countrycode,
  startDate: subscription.startdate,
  endDate: subscription.enddate,
  payment: Number(subscription.payment),
  workspace: subscription.workspace,
  createdAt: subscription.createdat,
  updatedAt: subscription.updatedat ?? null,
  updatedBy: subscription.updatedby ?? null,
});

const normalizeNotification = (notification: DbNotificationRecord): NotificationRecord => ({
  ...notification,
  createdAt: notification.createdat,
});

const toDbSubscriptionPayload = (subscription: SubscriptionFormData) => ({
  service: subscription.service,
  category: subscription.category,
  duration: subscription.duration,
  name: subscription.name,
  email: subscription.email,
  whatsapp: subscription.whatsapp,
  facebook: subscription.facebook,
  countrycode: subscription.countryCode,
  startdate: subscription.startDate,
  enddate: subscription.endDate,
  payment: subscription.payment,
  workspace: subscription.workspace,
});

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';

  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatDateTimeDisplay = (dateStr: string | null | undefined, locale: string) => {
  if (!dateStr) {
    return '-';
  }

  return new Date(dateStr).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calculateEndDate = (startDate: string, duration: SubscriptionDuration) => {
  if (!startDate) return '';

  const date = new Date(startDate);

  if (duration === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (duration === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split('T')[0];
};

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

const generateTotpCode = async (secret: string, period = 30, digits = 6) => {
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

const getContactHealth = (subscription: Pick<Subscription, 'email' | 'whatsapp'>) => {
  const hasEmail = Boolean(subscription.email?.trim());
  const hasWhatsapp = Boolean(subscription.whatsapp?.trim());

  if (hasEmail && hasWhatsapp) {
    return 'complete';
  }

  if (hasEmail || hasWhatsapp) {
    return 'partial';
  }

  return 'missing';
};

const readSearchableValue = (value: string | null | undefined) => value?.toLowerCase() ?? '';

const resolveAuthMethod = (providers: string[] | null | undefined): UserAuthMethod => {
  if (!providers?.length) {
    return 'unknown';
  }

  const normalizedProviders = [...new Set(providers.map((provider) => provider.toLowerCase()))];
  const hasEmail = normalizedProviders.includes('email');
  const hasGoogle = normalizedProviders.includes('google');

  if (hasEmail && hasGoogle) return 'email+google';
  if (hasGoogle) return 'google';
  if (hasEmail) return 'email';

  return 'unknown';
};

const attachAuthMethods = (profiles: Profile[], methodRows: UserAuthMethodRow[] | null): ManagedUser[] => {
  const methodsByUserId = new Map(
    (methodRows ?? []).map((row) => [row.user_id, resolveAuthMethod(row.providers)]),
  );

  return profiles.map((profile) => ({
    ...profile,
    authMethod: methodsByUserId.get(profile.id) ?? 'unknown',
  }));
};

const getAuthMethodLabel = (method: UserAuthMethod, dictionary: typeof translations[Language]) => {
  if (method === 'google') return dictionary.googleMethod;
  if (method === 'email+google') return dictionary.emailGoogleMethod;
  if (method === 'email') return dictionary.emailMethod;
  return dictionary.unknownMethod;
};

const getAuthMethodIcon = (method: UserAuthMethod) => {
  if (method === 'google') return 'G';
  if (method === 'email+google') return 'G+';
  if (method === 'email') return '@';
  return '?';
};

const getAuthMethodClassName = (method: UserAuthMethod) => `badge-auth badge-auth-${method.replace('+', '-')}`;

function App() {
  const [lang, setLang] = useState<Language>(getStoredLanguage);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const userProfileRef = useRef<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const profileLoadingRef = useRef<string | null>(null);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [waMessage, setWaMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriberQuickFilter, setSubscriberQuickFilter] = useState<SubscriberQuickFilter>('all');
  const [subscriberColumns, setSubscriberColumns] = useState<SubscriberColumnVisibility>({
    category: true,
    contact: true,
    workspace: true,
    payment: true,
    activity: true,
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorExpiryAt, setTwoFactorExpiryAt] = useState<number | null>(null);
  const [twoFactorCountdown, setTwoFactorCountdown] = useState(600);

  const [statsFromDate, setStatsFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [statsToDate, setStatsToDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  const [formData, setFormData] = useState<SubscriptionFormData>(createDefaultFormData);
  const [isSubscriberModalOpen, setIsSubscriberModalOpen] = useState(false);
  const t = translations[lang];
  const chartPalette = theme === 'dark' ? DARK_COLORS : COLORS;
  const chartAxisColor = theme === 'dark' ? '#c9d6ea' : '#5f7293';
  const chartGridColor = theme === 'dark' ? 'rgba(201, 214, 234, 0.16)' : 'rgba(95, 114, 147, 0.14)';
  const chartBarColor = theme === 'dark' ? '#8edcff' : '#225c8f';

  useEffect(() => {
    localStorage.setItem('subman_lang', lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('subman_theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isLoadingProfile) {
      timer = setTimeout(() => {
        setIsLoadingProfile(false);
        profileLoadingRef.current = null;
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [isLoadingProfile]);

  const loadProfile = useCallback(async (user: User): Promise<Profile> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<DbProfile>();

    if (profile && !error) {
      return normalizeProfile(profile);
    }

    const newProfile: Profile = {
      id: user.id,
      username: user.email?.split('@')[0] || 'User',
      role: 'user',
      status: 'pending',
    };

    const { data: upsertedProfile } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select('*')
      .single();

    return upsertedProfile ?? newProfile;
  }, []);

  const syncSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUserProfile(null);
      setIsLoadingProfile(false);
      profileLoadingRef.current = null;
      setCurrentView('login');
      return;
    }

    setIsLoggedIn(true);
    setCurrentUser(session.user);
    setCurrentView((previousView) => (previousView === 'login' ? 'dashboard' : previousView));

    if (profileLoadingRef.current === session.user.id) {
      return;
    }

    if (userProfileRef.current?.id === session.user.id) {
      return;
    }

    setIsLoadingProfile(true);
    profileLoadingRef.current = session.user.id;

    try {
      const profile = await loadProfile(session.user);
      setUserProfile(profile);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setIsLoadingProfile(false);
      profileLoadingRef.current = null;
    }
  }, [loadProfile]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => syncSession(session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [syncSession]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const profileChannel = supabase
      .channel(`profile-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`,
        },
        async () => {
          const profile = await loadProfile(currentUser);
          setUserProfile(profile);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [currentUser, loadProfile]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTwoFactorCountdown(() => {
        if (!twoFactorExpiryAt) {
          return 600;
        }

        const nextValue = Math.max(0, Math.ceil((twoFactorExpiryAt - Date.now()) / 1000));

        if (nextValue === 0) {
          setTwoFactorSecret('');
          setTwoFactorCode('');
          setTwoFactorExpiryAt(null);
          setTwoFactorError(t.toolExpired);
        }

        return nextValue;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [t.toolExpired, twoFactorExpiryAt]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser || (userProfile?.status === 'pending' && userProfile.role !== 'admin')) {
      setSubscriptions([]);
      setAllUsers([]);
      setNotifications([]);
      setWaMessage(DEFAULT_WHATSAPP_MESSAGE);
      if (userProfile?.status === 'pending' && userProfile.role !== 'admin') {
        setCurrentView('dashboard');
      }
      return;
    }

    const fetchData = async () => {
      const subscriptionsQuery = userProfile?.role === 'admin'
        ? supabase.from('subscriptions').select('*')
        : supabase.from('subscriptions').select('*').eq('user_id', currentUser.id);

      const profilesPromise = userProfile?.role === 'admin'
        ? supabase.from('profiles').select('*')
        : Promise.resolve({ data: null, error: null });

      const authMethodsPromise = userProfile?.role === 'admin'
        ? supabase.rpc('admin_user_auth_methods')
        : Promise.resolve({ data: null, error: null });

      const [subscriptionsResult, profilesResult, authMethodsResult, settingsResult, notificationsResult] = await Promise.all([
        subscriptionsQuery.order('createdat', { ascending: false }),
        profilesPromise,
        authMethodsPromise,
        supabase.from('settings').select('*').eq('id', 'whatsapp_message').maybeSingle<SettingRecord>(),
        supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('createdat', { ascending: false }),
      ]);

      const normalizedProfiles = (profilesResult.data as DbProfile[] | null)?.map(normalizeProfile) ?? [];

      setSubscriptions((subscriptionsResult.data as DbSubscription[] | null)?.map(normalizeSubscription) ?? []);
      setAllUsers(attachAuthMethods(normalizedProfiles, authMethodsResult.data as UserAuthMethodRow[] | null));
      setWaMessage(settingsResult.data?.value ?? DEFAULT_WHATSAPP_MESSAGE);
      setNotifications((notificationsResult.data as DbNotificationRecord[] | null)?.map(normalizeNotification) ?? []);
    };

    void fetchData();

    const subChannel = supabase
      .channel(`schema-db-changes-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        void fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [currentUser, isLoggedIn, userProfile]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: supabaseAuthRedirectUrl || window.location.origin,
      },
    });

    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const resetForm = useCallback(() => {
    setFormData(createDefaultFormData());
    setEditingId(null);
    setIsSubscriberModalOpen(false);
  }, []);

  const handleGenerateTwoFactorCode = useCallback(async () => {
    const normalizedSecret = normalizeBase32Secret(twoFactorSecret);

    if (!normalizedSecret) {
      setTwoFactorCode('');
      setTwoFactorError(t.secretRequired);
      return;
    }

    try {
      const code = await generateTotpCode(normalizedSecret);
      setTwoFactorCode(code);
      setTwoFactorError('');
      setTwoFactorExpiryAt(Date.now() + 10 * 60 * 1000);
      setTwoFactorCountdown(600);
    } catch {
      setTwoFactorCode('');
      setTwoFactorError(t.invalidSecret);
    }
  }, [t.invalidSecret, t.secretRequired, twoFactorSecret]);

  const handleCopyTwoFactorCode = useCallback(async () => {
    if (!twoFactorCode) {
      return;
    }

    await navigator.clipboard.writeText(twoFactorCode);
    setSuccessMessage(t.codeCopied);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [t.codeCopied, twoFactorCode]);

  const handleClearTwoFactorTool = useCallback(() => {
    setTwoFactorSecret('');
    setTwoFactorCode('');
    setTwoFactorError('');
    setTwoFactorExpiryAt(null);
    setTwoFactorCountdown(600);
  }, []);

  const resolveMessengerUrl = useCallback((facebookValue: string) => {
    const raw = facebookValue.trim();

    if (!raw) {
      return '';
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const parsed = new URL(raw);

        if (parsed.hostname.includes('m.me')) {
          return raw;
        }

        if (parsed.hostname.includes('facebook.com')) {
          if (parsed.pathname === '/profile.php') {
            const profileId = parsed.searchParams.get('id');

            if (profileId) {
              return `https://m.me/${profileId}`;
            }
          }

          const handle = parsed.pathname.split('/').filter(Boolean)[0];

          if (handle) {
            return `https://m.me/${handle}`;
          }
        }
      } catch {
        return '';
      }

      return '';
    }

    const normalized = raw.replace(/^@+/, '').replace(/^facebook\.com\//i, '').replace(/^m\.me\//i, '').replace(/\/$/, '');

    if (!normalized) {
      return '';
    }

    return `https://m.me/${normalized}`;
  }, []);

  const copySubscriberData = useCallback(async (subscription: Subscription) => {
    const rows: string[] = [];
    const addRow = (label: string, value: string | number | null | undefined) => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'string') {
        const normalized = value.trim();

        if (!normalized || normalized === '-') {
          return;
        }

        rows.push(`${label}: ${normalized}`);
        return;
      }

      rows.push(`${label}: ${value}`);
    };

    const durationLabel = subscription.duration === 'yearly'
      ? t.yearly
      : subscription.duration === 'quarterly'
        ? t.quarterly
        : t.monthly;

    addRow(t.id, subscription.id);
    addRow(t.service, subscription.service);
    addRow(t.category, subscription.category || getDefaultCategoryForService(subscription.service) || '');
    addRow(t.name, subscription.name);
    addRow(t.email, subscription.email);
    addRow(t.whatsapp, subscription.whatsapp ? `+${subscription.countryCode}${subscription.whatsapp}` : '');
    addRow(t.facebook, subscription.facebook);
    addRow(t.duration, durationLabel);
    addRow(t.startDate, subscription.startDate);
    addRow(t.endDate, subscription.endDate);
    addRow(t.amount, subscription.payment);
    addRow(t.workspace, subscription.workspace);

    if (subscription.twoFactorSecret) {
      rows.push(`2FA Secret: ${subscription.twoFactorSecret}`);
    }

    if (subscription.twoFactorCode) {
      rows.push(`2FA Code: ${subscription.twoFactorCode}`);
    }

    await navigator.clipboard.writeText(rows.join('\n'));
    setSuccessMessage(t.copyFullData);
    setTimeout(() => setSuccessMessage(''), 2500);
  }, [t.amount, t.category, t.copyFullData, t.duration, t.email, t.endDate, t.facebook, t.id, t.monthly, t.name, t.quarterly, t.service, t.startDate, t.whatsapp, t.workspace, t.yearly]);

  const sendWhatsApp = (sub: Subscription) => {
    if (!sub.whatsapp) {
      return;
    }

    const message = waMessage
      .replace('{name}', sub.name)
      .replace('{service}', sub.service)
      .replace('{date}', formatDateDisplay(sub.endDate));
    const fullNumber = `${sub.countryCode}${sub.whatsapp.replace(/^0+/, '')}`;
    const url = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getStatus = useCallback((endDate: string): SubscriptionStatus => {
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return { label: lang === 'ar' ? 'منتهي' : 'Expired', className: 'badge-danger', needsRenewal: true };
    }

    if (diff <= 2) {
      return { label: lang === 'ar' ? 'تجديد قريباً' : 'Renew Soon', className: 'badge-warning', needsRenewal: true };
    }

    return { label: lang === 'ar' ? 'نشط' : 'Active', className: 'badge-success', needsRenewal: false };
  }, [lang]);

  const profilesById = useMemo(() => {
    const entries = allUsers.map((user) => [user.id, user] as const);

    if (userProfile) {
      entries.push([userProfile.id, { ...userProfile, authMethod: 'unknown' }]);
    }

    return new Map(entries);
  }, [allUsers, userProfile]);

  const getActorName = useCallback((userId: string | null | undefined) => {
    if (!userId) {
      return t.unknownUser;
    }

    return profilesById.get(userId)?.username ?? t.unknownUser;
  }, [profilesById, t.unknownUser]);

  const openSubscriptionEditor = useCallback((subscription: Subscription) => {
    setFormData(sanitizeFormDataForService({
      ...subscription,
      category: subscription.category || getDefaultCategoryForService(subscription.service) || '',
      duration: subscription.duration || 'monthly',
    }, subscription.service));
    setEditingId(subscription.id);
    setIsSubscriberModalOpen(true);
  }, []);

  const submitSubscriptionForm = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    const now = new Date().toISOString();
    const preparedFormData = sanitizeFormDataForService(formData, formData.service);
    const payload = {
      ...toDbSubscriptionPayload(preparedFormData),
      updatedat: now,
      updatedby: currentUser.id,
    };

    if (editingId) {
      await supabase.from('subscriptions').update(payload).eq('id', editingId);
      setSuccessMessage(t.updated);
    } else {
      await supabase.from('subscriptions').insert([{ ...payload, user_id: currentUser.id, createdat: now }]);
      setSuccessMessage(t.saved);
    }

    resetForm();
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [currentUser, editingId, formData, resetForm, t.saved, t.updated]);

  const handleRenewClick = (subscription: Subscription) => {
    const newStartDate = subscription.endDate;
    const currentDuration = subscription.duration || 'monthly';
    const newEndDate = calculateEndDate(newStartDate, currentDuration);

    setFormData(sanitizeFormDataForService({
      ...subscription,
      startDate: newStartDate,
      endDate: newEndDate,
      duration: currentDuration,
      category: subscription.category || getDefaultCategoryForService(subscription.service) || '',
    }, subscription.service));

    setEditingId(subscription.id);
    setIsSubscriberModalOpen(true);
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const status = getStatus(sub.endDate);
      const contactHealth = getContactHealth(sub);

      if (subscriberQuickFilter === 'expiringSoon' && status.className !== 'badge-warning') {
        return false;
      }

      if (subscriberQuickFilter === 'expired' && status.className !== 'badge-danger') {
        return false;
      }

      if (subscriberQuickFilter === 'missingEmail' && sub.email.trim()) {
        return false;
      }

      if (subscriberQuickFilter === 'missingWhatsapp' && sub.whatsapp.trim()) {
        return false;
      }

      if (subscriberQuickFilter === 'missingContact' && contactHealth !== 'missing') {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        return [sub.name, sub.email, sub.whatsapp, sub.facebook, sub.service, sub.workspace].some((value) => readSearchableValue(value).includes(query));
      }

      return true;
    });
  }, [getStatus, searchQuery, subscriberQuickFilter, subscriptions]);

  const analytics = useMemo<AnalyticsSummary>(() => {
    const from = new Date(statsFromDate);
    const to = new Date(statsToDate);
    const today = new Date();
    const serviceCounts = new Map<string, number>();
    const serviceIncome = new Map<string, number>();
    let periodIncome = 0;
    let totalInPeriod = 0;
    let currentActive = 0;

    subscriptions.forEach(sub => {
      if (new Date(sub.endDate) >= today) {
        currentActive += 1;
      }

      const subscriptionStartDate = new Date(sub.startDate);
      if (subscriptionStartDate >= from && subscriptionStartDate <= to) {
        periodIncome += Number(sub.payment);
        totalInPeriod += 1;
        serviceCounts.set(sub.service, (serviceCounts.get(sub.service) ?? 0) + 1);
        serviceIncome.set(sub.service, (serviceIncome.get(sub.service) ?? 0) + Number(sub.payment));
      }
    });

    return {
      periodIncome,
      totalInPeriod,
      currentActive,
      serviceDist: Array.from(serviceCounts, ([name, value]) => ({ name, value })),
      incomeDist: Array.from(serviceIncome, ([name, amount]) => ({ name, amount })),
    };
  }, [subscriptions, statsFromDate, statsToDate]);

  const handleExport = async () => {
    const { utils, writeFile } = await import('xlsx');
    const normalizedData = subscriptions.map(s => ({
      [t.id]: s.id,
      [t.service]: s.service,
      [t.category]: s.category || getDefaultCategoryForService(s.service) || '',
      [t.name]: s.name,
      [t.email]: s.email,
      [t.whatsapp]: s.whatsapp ? `+${s.countryCode}${s.whatsapp}` : '',
      [t.facebook]: s.facebook || '',
      [t.startDate]: formatDateDisplay(s.startDate),
      [t.endDate]: formatDateDisplay(s.endDate),
      [t.duration]: s.duration === 'yearly' ? t.yearly : s.duration === 'quarterly' ? t.quarterly : t.monthly,
      [t.amount]: s.payment,
      [t.workspace]: s.workspace,
    }));

    const worksheet = utils.json_to_sheet(normalizedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Subscriptions');
    writeFile(workbook, 'Subman_Export.xlsx');
  };

  const handleProfileAction = async (userId: string, updates: Partial<Pick<Profile, 'role' | 'status'>>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single<DbProfile>();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      const normalizedProfile = normalizeProfile(data);
      setAllUsers((currentUsers) => currentUsers.map((user) => (
        user.id === userId
          ? { ...normalizedProfile, authMethod: user.authMethod }
          : user
      )));

      if (currentUser?.id === userId) {
        setUserProfile(normalizedProfile);
      }
    }

    setSuccessMessage(lang === 'ar' ? 'تم تحديث بيانات المستخدم' : 'User updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    const { error } = await supabase.from('profiles').delete().eq('id', userId);

    if (error) {
      alert(error.message);
      return;
    }

    setAllUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    setSuccessMessage(lang === 'ar' ? 'تم حذف المستخدم' : 'User deleted successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const subscriberFormContactHealth = getContactHealth(formData);
  const normalizedPathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isPublicMfaRoute = normalizedPathname === '/mfa';
  const twoFactorDisplayCode = twoFactorCode ? `${twoFactorCode.slice(0, 3)} ${twoFactorCode.slice(3, 6)}` : '--- ---';
  const twoFactorExpiryProgress = twoFactorExpiryAt ? Math.max(0, Math.min(100, (twoFactorCountdown / 600) * 100)) : 0;

  const twoFactorToolView = (
    <div className="settings-view animate-fade two-factor-view">
      <div className="two-factor-hero">
        <h2 className="section-heading">{t.twoFactorGenerator}</h2>
        <p className="view-banner">{t.twoFactorIntro}</p>
      </div>

      <div className="form-card two-factor-card">
        <div className="two-factor-card-shell">
          <div className="two-factor-hint">
            <strong>{t.chatgptMfaHintTitle}</strong>
            <p>{t.chatgptMfaHintBody}</p>
          </div>

          <div className="two-factor-grid">
            <div className="two-factor-input-panel">
              <div className="two-factor-panel-head">
                <span className="two-factor-kicker">{lang === 'ar' ? 'المفتاح' : 'Secret'}</span>
                <h3>{lang === 'ar' ? 'أدخل المفتاح المشترك' : 'Paste your shared secret'}</h3>
              </div>

              <div className="input-field-group two-factor-secret-group">
                <label>{t.twoFactorSecretLabel}</label>
                <input
                  type="text"
                  placeholder={t.twoFactorSecretLabel}
                  value={twoFactorSecret}
                  onChange={(e) => {
                    setTwoFactorSecret(e.target.value);
                    if (twoFactorError) {
                      setTwoFactorError('');
                    }
                  }}
                />
              </div>

              <div className="two-factor-actions">
                <button type="button" className="btn-primary" onClick={() => void handleGenerateTwoFactorCode()}>{t.generateCode}</button>
                <button type="button" className="btn-secondary" onClick={() => void handleCopyTwoFactorCode()} disabled={!twoFactorCode}>{t.copyCode}</button>
                <button type="button" className="btn-secondary" onClick={handleClearTwoFactorTool}>{t.clear}</button>
              </div>

              {twoFactorError && <div className="two-factor-error">{twoFactorError}</div>}
            </div>

            <div className="two-factor-output-panel">
              <div className="two-factor-chip">{lang === 'ar' ? 'رمز لمرة واحدة' : 'One-time code'}</div>
              <div className="two-factor-code">{twoFactorDisplayCode}</div>
              <div className="two-factor-meta">{t.nextRefresh} {twoFactorCountdown} {t.seconds}</div>

              <div className="two-factor-timer-track" aria-hidden="true">
                <span className="two-factor-timer-fill" style={{ width: `${twoFactorExpiryProgress}%` }} />
              </div>

              <p className="two-factor-footnote">
                {lang === 'ar' ? 'يتم التوليد داخل المتصفح فقط ولن يتم حفظ المفتاح.' : 'Generated locally in your browser. Your secret is never stored.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubscriberForm = (mode: 'create' | 'edit') => (
    <form onSubmit={(e) => { e.preventDefault(); void submitSubscriptionForm(); }} className="admin-form">
      {(() => {
        const categoryOptions = SERVICE_CATEGORY_OPTIONS[formData.service] ?? [];

        return (
          <>
      <div className="form-section">
        <div className="form-section-header">
          <h3 className="section-title">{mode === 'edit' ? t.editSubscriber : t.createSubscriber}</h3>
          {mode === 'edit' && (
            <button type="button" onClick={resetForm} className="btn-secondary modal-close-inline">{t.close}</button>
          )}
        </div>
        <div className="form-row">
          <div className="input-field-group">
            <label>{t.service}</label>
            <select value={formData.service} onChange={e => {
              const newSvc = e.target.value;
              setFormData(sanitizeFormDataForService({ ...formData, category: getDefaultCategoryForService(newSvc) }, newSvc));
            }} required>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="input-field-group">
            <label>{t.category}</label>
            <select value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="input-field-group">
            <label>{t.duration}</label>
            <select value={formData.duration || 'monthly'} onChange={e => {
              const dur = e.target.value as 'monthly' | 'quarterly' | 'yearly';
              if (formData.startDate) {
                const newEnd = calculateEndDate(formData.startDate, dur);
                setFormData({ ...formData, duration: dur, endDate: newEnd });
              } else {
                setFormData({ ...formData, duration: dur });
              }
            }} required>
              <option value="monthly">{t.monthly}</option>
              <option value="quarterly">{t.quarterly}</option>
              <option value="yearly">{t.yearly}</option>
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: '1.5rem' }}>
          <div className="input-field-group">
            <label>{t.startDate}</label>
            <input type="date" value={formData.startDate} onChange={e => {
              const strt = e.target.value;
              const dur = formData.duration || 'monthly';
              if (strt) {
                setFormData({ ...formData, startDate: strt, endDate: calculateEndDate(strt, dur) });
              } else {
                setFormData({ ...formData, startDate: strt });
              }
            }} required />
          </div>
          <div className="input-field-group">
            <label>{t.endDate}</label>
            <div className="calculated-label">{formatDateDisplay(formData.endDate)}</div>
          </div>
          <div className="input-field-group">
            <label>{t.workspace}</label>
            <input type="text" placeholder={t.workspace} value={formData.workspace} onChange={e => setFormData({ ...formData, workspace: e.target.value })} />
          </div>
          <div className="input-field-group">
            <label>{t.amount}</label>
            <input type="number" placeholder={t.amount} value={formData.payment || ''} onChange={e => setFormData({ ...formData, payment: Number(e.target.value) })} required />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.subscriberDetail}</h3>
        <div className="form-row">
          <div className="input-field-group">
            <label>{t.name}</label>
            <input type="text" placeholder={t.name} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="input-field-group">
            <input aria-label={t.facebook} type="text" placeholder={t.facebook} value={formData.facebook} onChange={e => setFormData({ ...formData, facebook: e.target.value })} />
          </div>
          <div className="input-field-group">
            <input aria-label={t.email} type="email" placeholder={t.email} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="input-field-group">
            <div className="phone-field-row">
              <select style={{ width: '80px' }} value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })}>
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>+{c.code}</option>)}
              </select>
              <input aria-label={t.whatsapp} type="text" placeholder={t.whatsapp} value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
          <div className="input-field-group" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
            <button type="submit" className="login-submit-btn" style={{ margin: 0, height: '50px' }}>{mode === 'edit' ? t.update : t.add}</button>
            {mode === 'edit' && (
              <button type="button" onClick={resetForm} className="btn-secondary" style={{ margin: '0 0.5rem 0 0', height: '50px' }}>{t.cancel}</button>
            )}
          </div>
        </div>
        <div className={`quality-hint quality-${subscriberFormContactHealth}`}>
          <strong>{subscriberFormContactHealth === 'complete' ? t.contactComplete : subscriberFormContactHealth === 'partial' ? t.contactPartial : t.contactMissing}</strong>
          <span>{subscriberFormContactHealth === 'missing' ? t.contactMissingHint : ''}</span>
        </div>
      </div>
          </>
        );
      })()}
    </form>
  );

  return (
    <div className={`app-layout ${theme}-theme ${!isLoggedIn || (userProfile?.status === 'pending' && userProfile?.role !== 'admin') ? 'is-login-page' : ''}`}>
      {isPublicMfaRoute ? (
        <main className="content">
          <header className="main-header">
            <div className="header-left">
              <button className="toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t.theme}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="toggle-btn lang-toggle" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title={t.lang}>
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>
            </div>
            <h1 className="platform-name">{t.twoFactorTool}</h1>
          </header>
          <div className="view-container">{twoFactorToolView}</div>
          <footer className="app-footer">{t.rights} &copy; {new Date().getFullYear()} {t.owner}</footer>
        </main>
      ) : !isLoggedIn ? (
        <div className="login-container">
          <div className="login-card">
            <h1>{t.title}</h1>
            <div className="login-intro">
              <p className="login-eyebrow">{lang === 'ar' ? 'الدخول الأسرع' : 'Fastest sign in'}</p>
              <p className="login-subtitle">{lang === 'ar' ? 'تسجيل الدخول يتم الآن عبر جوجل فقط لتجربة أسرع وأكثر ثباتاً.' : 'Sign in now runs through Google only for a faster, more reliable experience.'}</p>
            </div>
            <button type="button" onClick={handleGoogleLogin} className="google-btn login-google-primary">
              <span style={{ fontSize: '1.2rem' }}>G</span> {t.googleLogin}
            </button>
            <p className="mail-link-btn">{t.mailHint}</p>
          </div>
        </div>
      ) : isLoadingProfile ? (
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="loader"></div>
            <p style={{ marginTop: '20px' }}>{lang === 'ar' ? 'جاري تحميل البيانات...' : 'Loading profile...'}</p>
          </div>
        </div>
      ) : userProfile?.status === 'pending' && userProfile?.role !== 'admin' ? (
        <div className="login-container">
          <div className="pending-card animate-fade">
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>⏳</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>{t.pendingTitle}</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              {t.pendingMsg}
            </p>
            <button onClick={handleLogout} className="btn-secondary">
              🚪 {t.logout}
            </button>
          </div>
        </div>
      ) : (
        <>
          <aside className="sidebar">
            <nav>
              <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''} title={t.dashboard}><span className="nav-glyph">◫</span></button>
              <button onClick={() => setCurrentView('subscribers')} className={currentView === 'subscribers' ? 'active' : ''} title={t.subscribers}><span className="nav-glyph">◎</span></button>
              <button onClick={() => setCurrentView('twoFactorTool')} className={currentView === 'twoFactorTool' ? 'active' : ''} title={t.twoFactorTool}><span className="nav-glyph">#</span></button>
              <button onClick={() => setCurrentView('notifications')} className={currentView === 'notifications' ? 'active' : ''} title={t.notifications}>
                <span className="nav-glyph">◌</span> {notifications && notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              {userProfile?.role === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('users')} className={currentView === 'users' ? 'active' : ''} title={t.access}><span className="nav-glyph">◇</span></button>
                  <button onClick={() => setCurrentView('settings')} className={currentView === 'settings' ? 'active' : ''} title={t.settings}><span className="nav-glyph">✦</span></button>
                </>
              )}
            </nav>
            <button onClick={handleLogout} className="logout" title={t.logout}><span className="nav-glyph">↗</span></button>
          </aside>

          <main className="content">
            <header className="main-header">
              <div className="header-left">
                <button className="toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t.theme}>
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button className="toggle-btn lang-toggle" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title={t.lang}>
                  {lang === 'ar' ? 'EN' : 'AR'}
                </button>
              </div>
              <h1 className="platform-name">{t.title}</h1>
            </header>

            <div className="view-container">
              {currentView === 'dashboard' && (
                <div className="dashboard-view animate-fade">
                  <div className="header-actions" style={{ marginBottom: '2rem' }}>
                    <h2 className="section-heading">{t.dashboard}</h2>
                    <div className="dashboard-filters">
                      <div className="filter-card">
                        <label>{lang === 'ar' ? 'من' : 'From'}</label>
                        <input className="filter-input" type="date" value={statsFromDate} onChange={e => setStatsFromDate(e.target.value)} />
                      </div>
                      <div className="filter-card">
                        <label>{lang === 'ar' ? 'إلى' : 'To'}</label>
                        <input className="filter-input" type="date" value={statsToDate} onChange={e => setStatsToDate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-overview-grid">
                    <div className="stats-column">
                      <div className="stat-card income" style={{ margin: 0 }}>
                        <h3>{t.periodIncome}</h3>
                        <p>{analytics.periodIncome} {lang === 'ar' ? 'ج.م' : 'EGP'}</p>
                        <small>{analytics.totalInPeriod} {t.newSubs}</small>
                      </div>
                      <div className="stat-card active" style={{ margin: 0 }}>
                        <h3>{t.totalActive}</h3>
                        <p>{analytics.currentActive}</p>
                        <small>{t.activeNow}</small>
                      </div>
                    </div>

                    <div className="charts-grid">
                      <Suspense
                        fallback={
                          <>
                            <div className="chart-card chart-card-loading" style={{ margin: 0 }}>
                              <h3>{t.serviceDist}</h3>
                              <div className="chart-placeholder">Loading...</div>
                            </div>
                            <div className="chart-card chart-card-loading" style={{ margin: 0 }}>
                              <h3>{t.incomeDist}</h3>
                              <div className="chart-placeholder">Loading...</div>
                            </div>
                          </>
                        }
                      >
                        <AnalyticsCharts
                          axisColor={chartAxisColor}
                          barColor={chartBarColor}
                          colors={chartPalette}
                          gridColor={chartGridColor}
                          incomeDist={analytics.incomeDist}
                          incomeLabel={t.incomeDist}
                          serviceDist={analytics.serviceDist}
                          serviceLabel={t.serviceDist}
                          textColor={chartAxisColor}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'settings' && (
                <div className="settings-view animate-fade">
                  <h2 className="section-heading">{t.settings}</h2>
                  <div className="form-card">
                    <h3>{t.waTemplate}</h3>
                    <p className="help-text">{t.waHelp}</p>
                    <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} className="settings-textarea" rows={4} />
                    <button onClick={async () => { await supabase.from('settings').upsert({ id: 'whatsapp_message', value: waMessage }); setSuccessMessage(t.saved); setTimeout(() => setSuccessMessage(''), 3000); }} className="btn-primary" style={{ marginTop: '1rem' }}>{t.save}</button>
                  </div>
                  {successMessage && <div className="success-banner">{successMessage}</div>}
                </div>
              )}

              {currentView === 'notifications' && (
                <div className="notifications-view animate-fade">
                  <div className="header-actions"><h2 className="section-heading">{t.notifCenter}</h2><button onClick={() => { if (currentUser) { void supabase.from('notifications').delete().eq('user_id', currentUser.id); } }} className="btn-secondary">{t.clearAll}</button></div>
                  <div className="notifications-list">
                    {!notifications || notifications.length === 0 ? <p className="empty-msg">{t.noNotifs}</p> :
                      notifications.map(n => (<div key={n.id} className={`notification-item type-${n.type}`}><div className="notif-content"><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</small></div><button onClick={() => supabase.from('notifications').delete().eq('id', n.id)} className="btn-close">×</button></div>))
                    }
                  </div>
                </div>
              )}

              {currentView === 'subscribers' && (
                <div className="subscribers-view animate-fade">
                  <div className="header-actions" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="section-heading">{t.manageSubs}</h2>
                  </div>
                  <p className="view-banner">{lang === 'ar' ? 'ابحث، صفِّ النتائج، ثم صدّر أو عدّل البيانات مباشرة.' : 'Search, filter, export, and edit subscriber data directly from this view.'}</p>

                  <div className="subscribers-toolbar">
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder={t.search}
                        className="search-input-refined"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', margin: 0, padding: '0.8rem 1rem' }}
                      />
                    </div>

                    <button onClick={handleExport} className="btn-primary" style={{ padding: '0.75rem 1.5rem', width: 'auto', margin: 0 }} title={t.export}>
                      📊 {t.export}
                    </button>
                  </div>

                  <div className="toolbar-panel">
                    <div className="filter-group">
                      <span className="toolbar-label">{t.quickFilters}</span>
                      {(['all', 'expiringSoon', 'expired', 'missingEmail', 'missingWhatsapp', 'missingContact'] as SubscriberQuickFilter[]).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          className={`filter-chip ${subscriberQuickFilter === filter ? 'active' : ''}`}
                          onClick={() => setSubscriberQuickFilter(filter)}
                        >
                          {filter === 'all' ? t.clearAll : filter === 'expiringSoon' ? t.expiringSoon : filter === 'expired' ? t.expired : filter === 'missingEmail' ? t.missingEmail : filter === 'missingWhatsapp' ? t.missingWhatsapp : t.missingContact}
                        </button>
                      ))}
                    </div>
                    <div className="filter-group filter-checks">
                      <span className="toolbar-label">{t.visibleColumns}</span>
                      <label><input type="checkbox" checked={subscriberColumns.category} onChange={() => setSubscriberColumns((current) => ({ ...current, category: !current.category }))} /> {t.category}</label>
                      <label><input type="checkbox" checked={subscriberColumns.contact} onChange={() => setSubscriberColumns((current) => ({ ...current, contact: !current.contact }))} /> {t.contactColumn}</label>
                      <label><input type="checkbox" checked={subscriberColumns.workspace} onChange={() => setSubscriberColumns((current) => ({ ...current, workspace: !current.workspace }))} /> {t.workspace}</label>
                      <label><input type="checkbox" checked={subscriberColumns.payment} onChange={() => setSubscriberColumns((current) => ({ ...current, payment: !current.payment }))} /> {t.amount}</label>
                      <label><input type="checkbox" checked={subscriberColumns.activity} onChange={() => setSubscriberColumns((current) => ({ ...current, activity: !current.activity }))} /> {t.activity}</label>
                    </div>
                  </div>

                  {successMessage && <div className="success-banner" style={{ marginBottom: '1rem', textAlign: 'center' }}>{successMessage}</div>}

                  <div className="main-content-card">
                    {!isSubscriberModalOpen && (
                      <div style={{ padding: '2.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        {renderSubscriberForm('create')}
                      </div>
                    )}

                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>{t.service}</th>
                            <th>{t.name}</th>
                            {subscriberColumns.contact && <th>{t.contactColumn}</th>}
                            {subscriberColumns.workspace && <th>{t.workspace}</th>}
                            {subscriberColumns.payment && <th>{t.amount}</th>}
                            <th>{t.endDate}</th>
                            {subscriberColumns.activity && <th>{t.activity}</th>}
                            <th style={{ textAlign: 'center' }}>{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubscriptions.map(s => {
                            const status = getStatus(s.endDate);
                            const contactHealth = getContactHealth(s);

                            return (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 600 }} className="inline-muted">#{s.id}</td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.service}</div>
                                  {subscriberColumns.category && <div className="subscriber-meta">{s.category || getDefaultCategoryForService(s.service)}</div>}
                                  <span className={`badge ${status.className}`}>{status.label}</span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                                  <div className="subscriber-meta">{s.duration === 'yearly' ? t.yearly : s.duration === 'quarterly' ? t.quarterly : t.monthly}</div>
                                </td>
                                {subscriberColumns.contact && (
                                  <td>
                                    <div className="contact-stack">
                                      <div>{s.email || '-'}</div>
                                      <div className="subscriber-meta">{s.whatsapp ? `+${s.countryCode} ${s.whatsapp}` : '-'}</div>
                                      <div className="subscriber-meta">{s.facebook || '-'}</div>
                                      <span className={`badge ${contactHealth === 'complete' ? 'badge-success' : contactHealth === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{contactHealth === 'complete' ? t.contactComplete : contactHealth === 'partial' ? t.contactPartial : t.contactMissing}</span>
                                    </div>
                                  </td>
                                )}
                                {subscriberColumns.workspace && <td>{s.workspace || '-'}</td>}
                                {subscriberColumns.payment && <td>{s.payment || 0}</td>}
                                <td>
                                  <div style={{ fontWeight: 700 }}>{formatDateDisplay(s.endDate)}</div>
                                  <div className="subscriber-meta">{status.label}</div>
                                </td>
                                {subscriberColumns.activity && (
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{formatDateTimeDisplay(s.updatedAt ?? s.createdAt, locale)}</div>
                                    <div className="subscriber-meta">{getActorName(s.updatedBy ?? s.user_id)}</div>
                                  </td>
                                )}
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <div className="subscriber-actions">
                                    {s.whatsapp && (
                                      <button onClick={() => sendWhatsApp(s)} title={t.whatsapp} aria-label={t.whatsapp}>
                                        <span className="brand-icon brand-icon-whatsapp" aria-hidden="true">
                                          <svg viewBox="0 0 32 32" focusable="false">
                                            <path d="M16 3.2A12.8 12.8 0 0 0 4.6 21.9L3.1 28.9l7.2-1.4A12.8 12.8 0 1 0 16 3.2Zm0 23.2a10.4 10.4 0 0 1-5.3-1.4l-.4-.3-4.2.8.8-4.1-.3-.4A10.4 10.4 0 1 1 16 26.4Zm5.7-7.8c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.8.2-.2.3-.9 1-.9 1.1-.2.2-.3.2-.6.1a8.5 8.5 0 0 1-2.5-1.6 9.2 9.2 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6 0-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7a1.4 1.4 0 0 0-1 .5 4.2 4.2 0 0 0-1.3 3.1c0 1.8 1.3 3.5 1.5 3.8.2.2 2.7 4.2 6.7 5.7.9.4 1.7.6 2.2.8.9.3 1.8.3 2.5.2.7-.1 2.2-.9 2.5-1.8.3-.8.3-1.6.2-1.8-.1-.1-.3-.2-.6-.4Z" />
                                          </svg>
                                        </span>
                                      </button>
                                    )}
                                    {resolveMessengerUrl(s.facebook) && (
                                      <button onClick={() => window.open(resolveMessengerUrl(s.facebook), '_blank')} title={t.openMessenger} aria-label={t.openMessenger}>
                                        <span className="brand-icon brand-icon-messenger" aria-hidden="true">
                                          <svg viewBox="0 0 32 32" focusable="false">
                                            <path d="M16 3.2C9 3.2 3.4 8.4 3.4 14.9c0 3.8 1.9 7.2 4.9 9.4v4.5l4.3-2.4c1.1.3 2.2.4 3.4.4 7 0 12.6-5.2 12.6-11.7S23 3.2 16 3.2Zm1.3 15.7-3.2-3.4-6.1 3.4 6.8-7.2 3.2 3.4 6.1-3.4-6.8 7.2Z" />
                                          </svg>
                                        </span>
                                      </button>
                                    )}
                                    <button onClick={() => { void copySubscriberData(s); }} title={t.copyFullData}>📋</button>
                                    <button onClick={() => handleRenewClick(s)} title={t.renew}>🔄</button>
                                    <button onClick={() => openSubscriptionEditor(s)} title={t.update}>✏️</button>
                                    <button onClick={() => { if (window.confirm(t.confirmDelete)) supabase.from('subscriptions').delete().eq('id', s.id); }} title={t.logout}>🗑️</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {isSubscriberModalOpen && (
                    <div className="modal-overlay" onClick={resetForm}>
                      <div className="modal-card main-content-card" onClick={(event) => event.stopPropagation()}>
                        <div style={{ padding: '2rem' }}>
                          {renderSubscriberForm('edit')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentView === 'twoFactorTool' && twoFactorToolView}

              {currentView === 'users' && (
                <div className="users-view animate-fade">
                  <div className="header-actions" style={{ marginBottom: '2rem' }}>
                    <h2 className="section-heading">{t.manageUsers}</h2>
                  </div>
                  <p className="view-banner">{lang === 'ar' ? 'تابع حالة الحساب، الصلاحية، وطريقة التسجيل لكل مستخدم.' : 'Review each user account status, role, and sign-in method in one place.'}</p>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>{t.user}</th><th>{t.status}</th><th>{t.role}</th><th>{t.authMethod}</th><th>{t.actions}</th></tr></thead>
                      <tbody>{allUsers?.map(u => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>
                            <span className={`badge ${u.status === 'approved' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td><span className="badge badge-service">{u.role === 'admin' ? t.admin : t.userLabel}</span></td>
                          <td><span className={`badge ${getAuthMethodClassName(u.authMethod)}`}>{getAuthMethodIcon(u.authMethod)} {getAuthMethodLabel(u.authMethod, t)}</span></td>
                          <td>
                            <div className="user-actions">
                              {u.status === 'pending' && (
                                <>
                                  <button onClick={() => { void handleProfileAction(u.id, { status: 'approved' }); }} className="btn-success" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.approve}</button>
                                  <button onClick={() => { void handleProfileAction(u.id, { status: 'rejected' }); }} className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.reject}</button>
                                </>
                              )}
                              {u.role !== 'admin' ? (
                                <button onClick={() => { void handleProfileAction(u.id, { role: 'admin' }); }} className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.makeAdmin}</button>
                              ) : (
                                u.id !== currentUser?.id && (
                                  <button onClick={() => { void handleProfileAction(u.id, { role: 'user' }); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.makeUser}</button>
                                )
                              )}
                              <button onClick={() => { void handleDeleteUser(u.id); }} className="btn-delete" title={t.logout}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <footer className="app-footer">{t.rights} &copy; {new Date().getFullYear()} {t.owner}</footer>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
