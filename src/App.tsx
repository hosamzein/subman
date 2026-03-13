import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import * as XLSX from 'xlsx';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import './App.css';

const SERVICES = ['Grok', 'ChatGPT', 'Perplexity'];
const COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6'];
const COUNTRY_CODES = [
  { code: '20', label: 'مصر (+20)' },
  { code: '966', label: 'السعودية (+966)' },
  { code: '971', label: 'الإمارات (+971)' },
  { code: '965', label: 'الكويت (+965)' },
  { code: '964', label: 'العراق (+964)' },
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
    lang: "اللغة"
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
    newSubs: "New Subscription",
    activeNow: "Accounts active now",
    serviceDist: "Service Distribution",
    incomeDist: "Service Income",
    notifCenter: "Notification Center",
    clearAll: "Clear All",
    noNotifs: "No new notifications",
    manageSubs: "Manage Subscribers",
    search: "Quick search...",
    renewalOnly: "Renew only",
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
    manageUsers: "Access & User Management",
    user: "User",
    role: "Role",
    admin: "Admin",
    editor: "Editor",
    id: "ID",
    service: "Service",
    cancel: "Cancel",
    rights: "All rights reserved",
    owner: "Hossam Zein",
    confirmDelete: "Confirm delete?",
    userExists: "User already exists!",
    saved: "Saved successfully!",
    updated: "Updated successfully!",
    waTemplate: "Default WhatsApp Message",
    waHelp: "Use tags: {name} for Name, {service} for Service, {date} for End Date.",
    export: "Export Data",
    theme: "Theme",
    lang: "Language"
  }
};

type View = 'login' | 'dashboard' | 'subscribers' | 'users' | 'notifications' | 'settings';

