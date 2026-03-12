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

type View = 'login' | 'dashboard' | 'subscribers' | 'users' | 'notifications';

function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyRenewals, setShowOnlyRenewals] = useState(false);

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const [statsFromDate, setStatsFromDate] = useState(firstDay);
  const [statsToDate, setStatsToDate] = useState(lastDay);

  const [formData, setFormData] = useState({
    service: 'Grok', name: '', email: '', facebook: '', whatsapp: '',
    startDate: '', endDate: '', payment: 0, workspace: ''
  });
  const [userFormData, setUserFormData] = useState({ username: '', password: '', role: 'editor' as const });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!subscriptions || !isLoggedIn) return;
    const generateNotifications = async () => {
      const today = new Date();
      const sevenDaysAgo = today.getTime() - (7 * 24 * 60 * 60 * 1000);
      await db.notifications.where('createdAt').below(sevenDaysAgo).delete();
      for (const sub of subscriptions) {
        const end = new Date(sub.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let msg = ""; let type: 'info' | 'warning' | 'danger' = 'info';
        if (diffDays < 0) { msg = `انتهى اشتراك ${sub.name} في خدمة ${sub.service}`; type = 'danger'; }
        else if (diffDays <= 2) { msg = `اقترب موعد تجديد ${sub.name} في خدمة ${sub.service} (بقي ${diffDays} أيام)`; type = 'warning'; }
        if (msg) {
          const exists = await db.notifications.where('message').equals(msg).and(n => new Date(n.createdAt).toDateString() === today.toDateString()).count();
          if (exists === 0) await db.notifications.add({ message: msg, type, createdAt: today.getTime() });
        }
      }
    };
    generateNotifications();
  }, [subscriptions, isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.user === 'admin' && loginData.pass === 'P@$$w0rd') { setIsLoggedIn(true); setCurrentView('dashboard'); }
    else { alert('خطأ في البيانات!'); }
  };

  const getStatus = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'منتهي', class: 'badge-danger', needsRenewal: true };
    if (diffDays <= 2) return { label: 'تجديد قريباً', class: 'badge-warning', needsRenewal: true };
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
    const serviceCounts: Record<string, number> = {}; const serviceIncome: Record<string, number> = {};
    let periodIncome = 0; let totalInPeriod = 0; let currentActive = 0;
    subscriptions.forEach(sub => {
      const subStart = new Date(sub.startDate); const subEnd = new Date(sub.endDate);
      if (subEnd >= today) currentActive++;
      if (subStart >= from && subStart <= to) {
        periodIncome += Number(sub.payment); totalInPeriod++;
        serviceCounts[sub.service] = (serviceCounts[sub.service] || 0) + 1;
        serviceIncome[sub.service] = (serviceIncome[sub.service] || 0) + Number(sub.payment);
      }
    });
    return { 
      periodIncome, totalInPeriod, currentActive, 
      serviceDist: Object.keys(serviceCounts).map(name => ({ name, value: serviceCounts[name] })),
      incomeDist: Object.keys(serviceIncome).map(name => ({ name, amount: serviceIncome[name] }))
    };
  }, [subscriptions, statsFromDate, statsToDate]);

  const handleSubmitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) { await db.subscriptions.update(editingId, formData); setSuccessMessage('تم تحديث البيانات!'); }
    else { await db.subscriptions.add({ ...formData, createdAt: new Date().toLocaleString('ar-EG') }); setSuccessMessage('تمت الإضافة!'); }
    setFormData({ service: 'Grok', name: '', email: '', facebook: '', whatsapp: '', startDate: '', endDate: '', payment: 0, workspace: '' });
    setEditingId(null); setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.users.add({ ...userFormData, createdAt: new Date().toLocaleString('ar-EG') });
      setUserFormData({ username: '', password: '', role: 'editor' });
      setSuccessMessage('تمت إضافة المستخدم بنجاح!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('اسم المستخدم موجود بالفعل!');
    }
  };

  const exportToExcel = () => {
    if (!subscriptions) return;
    const ws = XLSX.utils.json_to_sheet(subscriptions.map(s => ({
        'ID': s.id,
        'الخدمة': s.service,
        'الاسم': s.name,
        'البريد': s.email,
        'واتساب': s.whatsapp,
        'تاريخ البدء': s.startDate,
        'تاريخ الانتهاء': s.endDate,
        'المبلغ': s.payment,
        'مساحة العمل': s.workspace,
        'تاريخ الإضافة': s.createdAt
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الاشتراكات");
    XLSX.writeFile(wb, `تقرير_سوبمان_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>منصة إدارة الإشتراكات</h1>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="اسم المستخدم" value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} />
            <input type="password" placeholder="كلمة المرور" value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})} />
            <button type="submit" className="btn-primary">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">M</div>
        <nav>
          <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''} title="لوحة البيانات">📊</button>
          <button onClick={() => setCurrentView('subscribers')} className={currentView === 'subscribers' ? 'active' : ''} title="المشتركون">👥</button>
          <button onClick={() => setCurrentView('notifications')} className={currentView === 'notifications' ? 'active' : ''} title="التنبيهات">
            🔔 {notifications && notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
          </button>
          <button onClick={() => setCurrentView('users')} className={currentView === 'users' ? 'active' : ''} title="إدارة الصلاحيات">🔐</button>
          <button onClick={() => setIsLoggedIn(false)} className="logout" title="خروج">🚪</button>
        </nav>
      </aside>

      <main className="content">
        <header className="main-header">
           <h1 className="platform-name">منصة إدارة الإشتراكات</h1>
        </header>

        <div className="view-container">
          {currentView === 'dashboard' && (
            <div className="dashboard-view animate-fade">
              <div className="header-actions">
                <h2>لوحة التحكم والتحليلات</h2>
                <div className="dashboard-filters">
                  <input type="date" value={statsFromDate} onChange={e => setStatsFromDate(e.target.value)} />
                  <span style={{margin:'0 10px'}}>إلى</span>
                  <input type="date" value={statsToDate} onChange={e => setStatsToDate(e.target.value)} />
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card income"><h3>دخل الفترة</h3><p>{analytics.periodIncome} ج.م</p><small>{analytics.totalInPeriod} اشتراك جديد</small></div>
                <div className="stat-card active"><h3>إجمالي النشط</h3><p>{analytics.currentActive}</p><small>حسابات مفعلة الآن</small></div>
              </div>
              <div className="charts-grid">
                <div className="chart-card">
                  <h3>توزيع الخدمات</h3>
                  <div style={{width:'100%', height:'250px'}}>
                    <ResponsiveContainer><PieChart><Pie data={analytics.serviceDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={true}>{analytics.serviceDist.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-card">
                  <h3>دخل الخدمات (ج.م)</h3>
                  <div style={{width:'100%', height:'250px'}}>
                    <ResponsiveContainer><BarChart data={analytics.incomeDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'notifications' && (
            <div className="notifications-view animate-fade">
              <div className="header-actions">
                <h2>مركز التنبيهات</h2>
                <button onClick={() => db.notifications.clear()} className="btn-secondary">مسح الكل</button>
              </div>
              <div className="notifications-list">
                {!notifications || notifications.length === 0 ? (
                  <p className="empty-msg">لا توجد تنبيهات جديدة.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item type-${n.type}`}>
                      <div className="notif-content"><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString('ar-EG')}</small></div>
                      <button onClick={() => db.notifications.delete(n.id!)} className="btn-close">×</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentView === 'subscribers' && (
            <div className="subscribers-view animate-fade">
              <div className="header-actions">
                <h2>إدارة المشتركين</h2>
                <div className="filter-controls">
                  <input type="text" placeholder="بحث سريع..." className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <label className="checkbox-filter"><input type="checkbox" checked={showOnlyRenewals} onChange={e => setShowOnlyRenewals(e.target.checked)} /><span>تجديد فقط</span></label>
                  <button onClick={exportToExcel} className="btn-excel" title="تصدير إكسل">📥</button>
                </div>
              </div>
              {successMessage && <div className="success-banner">{successMessage}</div>}
              <div className="form-card">
                 <form onSubmit={handleSubmitSub} className="admin-form">
                   <div className="form-row">
                     <select value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                     <input type="text" placeholder="الاسم" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                   </div>
                   <div className="form-row">
                     <input type="email" placeholder="البريد" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                     <input type="text" placeholder="واتساب" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                   </div>
                   <div className="form-row">
                     <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
                     <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
                   </div>
                   <div className="form-row">
                     <input type="number" placeholder="المبلغ" value={formData.payment} onChange={e => setFormData({...formData, payment: Number(e.target.value)})} required />
                     <input type="text" placeholder="مساحة العمل" value={formData.workspace} onChange={e => setFormData({...formData, workspace: e.target.value})} />
                   </div>
                   <button type="submit" className="btn-primary">{editingId ? 'تحديث' : 'إضافة'}</button>
                 </form>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>الخدمة</th><th>الاسم والبيانات</th><th>الانتهاء</th><th>المبلغ</th><th>أدوات</th></tr></thead>
                  <tbody>
                    {filteredSubscriptions.map(s => {
                      const status = getStatus(s.endDate);
                      return (
                        <tr key={s.id}>
                          <td>#{s.id}</td><td><span className="badge badge-service">{s.service}</span></td>
                          <td><div>{s.name}</div><small>{s.email} | {s.whatsapp}</small></td>
                          <td><span className={`badge ${status.class}`}>{s.endDate}</span></td><td>{s.payment} ج.م</td>
                          <td>
                            <button onClick={() => { setFormData(s); setEditingId(s.id!); window.scrollTo(0,0); }} className="btn-edit">✏️</button>
                            <button onClick={() => { if(window.confirm('حذف؟')) db.subscriptions.delete(s.id!); }} className="btn-delete">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'users' && (
            <div className="users-view animate-fade">
               <h2>إدارة المستخدمين والصلاحيات</h2>
               <div className="form-card">
                  <form onSubmit={handleAddUser} className="admin-form">
                    <div className="form-row">
                      <input type="text" placeholder="اسم المستخدم" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} required />
                      <input type="password" placeholder="كلمة المرور" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required />
                    </div>
                    <div className="form-row">
                      <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}>
                        <option value="editor">محرر (عرض وتعديل)</option>
                        <option value="admin">مدير (تحكم كامل)</option>
                      </select>
                      <button type="submit" className="btn-primary">إضافة مستخدم</button>
                    </div>
                  </form>
               </div>
               <div className="table-responsive">
                <table className="admin-table">
                  <thead><tr><th>المستخدم</th><th>الصلاحية</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {users?.map(u => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td><span className="badge badge-service">{u.role === 'admin' ? 'مدير' : 'محرر'}</span></td>
                        <td>{u.createdAt}</td>
                        <td>
                          <button onClick={() => { if(window.confirm('حذف المستخدم؟')) db.users.delete(u.id!); }} className="btn-delete">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
          )}
        </div>
        <footer className="app-footer">
          جميع الحقوق محفوظة &copy; {new Date().getFullYear()} حسام زين
        </footer>
      </main>
    </div>
  );
}

export default App;
