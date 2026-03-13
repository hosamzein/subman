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
const SERVICE_CATEGORIES: Record<string, string> = {
  'Grok': 'Artificial Intelligence',
  'ChatGPT': 'Artificial Intelligence',
  'Perplexity': 'Artificial Intelligence',
  'Gemini': 'Artificial Intelligence',
};
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
    whatsapp: "واتساب",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    amount: "المبلغ",
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
    subDetail: "تفاصيل الاشتراك",
    subscriberDetail: "بيانات المشترك",
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
    whatsapp: "WhatsApp",
    startDate: "Start Date",
    endDate: "End Date",
    amount: "Amount",
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
    subDetail: "Subscription Details",
    subscriberDetail: "Subscriber Details",
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
type View = 'login' | 'dashboard' | 'subscribers' | 'users' | 'notifications' | 'settings';

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
  category: 'Artificial Intelligence',
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
  countryCode: subscription.countrycode,
  startDate: subscription.startdate,
  endDate: subscription.enddate,
  payment: Number(subscription.payment),
  workspace: subscription.workspace,
  createdAt: subscription.createdat,
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
  const [showOnlyRenewals, setShowOnlyRenewals] = useState(false);

  const [statsFromDate, setStatsFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [statsToDate, setStatsToDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  const [formData, setFormData] = useState<SubscriptionFormData>(createDefaultFormData);
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

  const resetForm = () => {
    setFormData(createDefaultFormData());
    setEditingId(null);
  };

  const sendWhatsApp = (sub: Subscription) => {
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

  const handleRenewClick = (subscription: Subscription) => {
    const newStartDate = subscription.endDate;
    const currentDuration = subscription.duration || 'monthly';
    const newEndDate = calculateEndDate(newStartDate, currentDuration);

    setFormData({
      ...subscription,
      startDate: newStartDate,
      endDate: newEndDate,
      duration: currentDuration,
      category: subscription.category || SERVICE_CATEGORIES[subscription.service] || '',
    });

    setEditingId(subscription.id);
    window.scrollTo(0, 0);
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const status = getStatus(sub.endDate);

      if (showOnlyRenewals && !status.needsRenewal) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        return [sub.name, sub.email, sub.whatsapp].some((value) => readSearchableValue(value).includes(query));
      }

      return true;
    });
  }, [getStatus, searchQuery, showOnlyRenewals, subscriptions]);

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
    const data = subscriptions.map(s => ({
      [t.id]: s.id,
      [t.service]: s.service,
      [t.category]: s.category || SERVICE_CATEGORIES[s.service] || '',
      [t.name]: s.name,
      [t.email]: s.email,
      [t.whatsapp]: `+${s.countryCode}${s.whatsapp}`,
      [t.startDate]: formatDateDisplay(s.startDate),
      [t.endDate]: formatDateDisplay(s.endDate),
      [t.duration]: s.duration === 'yearly' ? t.yearly : s.duration === 'quarterly' ? t.quarterly : t.monthly,
      [t.amount]: s.payment,
      [t.workspace]: s.workspace,
    }));

    const worksheet = utils.json_to_sheet(data);
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

  return (
    <div className={`app-layout ${theme}-theme ${!isLoggedIn || (userProfile?.status === 'pending' && userProfile?.role !== 'admin') ? 'is-login-page' : ''}`}>
      {!isLoggedIn ? (
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

                    <div>
                      <label className="renewal-toggle">
                        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>📥</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.renewalOnly}</span>
                        <input
                          type="checkbox"
                          checked={showOnlyRenewals}
                          onChange={e => setShowOnlyRenewals(e.target.checked)}
                          style={{ margin: 0, cursor: 'pointer', marginLeft: '0.5rem' }}
                        />
                      </label>
                    </div>

                    <button onClick={handleExport} className="btn-primary" style={{ padding: '0.75rem 1.5rem', width: 'auto', margin: 0 }} title={t.export}>
                      📊 {t.export}
                    </button>
                  </div>

                  {successMessage && <div className="success-banner" style={{ marginBottom: '1rem', textAlign: 'center' }}>{successMessage}</div>}

                  <div className="main-content-card">
                    <div style={{ padding: '2.5rem', borderBottom: '1px solid var(--border-color)' }}>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!currentUser) {
                          return;
                        }
                        if (editingId) { 
                          await supabase.from('subscriptions').update(toDbSubscriptionPayload(formData)).eq('id', editingId);
                          setSuccessMessage(t.updated); 
                        }
                        else { 
                          await supabase.from('subscriptions').insert([{ ...toDbSubscriptionPayload(formData), user_id: currentUser.id, createdat: new Date().toISOString() }]);
                          setSuccessMessage(t.saved); 
                        }
                        resetForm();
                        setTimeout(() => setSuccessMessage(''), 3000);
                      }} className="admin-form">

                        <div className="form-section">
                          <h3 className="section-title">{t.subDetail}</h3>
                          <div className="form-row">
                            <div className="input-field-group">
                              <label>{t.service}</label>
                              <select value={formData.service} onChange={e => {
                                const newSvc = e.target.value;
                                setFormData({ ...formData, service: newSvc, category: SERVICE_CATEGORIES[newSvc] || '' });
                              }} required>
                                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="input-field-group">
                              <label>{t.category}</label>
                              <input type="text" placeholder={t.category} value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                            </div>
                            <div className="input-field-group">
                              <label>{t.duration}</label>
                              <select value={formData.duration || 'monthly'} onChange={e => {
                                const dur = e.target.value as 'monthly' | 'quarterly' | 'yearly';
                                if (formData.startDate) {
                                  const newEnd = calculateEndDate(formData.startDate, dur);
                                  setFormData({ ...formData, duration: dur, endDate: newEnd });
                                } else setFormData({ ...formData, duration: dur });
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
                                if (strt) setFormData({ ...formData, startDate: strt, endDate: calculateEndDate(strt, dur) });
                                else setFormData({ ...formData, startDate: strt });
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
                              <label>{t.email}</label>
                              <input type="email" placeholder={t.email} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="input-field-group">
                              <label>{t.whatsapp}</label>
                              <div className="phone-field-row">
                                <select style={{ width: '80px' }} value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} required>
                                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>+{c.code}</option>)}
                                </select>
                                <input type="text" placeholder={t.whatsapp} value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })} required />
                              </div>
                            </div>
                            <div className="input-field-group" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
                              <button type="submit" className="login-submit-btn" style={{ margin: 0, height: '50px' }}>{editingId ? t.update : t.add}</button>
                              {editingId && (
                                <button type="button" onClick={resetForm} className="btn-secondary" style={{ margin: '0 0.5rem 0 0', height: '50px' }}>{t.cancel}</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>{t.service}</th>
                            <th>{t.name}</th>
                            <th>{t.endDate}</th>
                            <th style={{ textAlign: 'center' }}>{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubscriptions.map(s => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600 }} className="inline-muted">#{s.id}</td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.service}</div>
                                <div className="subscriber-meta">{s.category || SERVICE_CATEGORIES[s.service]}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                <div className="subscriber-meta">+{s.countryCode} {s.whatsapp}</div>
                              </td>
                              <td>
                                <span className={`badge ${getStatus(s.endDate).className}`}>{formatDateDisplay(s.endDate)}</span>
                                <div className="subscriber-meta" style={{ marginTop: '4px', fontSize: '0.8rem' }}>
                                  {s.duration === 'yearly' ? t.yearly : s.duration === 'quarterly' ? t.quarterly : t.monthly}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div className="subscriber-actions">
                                  <button onClick={() => sendWhatsApp(s)} title={t.whatsapp}>💬</button>
                                  <button onClick={() => handleRenewClick(s)} title={t.renew}>🔄</button>
                                  <button onClick={() => { setFormData({ ...s, category: s.category || SERVICE_CATEGORIES[s.service] || '', duration: s.duration || 'monthly' }); setEditingId(s.id!); window.scrollTo(0, 0); }} title={t.update}>✏️</button>
                                  <button onClick={() => { if (window.confirm(t.confirmDelete)) supabase.from('subscriptions').delete().eq('id', s.id); }} title={t.logout}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

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
