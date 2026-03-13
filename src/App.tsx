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

type View = 'login' | 'dashboard' | 'subscribers' | 'users' | 'notifications' | 'settings';

function App() {
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

  // Date Formatter: YYYY-MM-DD -> MM/DD/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  };

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
        let m = ""; let t: 'info'|'warning'|'danger' = 'info';
        if (diff < 0) { m = `انتهى اشتراك ${sub.name} (${sub.service})`; t = 'danger'; }
        else if (diff <= 2) { m = `تجديد ${sub.name} (${sub.service}) خلال ${diff} أيام`; t = 'warning'; }
        if (m) {
          const ex = await db.notifications.where('message').equals(m).and(n => new Date(n.createdAt).toDateString() === today.toDateString()).count();
          if (ex === 0) await db.notifications.add({ message: m, type: t, createdAt: today.getTime() });
        }
      }
    };
    genNotif();
  }, [subscriptions, isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check Master Admin
    if (loginData.user === 'admin' && loginData.pass === 'P@$$w0rd') {
      setIsLoggedIn(true);
      setCurrentUser({ username: 'admin', role: 'admin' });
      setCurrentView('dashboard');
      return;
    }

    // Check Database Users
    const user = await db.users.where('username').equals(loginData.user).first();
    if (user && user.password === loginData.pass) {
      setIsLoggedIn(true);
      setCurrentUser(user);
      setCurrentView('dashboard');
    } else {
      alert('خطأ في اسم المستخدم أو كلمة المرور!');
    }
  };

  const sendWhatsApp = (sub: any) => {
    let msg = waMessage.replace('{name}', sub.name).replace('{service}', sub.service).replace('{date}', formatDateDisplay(sub.endDate));
    const fullNumber = `${sub.countryCode}${sub.whatsapp.replace(/^0+/, '')}`;
    const url = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const saveSettings = async () => {
    await db.settings.put({ id: 'whatsapp_message', value: waMessage });
    setSuccessMessage('تم حفظ الإعدادات!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getStatus = (endDate: string) => {
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'منتهي', class: 'badge-danger', needsRenewal: true };
    if (diff <= 2) return { label: 'تجديد قريباً', class: 'badge-warning', needsRenewal: true };
    return { label: 'نشط', class: 'badge-success', needsRenewal: false };
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
  }, [subscriptions, searchQuery, showOnlyRenewals]);

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

  return (
    <div className="app-layout">
      {!isLoggedIn ? (
        <div className="login-container">
          <div className="login-card">
            <h1>منصة إدارة الإشتراكات</h1>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="اسم المستخدم" value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} />
              <input type="password" placeholder="كلمة المرور" value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})} required />
              <button type="submit" className="btn-primary">دخول</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <aside className="sidebar">
            <div className="logo">M</div>
            <nav>
              <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''} title="لوحة البيانات">📊</button>
              <button onClick={() => setCurrentView('subscribers')} className={currentView === 'subscribers' ? 'active' : ''} title="المشتركون">👥</button>
              <button onClick={() => setCurrentView('notifications')} className={currentView === 'notifications' ? 'active' : ''} title="التنبيهات">
                🔔 {notifications && notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              {currentUser?.role === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('users')} className={currentView === 'users' ? 'active' : ''} title="الصلاحيات">🔐</button>
                  <button onClick={() => setCurrentView('settings')} className={currentView === 'settings' ? 'active' : ''} title="الإعدادات">⚙️</button>
                </>
              )}
              <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout" title="خروج">🚪</button>
            </nav>
          </aside>

          <main className="content">
            <header className="main-header"><h1 className="platform-name">منصة إدارة الإشتراكات</h1></header>
            <div className="view-container">
              {currentView === 'dashboard' && (
                <div className="dashboard-view animate-fade">
                  <div className="header-actions">
                    <h2>لوحة التحكم</h2>
                    <div className="dashboard-filters">
                      <div className="date-input-group">
                        <label>من:</label>
                        <input type="date" value={statsFromDate} onChange={e => setStatsFromDate(e.target.value)} />
                      </div>
                      <div className="date-input-group">
                        <label>إلى:</label>
                        <input type="date" value={statsToDate} onChange={e => setStatsToDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card income"><h3>دخل الفترة</h3><p>{analytics.periodIncome} ج.م</p></div>
                    <div className="stat-card active"><h3>إجمالي النشط</h3><p>{analytics.currentActive}</p></div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card"><h3>توزيع الخدمات</h3><div style={{height:'250px'}}><ResponsiveContainer><PieChart><Pie data={analytics.serviceDist} innerRadius={60} outerRadius={80} dataKey="value">{analytics.serviceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>
                    <div className="chart-card"><h3>دخل الخدمات</h3><div style={{height:'250px'}}><ResponsiveContainer><BarChart data={analytics.incomeDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
                  </div>
                </div>
              )}

              {currentView === 'settings' && (
                <div className="settings-view animate-fade">
                  <h2>إعدادات النظام</h2>
                  <div className="form-card">
                    <h3>رسالة واتساب الافتراضية</h3>
                    <p style={{fontSize:'0.85rem', color:'#777', marginBottom:'1rem'}}>استخدم الكلمات التالية للاستبدال التلقائي: {'{name}'} للاسم، {'{service}'} للخدمة، {'{date}'} لتاريخ الانتهاء.</p>
                    <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} className="settings-textarea" rows={4} />
                    <button onClick={saveSettings} className="btn-primary" style={{marginTop:'1rem'}}>حفظ الإعدادات</button>
                  </div>
                </div>
              )}

              {currentView === 'notifications' && (
                <div className="notifications-view animate-fade">
                  <div className="header-actions"><h2>التنبيهات</h2><button onClick={() => db.notifications.clear()} className="btn-secondary">مسح الكل</button></div>
                  <div className="notifications-list">{notifications?.map(n => (<div key={n.id} className={`notification-item type-${n.type}`}><div className="notif-content"><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString('ar-EG')}</small></div><button onClick={() => db.notifications.delete(n.id!)} className="btn-close">×</button></div>))}</div>
                </div>
              )}

              {currentView === 'subscribers' && (
                <div className="subscribers-view animate-fade">
                  <div className="header-actions">
                    <h2>إدارة المشتركين</h2>
                    <div className="filter-controls">
                      <input type="text" placeholder="بحث..." className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      <label className="checkbox-filter"><input type="checkbox" checked={showOnlyRenewals} onChange={e => setShowOnlyRenewals(e.target.checked)} /><span>تجديد</span></label>
                      <button onClick={() => { if(subscriptions) { const ws = XLSX.utils.json_to_sheet(subscriptions.map(s => ({...s, startDate: formatDateDisplay(s.startDate), endDate: formatDateDisplay(s.endDate)}))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "Report.xlsx"); } }} className="btn-excel">📥</button>
                    </div>
                  </div>
                  {successMessage && <div className="success-banner">{successMessage}</div>}
                  <div className="form-card">
                     <form onSubmit={async (e) => { 
                       e.preventDefault(); 
                       if (editingId) await db.subscriptions.update(editingId, formData); 
                       else await db.subscriptions.add({...formData, createdAt: new Date().toLocaleString('ar-EG')});
                       setFormData({service:'Grok', name:'', email:'', facebook:'', countryCode: '20', whatsapp:'', startDate:'', endDate:'', payment:0, workspace:''});
                       setEditingId(null); setSuccessMessage('تم الحفظ!'); setTimeout(()=>setSuccessMessage(''), 3000);
                     }} className="admin-form">
                       <div className="form-row">
                         <select value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                         <input type="text" placeholder="الاسم" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                       </div>
                       <div className="form-row">
                         <input type="email" placeholder="البريد" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                         <div style={{display:'flex', gap:'5px'}}>
                            <select style={{width:'120px'}} value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} required>
                              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                            <input type="text" placeholder="رقم الواتساب" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})} required />
                         </div>
                       </div>
                       <div className="form-row">
                         <div className="date-input-group"><label>تاريخ البدء:</label><input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required /></div>
                         <div className="date-input-group"><label>تاريخ الانتهاء:</label><input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required /></div>
                       </div>
                       <div className="form-row">
                         <input type="number" placeholder="المبلغ" value={formData.payment} onChange={e => setFormData({...formData, payment: Number(e.target.value)})} required />
                         <input type="text" placeholder="مساحة العمل" value={formData.workspace} onChange={e => setFormData({...formData, workspace: e.target.value})} />
                       </div>
                       <button type="submit" className="btn-primary">{editingId ? 'تحديث' : 'إضافة'}</button>
                       {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({service:'Grok', name:'', email:'', facebook:'', countryCode: '20', whatsapp:'', startDate:'', endDate:'', payment:0, workspace:''}); }} className="btn-secondary">إلغاء</button>}
                     </form>
                  </div>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>ID</th><th>الخدمة</th><th>المشترك</th><th>الانتهاء</th><th>إجراءات</th></tr></thead>
                      <tbody>
                        {filteredSubscriptions.map(s => (
                          <tr key={s.id}>
                            <td>#{s.id}</td><td>{s.service}</td>
                            <td><div>{s.name}</div><small>+{s.countryCode} {s.whatsapp}</small></td>
                            <td><span className={`badge ${getStatus(s.endDate).class}`}>{formatDateDisplay(s.endDate)}</span></td>
                            <td>
                              <button onClick={() => sendWhatsApp(s)} className="btn-wa" title="إرسال واتساب">💬</button>
                              <button onClick={() => { setFormData(s); setEditingId(s.id!); window.scrollTo(0,0); }} className="btn-edit" title="تعديل">✏️</button>
                              <button onClick={() => { if(window.confirm('حذف؟')) db.subscriptions.delete(s.id!); }} className="btn-delete" title="حذف">🗑️</button>
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
                   <h2>إدارة المستخدمين والصلاحيات</h2>
                   <div className="form-card">
                      <form onSubmit={async (e) => { 
                        e.preventDefault(); 
                        try {
                          if (editingUserId) {
                            await db.users.update(editingUserId, userFormData);
                            setSuccessMessage('تم تحديث المستخدم!');
                          } else {
                            await db.users.add({...userFormData, createdAt: new Date().toLocaleString('ar-EG')});
                            setSuccessMessage('تمت الإضافة!');
                          }
                          setUserFormData({username:'', password:'', role:'editor'});
                          setEditingUserId(null);
                          setTimeout(()=>setSuccessMessage(''), 3000);
                        } catch(err) { alert('خطأ!'); }
                      }} className="admin-form">
                        <div className="form-row">
                          <input type="text" placeholder="المستخدم" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} required />
                          <input type="password" placeholder="كلمة المرور" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required />
                        </div>
                        <div className="form-row">
                          <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="editor">محرر</option><option value="admin">مدير</option></select>
                          <button type="submit" className="btn-primary">{editingUserId ? 'تحديث' : 'إضافة'}</button>
                          {editingUserId && <button type="button" onClick={() => { setEditingUserId(null); setUserFormData({username:'', password:'', role:'editor'}); }} className="btn-secondary">إلغاء</button>}
                        </div>
                      </form>
                   </div>
                   {successMessage && <div className="success-banner">{successMessage}</div>}
                   <div className="table-responsive">
                    <table className="admin-table">
                      <thead><tr><th>المستخدم</th><th>الصلاحية</th><th>إجراءات</th></tr></thead>
                      <tbody>{users?.map(u => (
                        <tr key={u.id}>
                          <td>{u.username}</td><td>{u.role === 'admin' ? 'مدير' : 'محرر'}</td>
                          <td>
                            <button onClick={() => { setUserFormData({username: u.username, password: u.password, role: u.role as 'admin' | 'editor'}); setEditingUserId(u.id!); window.scrollTo(0,0); }} className="btn-edit" title="تعديل">✏️</button>
                            <button onClick={() => { if(window.confirm('حذف؟')) db.users.delete(u.id!); }} className="btn-delete" title="حذف">🗑️</button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                   </div>
                </div>
              )}
            </div>
            <footer className="app-footer">جميع الحقوق محفوظة &copy; {new Date().getFullYear()} حسام زين</footer>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
