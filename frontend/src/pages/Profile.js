import React, { useState, useEffect } from 'react';
import { getUserStats, deleteForecast, changePassword } from '../services/api';
import { sendTestAlert } from '../services/api';

const s = {
  avatar: { width:88,height:88,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',border:'3px solid #4ade80',boxShadow:'0 0 24px rgba(74,222,128,.2)' },
  badge:  { background:'rgba(74,222,128,.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)',borderRadius:20,padding:'3px 12px',fontSize:12,fontWeight:600 },
  input:  { width:'100%',background:'#0a1520',border:'1px solid #1a3a2a',borderRadius:8,color:'#f0f4f8',padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',marginTop:6 },
  label:  { fontSize:12,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.7px',fontWeight:500 },
};

export default function Profile({ onLogout }) {
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab,setActive]   = useState('account');
  const [pwForm,   setPwForm]   = useState({ old_password:'',new_password:'',confirm:'' });
  const [pwMsg,    setPwMsg]    = useState(null);
  const [pwError,  setPwError]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    getUserStats().then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchStats(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this forecast?')) return;
    setDeleting(id);
    try { await deleteForecast(id); fetchStats(); } catch(e) { alert('Failed'); }
    setDeleting(null);
  };

  const handleChangePw = async (e) => {
    e.preventDefault(); setPwMsg(null); setPwError(null);
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    try {
      const r = await changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password });
      setPwMsg(r.data.message);
      setPwForm({ old_password:'',new_password:'',confirm:'' });
    } catch(e) { setPwError(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"/>Loading profile...</div>;

  const tabs = [
    { key:'account',  icon:'👤', label:'Account'  },
    { key:'saved',    icon:'💾', label:'Saved'    },
    { key:'stats',    icon:'📊', label:'Stats'    },
    { key:'activity', icon:'🕐', label:'Activity' },
    { key:'password', icon:'🔑', label:'Security' },
  ];

  const uniqueCountries = [...new Set(stats?.all_forecasts?.map(f => f.country) || [])];
  const uniqueModels    = [...new Set(stats?.all_forecasts?.map(f => f.model)   || [])];

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div className="page-title">👤 My Profile</div>
      <div className="page-subtitle">Manage your EnerCast account and forecasts</div>

      {/* Profile Header Card */}
      <div className="card" style={{ display:'flex', alignItems:'center', gap:24, marginBottom:20 }}>
        <div style={s.avatar}>👤</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'1.4rem', fontWeight:700, color:'#f0f4f8', marginBottom:4 }}>
            {stats?.username}
          </div>
          <div style={{ color:'#9ca3af', fontSize:14, marginBottom:10 }}>📧 {stats?.email}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={s.badge}>⚡ {stats?.total_saved} Forecasts</span>
            <span style={{ ...s.badge, color:'#60a5fa', background:'rgba(96,165,250,.1)', border:'1px solid rgba(96,165,250,.2)' }}>
              🌍 {uniqueCountries.length} Countries
            </span>
            <span style={{ ...s.badge, color:'#a78bfa', background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.2)' }}>
              🤖 {uniqueModels.length} Models used
            </span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:'transparent', border:'1px solid #ef4444', color:'#ef4444', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:14, fontFamily:'inherit', transition:'all .2s' }}
          onMouseEnter={e=>e.target.style.background='rgba(239,68,68,.1)'}
          onMouseLeave={e=>e.target.style.background='transparent'}>
          🚪 Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab===t.key?'active':''}`} onClick={() => setActive(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && stats && (
        <div className="fade-in">
          <div className="metric-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
            <div className="metric-card">
              <div className="metric-value" style={{ color:'#4ade80' }}>{stats.total_saved}</div>
              <div className="metric-label">Saved Forecasts</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color:'#60a5fa', fontSize:'1rem' }}>{stats.fav_country || 'N/A'}</div>
              <div className="metric-label">Favourite Country</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color:'#fbbf24', fontSize:'.85rem' }}>
                {stats.fav_metric?.replace(/_/g,' ') || 'N/A'}
              </div>
              <div className="metric-label">Top Metric</div>
            </div>
          </div>

          <div className="section-header">🌍 Countries Analysed</div>
          <div className="card">
            {uniqueCountries.length > 0
              ? <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {uniqueCountries.map(c => (
                    <span key={c} style={{ background:'#0f2a1a', color:'#4ade80', border:'1px solid rgba(74,222,128,.2)', borderRadius:20, padding:'4px 14px', fontSize:13 }}>🌍 {c}</span>
                  ))}
                </div>
              : <div style={{ color:'#6b7280', textAlign:'center', padding:20 }}>No forecasts yet — run one from the Dashboard!</div>
            }
          </div>

          <div className="section-header">🤖 Models Used</div>
          <div className="card">
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {uniqueModels.map(m => (
                <span key={m} style={{ background:'rgba(167,139,250,.1)', color:'#a78bfa', border:'1px solid rgba(167,139,250,.2)', borderRadius:20, padding:'4px 14px', fontSize:13 }}>🤖 {m}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === 'saved' && stats && (
        <div className="fade-in card">
          <h3 style={{ color:'#4ade80', marginBottom:16 }}>💾 Saved Forecasts ({stats.all_forecasts?.length || 0})</h3>
          {stats.all_forecasts?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Country</th><th>Metric</th><th>Model</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {stats.all_forecasts.map((f,i) => (
                  <tr key={f.id}>
                    <td style={{ color:'#6b7280' }}>{i+1}</td>
                    <td style={{ fontWeight:500 }}>🌍 {f.country}</td>
                    <td style={{ fontSize:12, color:'#9ca3af' }}>{f.metric?.replace(/_/g,' ')}</td>
                    <td><span style={{ background:'rgba(74,222,128,.1)', color:'#4ade80', borderRadius:6, padding:'2px 8px', fontSize:12 }}>{f.model}</span></td>
                    <td style={{ color:'#6b7280', fontSize:12 }}>{f.date}</td>
                    <td>
                      <button onClick={() => handleDelete(f.id)} disabled={deleting===f.id}
                        style={{ background:'rgba(239,68,68,.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                        {deleting===f.id ? '...' : '🗑️ Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color:'#6b7280', textAlign:'center', padding:40 }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>💾</div>
              No saved forecasts yet!
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="fade-in">
          <div className="metric-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
            <div className="metric-card"><div className="metric-value" style={{ color:'#4ade80' }}>{stats.total_saved}</div><div className="metric-label">Total Saved</div></div>
            <div className="metric-card"><div className="metric-value" style={{ color:'#60a5fa' }}>{uniqueCountries.length}</div><div className="metric-label">Countries</div></div>
            <div className="metric-card"><div className="metric-value" style={{ color:'#a78bfa' }}>{uniqueModels.length}</div><div className="metric-label">Models Used</div></div>
            <div className="metric-card"><div className="metric-value" style={{ color:'#fbbf24' }}>{stats.recent?.length || 0}</div><div className="metric-label">Recent</div></div>
          </div>

          <div className="section-header">📊 Forecast Breakdown by Model</div>
          <div className="card">
            {uniqueModels.map(m => {
              const count = stats.all_forecasts?.filter(f => f.model===m).length || 0;
              const pct   = stats.total_saved > 0 ? (count/stats.total_saved*100).toFixed(0) : 0;
              return (
                <div key={m} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                    <span style={{ color:'#e5e7eb' }}>🤖 {m}</span>
                    <span style={{ color:'#9ca3af' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ background:'#0a1520', borderRadius:4, height:6, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#4ade80,#60a5fa)', borderRadius:4, transition:'width .8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && stats && (
        <div className="fade-in card">
          <h3 style={{ color:'#4ade80', marginBottom:16 }}>🕐 Recent Activity</h3>
          {stats.recent?.length > 0
            ? stats.recent.map((f,i) => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid #1a3a2a' }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(74,222,128,.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#4ade80',fontWeight:700,fontSize:14 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:'#f0f4f8', fontWeight:500 }}>🌍 {f.country}</div>
                    <div style={{ color:'#6b7280', fontSize:12 }}>{f.metric?.replace(/_/g,' ')} · <span style={{ color:'#4ade80' }}>{f.model}</span></div>
                  </div>
                  <div style={{ color:'#6b7280', fontSize:12 }}>{f.date}</div>
                </div>
              ))
            : <div style={{ color:'#6b7280', textAlign:'center', padding:40 }}>
                <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🕐</div>
                No activity yet!
              </div>
          }
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'password' && (
        <div className="fade-in card">
          <h3 style={{ color:'#4ade80', marginBottom:20 }}>🔑 Change Password</h3>
          {pwMsg   && <div className="green-box" style={{ marginBottom:16 }}>✅ {pwMsg}</div>}
          {pwError && <div className="error-box" style={{ marginBottom:16 }}>❌ {pwError}</div>}
          <div style={{ maxWidth:420 }}>
            {[['old_password','Current Password'],['new_password','New Password'],['confirm','Confirm Password']].map(([key,label]) => (
              <div key={key} style={{ marginBottom:16 }}>
                <label style={s.label}>{label}</label>
                <input type="password" style={s.input} value={pwForm[key]}
                  onChange={e => setPwForm({ ...pwForm, [key]:e.target.value })}
                  placeholder={label} />
              </div>
            ))}
            <button className="btn btn-primary" onClick={handleChangePw} style={{ marginTop:8 }}>
              🔑 Update Password
            </button>
            <button className="btn btn-secondary" style={{ marginTop:8, marginLeft:8 }} onClick={() => sendTestAlert().then(() => alert('✅ Test email sent!')).catch(() => alert('Failed'))}>
              📧 Test Email Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
