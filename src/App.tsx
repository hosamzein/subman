import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from './supabaseClient';
import './App.css';

const SERVICES = ['Grok', 'ChatGPT', 'Perplexity', 'Gemini'];
const SERVICE_CATEGORIES: Record<string, string> = {
  'Grok': 'Artificial Intelligence',
  'ChatGPT': 'Artificial Intelligence',
  'Perplexity': 'Artificial Intelligence',
  'Gemini': 'Artificial Intelligence',
};
const COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6'];
const COUNTRY_CODES = [
  { code: '20', label: 'مصر (+20)' },
  { code: '966', label: 'السعودية (+966)' },
  { code: '971', label: 'الإمارات (+971)' },
  { code: '965', label: 'الكويت (+965)' },
  { code: '964', label: 'العراق (+964)' },
  { code: '974', label: 'قطر (+974)' },
];

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
    editor: "محرر",
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
    pendingMsg: "حسابك قيد المراجعة حالياً من قبل الإدارة. يرجى المحاولة لاحقاً.",
    register: "تسجيل حساب جديد",
    alreadyHave: "لديك حساب بالفعل؟ دخول",
    needAccount: "ليس لديك حساب؟ سجل الآن",
    googleLogin: "الدخول بواسطة جوجل",
    status: "الحالة",
    approve: "تفعيل",
    reject: "رفض"
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
    editor: "Editor",
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
    pendingMsg: "Your account is currently pending approval by an administrator. Please check back later.",
    register: "Register New Account",
    alreadyHave: "Already have an account? Login",
    needAccount: "Don't have an account? Register",
    googleLogin: "Login with Google",
    status: "Status",
    approve: "Approve",
    reject: "Reject"
  }
};

type View = 'login' | 'dashboard' | 'subscribers' | 'users' | 'notifications' | 'settings';