function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(localStorage.getItem('subman_lang') as 'ar' | 'en' || 'ar');
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('subman_theme') as 'dark' | 'light' || 'dark');
  const [currentView, setCurrentView] = useState<View>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray());
  const waSetting = useLiveQuery(() => db.settings.get('whatsapp_message'));

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyRenewals, setShowOnlyRenewals] = useState(false);

  const [statsFromDate, setStatsFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [statsToDate, setStatsToDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    service: 'Grok', name: '', email: '', facebook: '', countryCode: '20', whatsapp: '',
    startDate: '', endDate: '', payment: 0, workspace: ''
  });
  const [userFormData, setUserFormData] = useState({ username: '', password: '', role: 'editor' as 'admin' | 'editor' });
  const [waMessage, setWaMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    if (waSetting) setWaMessage(waSetting.value);
    else setWaMessage("مرحباً {name}، نود تذكيرك بأن اشتراك {service} سينتهي بتاريخ {date}.");
  }, [waSetting]);

  useEffect(() => {
    if (!subscriptions || !isLoggedIn) return;
    const genNotif = async () => {
      const today = new Date();
      await db.notifications.where('createdAt').below(today.getTime() - (7*24*60*60*1000)).delete();
      for (const sub of subscriptions) {
        const end = new Date(sub.endDate);
        const diff = Math.ceil((end.getTime() - today.getTime()) / (1000*60*60*24));
        let m = ""; let type: 'info'|'warning'|'danger' = 'info';
        if (diff < 0) { m = `انتهى اشتراك ${sub.name} (${sub.service})`; type = 'danger'; }
        else if (diff <= 2) { m = `تجديد ${sub.name} (${sub.service}) خلال ${diff} أيام`; type = 'warning'; }
        if (m) {
          const ex = await db.notifications.where('message').equals(m).and(n => new Date(n.createdAt).toDateString() === today.toDateString()).count();
          if (ex === 0) await db.notifications.add({ message: m, type, createdAt: today.getTime() });
        }
      }
    };
    genNotif();
  }, [subscriptions, isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.user === 'admin' && loginData.pass === 'P@$$w0rd') {
      setIsLoggedIn(true); setCurrentUser({ username: 'admin', role: 'admin' }); setCurrentView('dashboard');
      return;
    }
    const user = await db.users.where('username').equals(loginData.user).first();
    if (user && user.password === loginData.pass) {
      setIsLoggedIn(true); setCurrentUser(user); setCurrentView('dashboard');
    } else alert('Error!');
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
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
      [t.name]: s.name,
      [t.email]: s.email,
      [t.whatsapp]: `+${s.countryCode}${s.whatsapp}`,
      [t.startDate]: formatDateDisplay(s.startDate),
      [t.endDate]: formatDateDisplay(s.endDate),
      [t.amount]: s.payment,
      [t.workspace]: s.workspace
    }));
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
    XLSX.writeFile(wb, "Subman_Export.xlsx");
  };

  return (
    <div className={`app-layout ${theme}-theme`}>
      {!isLoggedIn ? (
        <div className="login-container">
          <div className="login-card">
            <h1>{t.title}</h1>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder={t.username} value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} required />
              <input type="password" placeholder={t.password} value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})} required />
              <button type="submit" className="btn-primary">{t.enter}</button>
            </form>
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
              {currentUser?.role === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('users')} className={currentView === 'users' ? 'active' : ''} title={t.access}>🔐</button>
                  <button onClick={() => setCurrentView('settings')} className={currentView === 'settings' ? 'active' : ''} title={t.settings}>⚙️</button>
                </>
              )}
            </nav>
            <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout" title={t.logout}>🚪</button>
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
                  <div className="header-actions">
                    <h2>{t.dashboard}</h2>
                    <div className="dashboard-filters">
                      <div className="date-input-group">
                        <label>{lang === 'ar' ? 'من' : 'From'}:</label>
                        <input type="date" value={statsFromDate} onChange={e => setStatsFromDate(e.target.value)} />
                      </div>
                      <div className="date-input-group">
                        <label>{lang === 'ar' ? 'إلى' : 'To'}:</label>
                        <input type="date" value={statsToDate} onChange={e => setStatsToDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card income">
                      <h3>{t.periodIncome}</h3>
                      <p>{analytics.periodIncome} {lang === 'ar' ? 'ج.م' : 'EGP'}</p>
                      <small>{analytics.totalInPeriod} {t.newSubs}</small>
                    </div>
                    <div className="stat-card active">
                      <h3>{t.totalActive}</h3>
                      <p>{analytics.currentActive}</p>
                      <small>{t.activeNow}</small>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h3>{t.serviceDist}</h3>
                      <div style={{height:'250px'}}>
                        <ResponsiveContainer><PieChart><Pie data={analytics.serviceDist} innerRadius={60} outerRadius={80} dataKey="value">{analytics.serviceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                      </div>
                    </div>
                    <div className="chart-card">
                      <h3>{t.incomeDist}</h3>
                      <div style={{height:'250px'}}>
                        <ResponsiveContainer><BarChart data={analytics.incomeDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
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
                    <button onClick={async () => { await db.settings.put({id:'whatsapp_message', value:waMessage}); setSuccessMessage(t.saved); setTimeout(()=>setSuccessMessage(''),3000); }} className="btn-primary" style={{marginTop:'1rem'}}>{t.save}</button>
                  </div>
                  {successMessage && <div className="success-banner">{successMessage}</div>}
                </div>
              )}

              {currentView === 'notifications' && (
                <div className="notifications-view animate-fade">
                  <div className="header-actions"><h2>{t.notifCenter}</h2><button onClick={() => db.notifications.clear()} className="btn-secondary">{t.clearAll}</button></div>
                  <div className="notifications-list">
                    {!notifications || notifications.length === 0 ? <p className="empty-msg">{t.noNotifs}</p> : 
                      notifications.map(n => (<div key={n.id} className={`notification-item type-${n.type}`}><div className="notif-content"><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</small></div><button onClick={() => db.notifications.delete(n.id!)} className="btn-close">×</button></div>))
                    }
                  </div>
                </div>
              )}

              {currentView === 'subscribers' && (
                <div className="subscribers-view animate-fade">
                  <div className="header-actions" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{t.manageSubs}</h2>
                    <button onClick={handleExport} className="btn-export-main" title={t.export}>
                      📊 {t.export}
                    </button>
                  </div>

                  {/* Elegant Search and Filter Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    
                    {/* Search Field */}
                    <div style={{ width: '100%' }}>
                      <input 
                        type="text" 
                        placeholder={t.search} 
                        className="search-input-refined" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        style={{ width: '100%', margin: 0 }}
                      />
                    </div>

                    {/* Filters Row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <label 
                        className="renewal-checkbox-large" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          cursor: 'pointer', 
                          padding: '0.6rem 1.2rem', 
                          borderRadius: '8px', 
                          background: 'var(--bg-card)', 
                          border: '1px solid var(--border-color)', 
                          transition: 'all 0.2s',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>📥</span>
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>{t.renewalOnly}</span>
                        <input 
                          type="checkbox" 
                          checked={showOnlyRenewals} 
                          onChange={e => setShowOnlyRenewals(e.target.checked)} 
                          style={{ margin: 0, width: '18px', height: '18px', cursor: 'pointer', marginRight: '0.5rem' }}
                        />
                      </label>
                    </div>

                  </div>

                  {successMessage && <div className="success-banner">{successMessage}</div>}
                  
                  <div className="form-card">
                     <form onSubmit={async (e) => { 
                       e.preventDefault(); 
                       if (editingId) { await db.subscriptions.update(editingId, formData); setSuccessMessage(t.updated); }
                       else { await db.subscriptions.add({...formData, createdAt: new Date().toLocaleString()}); setSuccessMessage(t.saved); }
                       setFormData({service:'Grok', name:'', email:'', facebook:'', countryCode: '20', whatsapp:'', startDate:'', endDate:'', payment:0, workspace:''});
                       setEditingId(null); setTimeout(()=>setSuccessMessage(''), 3000);
                     }} className="admin-form">
                       <div className="form-row">
                         <select value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                         <input type="text" placeholder={t.name} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                       </div>
                       <div className="form-row">
                         <input type="email" placeholder={t.email} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                         <div style={{display:'flex', gap:'5px', direction:'ltr'}}>
                            <select style={{width:'100px'}} value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} required>
                              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>+{c.code}</option>)}
                            </select>
                            <input type="text" placeholder={t.whatsapp} value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})} required />
                         </div>
                       </div>
                       <div className="form-row">
                         <div className="date-input-group"><label>{t.startDate}:</label><input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required /></div>
                         <div className="date-input-group"><label>{t.endDate}:</label><input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required /></div>
                       </div>
                       <div className="form-row">
                         <input type="number" placeholder={t.amount} value={formData.payment} onChange={e => setFormData({...formData, payment: Number(e.target.value)})} required />
                         <input type="text" placeholder={t.workspace} value={formData.workspace} onChange={e => setFormData({...formData, workspace: e.target.value})} />
                       </div>
                       <button type="submit" className="btn-primary">{editingId ? t.update : t.add}</button>
                       {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({service:'Grok', name:'', email:'', facebook:'', countryCode: '20', whatsapp:'', startDate:'', endDate:'', payment:0, workspace:''}); }} className="btn-secondary">{t.cancel}</button>}
                     </form>
                  </div>
                  
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>{t.id}</th><th>{t.service}</th><th>{t.name}</th><th>{t.endDate}</th><th>{t.actions}</th></tr></thead>
                      <tbody>
                        {filteredSubscriptions.map(s => (
                          <tr key={s.id}>
                            <td>#{s.id}</td><td><span className="badge badge-service">{s.service}</span></td>
                            <td><div>{s.name}</div><small>+{s.countryCode} {s.whatsapp}</small></td>
                            <td><span className={`badge ${getStatus(s.endDate).class}`}>{formatDateDisplay(s.endDate)}</span></td>
                            <td>
                              <button onClick={() => sendWhatsApp(s)} className="btn-wa" title={t.whatsapp}>💬</button>
                              <button onClick={() => { setFormData(s); setEditingId(s.id!); window.scrollTo(0,0); }} className="btn-edit" title={t.update}>✏️</button>
                              <button onClick={() => { if(window.confirm(t.confirmDelete)) db.subscriptions.delete(s.id!); }} className="btn-delete" title={t.logout}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {currentView === 'users' && (
                <div className="users-view animate-fade">
                   <h2>{t.manageUsers}</h2>
                   <div className="form-card">
                      <form onSubmit={async (e) => { 
                        e.preventDefault(); 
                        try {
                          if (editingUserId) { await db.users.update(editingUserId, userFormData); setSuccessMessage(t.updated); } 
                          else { await db.users.add({...userFormData, createdAt: new Date().toLocaleString()}); setSuccessMessage(t.saved); }
                          setUserFormData({username:'', password:'', role:'editor'}); setEditingUserId(null); setTimeout(()=>setSuccessMessage(''), 3000);
                        } catch(err) { alert(t.userExists); }
                      }} className="admin-form">
                        <div className="form-row">
                          <input type="text" placeholder={t.username} value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} required />
                          <input type="password" placeholder={t.password} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required />
                        </div>
                        <div className="form-row">
                          <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="editor">{t.editor}</option><option value="admin">{t.admin}</option></select>
                          <button type="submit" className="btn-primary">{editingUserId ? t.update : t.add}</button>
                          {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserFormData({username:'', password:'', role:'editor'}); }} className="btn-secondary">{t.cancel}</button>}
                        </div>
                      </form>
                   </div>
                   {successMessage && <div className="success-banner">{successMessage}</div>}
                   <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>{t.user}</th><th>{t.role}</th><th>{t.actions}</th></tr></thead>
                      <tbody>{users?.map(u => (
                        <tr key={u.id}>
                          <td>{u.username}</td><td><span className="badge badge-service">{u.role === 'admin' ? t.admin : t.editor}</span></td>
                          <td>
                            <button onClick={() => { setUserFormData({username: u.username, password: u.password, role: u.role as 'admin' | 'editor'}); setEditingUserId(u.id!); window.scrollTo(0,0); }} className="btn-edit" title={t.update}>✏️</button>
                            <button onClick={() => { if(window.confirm(t.confirmDelete)) db.users.delete(u.id!); }} className="btn-delete" title={t.logout}>🗑️</button>
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