function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(localStorage.getItem('subman_lang') as 'ar' | 'en' || 'ar');
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('subman_theme') as 'dark' | 'light' || 'dark');
  const [currentView, setCurrentView] = useState<View>('login');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', pass: '' });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [waMessage, setWaMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyRenewals, setShowOnlyRenewals] = useState(false);

  const [statsFromDate, setStatsFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [statsToDate, setStatsToDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  const [formData, setFormData] = useState<{
    service: string; category?: string; duration?: 'monthly' | 'quarterly' | 'yearly';
    name: string; email: string; facebook: string; countryCode: string; whatsapp: string;
    startDate: string; endDate: string; payment: number; workspace: string;
  }>({
    service: 'Grok', category: 'Artificial Intelligence', duration: 'monthly',
    name: '', email: '', facebook: '', countryCode: '20', whatsapp: '',
    startDate: '', endDate: '', payment: 0, workspace: ''
  });
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('subman_lang', lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('subman_theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setCurrentUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(profile);
      }
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setCurrentUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(profile);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentView('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    
    if (userProfile && userProfile.status === 'pending' && userProfile.role !== 'admin') {
      return;
    }

    const fetchData = async () => {
      let subQuery = supabase.from('subscriptions').select('*');
      if (userProfile?.role !== 'admin') {
        subQuery = subQuery.eq('user_id', currentUser.id);
      }
      const { data: subs } = await subQuery.order('createdAt', { ascending: false });
      setSubscriptions(subs || []);

      if (userProfile?.role === 'admin') {
        const { data: profiles } = await supabase.from('profiles').select('*');
        setAllUsers(profiles || []);
      }

      const { data: settings } = await supabase.from('settings').select('*').eq('id', 'whatsapp_message').single();
      if (settings) setWaMessage(settings.value);
      else setWaMessage("مرحباً {name}، نود تذكيرك بأن اشتراك {service} سينتهي بتاريخ {date}.");

      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('createdAt', { ascending: false });
      setNotifications(notifs || []);
    };

    fetchData();

    const subChannel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [isLoggedIn, currentUser, userProfile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.pass,
    });
    if (error) alert(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email: loginData.email,
      password: loginData.pass,
    });
    if (error) {
      alert(error.message);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').insert([{ 
        id: data.user.id, 
        username: loginData.email.split('@')[0],
        role: 'editor',
        status: 'pending'
      }]);
      alert(t.pendingMsg);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const sendWhatsApp = (sub: any) => {
    let msg = waMessage.replace('{name}', sub.name).replace('{service}', sub.service).replace('{date}', formatDateDisplay(sub.endDate));
    const fullNumber = `${sub.countryCode}${sub.whatsapp.replace(/^0+/, '')}`;
    const url = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getStatus = (endDate: string) => {
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: lang === 'ar' ? 'منتهي' : 'Expired', class: 'badge-danger', needsRenewal: true };
    if (diff <= 2) return { label: lang === 'ar' ? 'تجديد قريباً' : 'Renew Soon', class: 'badge-warning', needsRenewal: true };
    return { label: lang === 'ar' ? 'نشط' : 'Active', class: 'badge-success', needsRenewal: false };
  };

  const calculateEndDate = (startDate: string, duration: 'monthly' | 'quarterly' | 'yearly') => {
    if (!startDate) return '';
    const date = new Date(startDate);
    if (duration === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (duration === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (duration === 'yearly') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleRenewClick = (s: any) => {
    const newStartDate = s.endDate;
    const currentDuration = s.duration || 'monthly';
    const newEndDate = calculateEndDate(newStartDate, currentDuration);
    setFormData({
      ...s,
      startDate: newStartDate,
      endDate: newEndDate,
      duration: currentDuration,
      category: s.category || SERVICE_CATEGORIES[s.service] || ''
    });
    setEditingId(s.id!);
    window.scrollTo(0, 0);
  };

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions.filter(sub => {
      const status = getStatus(sub.endDate);
      if (showOnlyRenewals && !status.needsRenewal) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return sub.name.toLowerCase().includes(q) || sub.email.toLowerCase().includes(q) || sub.whatsapp.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subscriptions, searchQuery, showOnlyRenewals, lang]);

  const analytics = useMemo(() => {
    if (!subscriptions) return { periodIncome: 0, totalInPeriod: 0, currentActive: 0, serviceDist: [], incomeDist: [] };
    const from = new Date(statsFromDate); const to = new Date(statsToDate); const today = new Date();
    const sc = {} as any; const si = {} as any;
    let pi = 0; let tip = 0; let ca = 0;
    subscriptions.forEach(sub => {
      if (new Date(sub.endDate) >= today) ca++;
      const ss = new Date(sub.startDate);
      if (ss >= from && ss <= to) {
        pi += Number(sub.payment); tip++;
        sc[sub.service] = (sc[sub.service] || 0) + 1;
        si[sub.service] = (si[sub.service] || 0) + Number(sub.payment);
      }
    });
    return {
      periodIncome: pi, totalInPeriod: tip, currentActive: ca,
      serviceDist: Object.keys(sc).map(n => ({ name: n, value: sc[n] })),
      incomeDist: Object.keys(si).map(n => ({ name: n, amount: si[n] }))
    };
  }, [subscriptions, statsFromDate, statsToDate]);

  const handleExport = () => {
    const data = subscriptions?.map(s => ({
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
      [t.workspace]: s.workspace
    }));
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
    XLSX.writeFile(wb, "Subman_Export.xlsx");
  };

  return (
    <div className={`app-layout ${theme}-theme ${!isLoggedIn || (userProfile?.status === 'pending' && userProfile?.role !== 'admin') ? 'is-login-page' : ''}`}>
      {!isLoggedIn ? (
        <div className="login-container">
          <div className="login-card">
            <h1>{t.title}</h1>
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-inputs-row">
                  <input type="email" placeholder={t.email} value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required />
                  <input type="password" placeholder={t.password} value={loginData.pass} onChange={e => setLoginData({ ...loginData, pass: e.target.value })} required />
                </div>
                <button type="submit" className="login-submit-btn">{t.enter}</button>
                <button type="button" onClick={handleGoogleLogin} className="btn-secondary" style={{ marginTop: '10px', width: '100%' }}>{t.googleLogin}</button>
                <p className="auth-switch" onClick={() => setAuthMode('register')}>{t.needAccount}</p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="login-form">
                <div className="login-inputs-row">
                  <input type="email" placeholder={t.email} value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required />
                  <input type="password" placeholder={t.password} value={loginData.pass} onChange={e => setLoginData({ ...loginData, pass: e.target.value })} required />
                </div>
                <button type="submit" className="login-submit-btn">{t.register}</button>
                <p className="auth-switch" onClick={() => setAuthMode('login')}>{t.alreadyHave}</p>
              </form>
            )}
          </div>
        </div>
      ) : userProfile?.status === 'pending' && userProfile?.role !== 'admin' ? (
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <h2>{t.pendingTitle}</h2>
            <p style={{ margin: '20px 0', lineHeight: 1.6 }}>{t.pendingMsg}</p>
            <button onClick={handleLogout} className="btn-secondary">{t.logout}</button>
          </div>
        </div>
      ) : (
        <>
          <aside className="sidebar">
            <nav>
              <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''} title={t.dashboard}>📊</button>
              <button onClick={() => setCurrentView('subscribers')} className={currentView === 'subscribers' ? 'active' : ''} title={t.subscribers}>👥</button>
              <button onClick={() => setCurrentView('notifications')} className={currentView === 'notifications' ? 'active' : ''} title={t.notifications}>
                🔔 {notifications && notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              {userProfile?.role === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('users')} className={currentView === 'users' ? 'active' : ''} title={t.access}>🔐</button>
                  <button onClick={() => setCurrentView('settings')} className={currentView === 'settings' ? 'active' : ''} title={t.settings}>⚙️</button>
                </>
              )}
            </nav>
            <button onClick={handleLogout} className="logout" title={t.logout}>🚪</button>
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
                    <h2>{t.dashboard}</h2>
                    <div className="dashboard-filters" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a0a0a0' }}>{lang === 'ar' ? 'من' : 'From'}</label>
                        <input type="date" value={statsFromDate} onChange={e => setStatsFromDate(e.target.value)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a0a0a0' }}>{lang === 'ar' ? 'إلى' : 'To'}</label>
                        <input type="date" value={statsToDate} onChange={e => setStatsToDate(e.target.value)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.9rem' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div className="chart-card" style={{ margin: 0 }}>
                        <h3>{t.serviceDist}</h3>
                        <div style={{ height: '300px' }}>
                          <ResponsiveContainer><PieChart><Pie data={analytics.serviceDist} innerRadius={60} outerRadius={80} dataKey="value">{analytics.serviceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                        </div>
                      </div>
                      <div className="chart-card" style={{ margin: 0 }}>
                        <h3>{t.incomeDist}</h3>
                        <div style={{ height: '300px' }}>
                          <ResponsiveContainer><BarChart data={analytics.incomeDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'settings' && (
                <div className="settings-view animate-fade">
                  <h2>{t.settings}</h2>
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
                  <div className="header-actions"><h2>{t.notifCenter}</h2><button onClick={() => supabase.from('notifications').delete().eq('user_id', currentUser.id)} className="btn-secondary">{t.clearAll}</button></div>
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
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{t.manageSubs}</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder={t.search}
                        className="search-input-refined"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', margin: 0, padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#000' }}
                      />
                    </div>

                    <div>
                      <label
                        className="renewal-checkbox-large"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          transition: 'all 0.2s',
                          userSelect: 'none',
                          color: '#000'
                        }}
                      >
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

                    <button onClick={handleExport} className="btn-primary" style={{ padding: '0.6rem 1.5rem', width: 'auto', borderRadius: '8px', margin: 0 }} title={t.export}>
                      📊 {t.export}
                    </button>
                  </div>

                  {successMessage && <div style={{ background: '#000', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{successMessage}</div>}

                  <div className="main-content-card">
                    <div style={{ padding: '2.5rem', borderBottom: '1px solid #f0f0f0' }}>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (editingId) { 
                          await supabase.from('subscriptions').update(formData).eq('id', editingId);
                          setSuccessMessage(t.updated); 
                        }
                        else { 
                          await supabase.from('subscriptions').insert([{ ...formData, user_id: currentUser.id, createdAt: new Date().toISOString() }]);
                          setSuccessMessage(t.saved); 
                        }
                        setFormData({ service: 'Grok', category: 'Artificial Intelligence', duration: 'monthly', name: '', email: '', facebook: '', countryCode: '20', whatsapp: '', startDate: '', endDate: '', payment: 0, workspace: '' });
                        setEditingId(null); setTimeout(() => setSuccessMessage(''), 3000);
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
                              <div style={{ display: 'flex', gap: '0.5rem', direction: 'ltr' }}>
                                <select style={{ width: '80px' }} value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} required>
                                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>+{c.code}</option>)}
                                </select>
                                <input type="text" placeholder={t.whatsapp} value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })} required />
                              </div>
                            </div>
                            <div className="input-field-group" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
                              <button type="submit" className="login-submit-btn" style={{ margin: 0, height: '50px' }}>{editingId ? t.update : t.add}</button>
                              {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setFormData({ service: 'Grok', category: 'Artificial Intelligence', duration: 'monthly', name: '', email: '', facebook: '', countryCode: '20', whatsapp: '', startDate: '', endDate: '', payment: 0, workspace: '' }); }} className="btn-secondary" style={{ margin: '0 0.5rem 0 0', height: '50px' }}>{t.cancel}</button>
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
                              <td style={{ fontWeight: 600, color: '#a0a0a0' }}>#{s.id}</td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.service}</div>
                                <div style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>{s.category || SERVICE_CATEGORIES[s.service]}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                <div style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>+{s.countryCode} {s.whatsapp}</div>
                              </td>
                              <td>
                                <span className={`badge ${getStatus(s.endDate).class}`}>{formatDateDisplay(s.endDate)}</span>
                                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#a0a0a0' }}>
                                  {s.duration === 'yearly' ? t.yearly : s.duration === 'quarterly' ? t.quarterly : t.monthly}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button onClick={() => sendWhatsApp(s)} title={t.whatsapp}>💬</button>
                                <button onClick={() => handleRenewClick(s)} title={t.renew}>🔄</button>
                                <button onClick={() => { setFormData({ ...s, category: s.category || SERVICE_CATEGORIES[s.service] || '', duration: s.duration || 'monthly' }); setEditingId(s.id!); window.scrollTo(0, 0); }} title={t.update}>✏️</button>
                                <button onClick={() => { if (window.confirm(t.confirmDelete)) supabase.from('subscriptions').delete().eq('id', s.id); }} title={t.logout}>🗑️</button>
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
                    <h2>{t.manageUsers}</h2>
                  </div>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>{t.user}</th><th>{t.status}</th><th>{t.role}</th><th>{t.actions}</th></tr></thead>
                      <tbody>{allUsers?.map(u => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>
                            <span className={`badge ${u.status === 'approved' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td><span className="badge badge-service">{u.role === 'admin' ? t.admin : t.editor}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              {u.status === 'pending' && (
                                <>
                                  <button onClick={() => supabase.from('profiles').update({ status: 'approved' }).eq('id', u.id)} className="btn-success" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.approve}</button>
                                  <button onClick={() => supabase.from('profiles').update({ status: 'rejected' }).eq('id', u.id)} className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }}>{t.reject}</button>
                                </>
                              )}
                              {u.role !== 'admin' && (
                                <button onClick={() => supabase.from('profiles').update({ role: 'admin' }).eq('id', u.id)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Make Admin</button>
                              )}
                              <button onClick={() => { if (window.confirm(t.confirmDelete)) supabase.from('profiles').delete().eq('id', u.id); }} className="btn-delete" title={t.logout}>🗑️</button>
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
