import React, { useState, useEffect } from 'react';
import API from '../services/api';

export default function Admin({ token }) {
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('overview');
  const [deleting, setDeleting] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    API.get('/admin/stats')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.error || 'Access denied'); setLoading(false); });
  };

  useEffect(() => { if (token) fetchStats(); }, [token]);

  const handleDelete = async (uid, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    setDeleting(uid);
    try { await API.delete(`/admin/delete-user/${uid}`); fetchStats(); }
    catch(e) { alert('Failed'); }
    setDeleting(null);
  };

  if (!token) return <div className="loading">Please login as admin.</div>;
  if (loading) return <div className="loading"><div className="spinner"/>Loading...</div>;
  if (error)   return <div className="error-box" style={{margin:40}}>❌ {error}</div>;

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>
      <div className="page-title">🛡️ Admin Dashboard</div>
      <div className="page-subtitle">System overview and user management</div>

      <div className="metric-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        {[['Total Users','#4ade80',stats.total_users],['Total Forecasts','#60a5fa',stats.total_forecasts],
          ['Countries','#a78bfa',stats.top_countries?.length],['Models','#fbbf24',stats.top_models?.length]
        ].map(([label,color,val]) => (
          <div key={label} className="metric-card">
            <div className="metric-value" style={{color}}>{val}</div>
            <div className="metric-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{marginBottom:20}}>
        {[['overview','📊 Overview'],['users','👥 Users'],['activity','📈 Activity']].map(([k,l]) => (
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="two-col fade-in">
          <div>
            <div className="section-header">🏆 Top Countries</div>
            <div className="card">
              {stats.top_countries?.map(([country,count],i) => (
                <div key={country} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <span style={{color:'#6b7280',width:24,fontSize:13}}>#{i+1}</span>
                  <span style={{flex:1,color:'#f0f4f8',fontSize:14}}>🌍 {country}</span>
                  <div style={{background:'#0a1520',borderRadius:4,height:6,width:100,overflow:'hidden'}}>
                    <div style={{width:`${(count/stats.top_countries[0][1]*100).toFixed(0)}%`,height:'100%',background:'linear-gradient(90deg,#4ade80,#60a5fa)',borderRadius:4}}/>
                  </div>
                  <span style={{color:'#9ca3af',fontSize:12,width:24,textAlign:'right'}}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="section-header">🤖 Model Usage</div>
            <div className="card">
              {stats.top_models?.map(([model,count]) => (
                <div key={model} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <span style={{flex:1,color:'#f0f4f8',fontSize:14}}>🤖 {model}</span>
                  <div style={{background:'#0a1520',borderRadius:4,height:6,width:100,overflow:'hidden'}}>
                    <div style={{width:`${(count/stats.total_forecasts*100).toFixed(0)}%`,height:'100%',background:'linear-gradient(90deg,#a78bfa,#60a5fa)',borderRadius:4}}/>
                  </div>
                  <span style={{color:'#9ca3af',fontSize:12,width:24,textAlign:'right'}}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="fade-in card">
          <h3 style={{color:'#4ade80',marginBottom:16}}>👥 All Users ({stats.users?.length})</h3>
          <table className="data-table">
            <thead><tr><th>#</th><th>Username</th><th>Email</th><th>Forecasts</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>
              {stats.users?.map((u,i) => (
                <tr key={u.id}>
                  <td style={{color:'#6b7280'}}>{i+1}</td>
                  <td style={{fontWeight:500}}>👤 {u.username}</td>
                  <td style={{color:'#9ca3af',fontSize:12}}>{u.email}</td>
                  <td><span style={{background:'rgba(74,222,128,.1)',color:'#4ade80',borderRadius:6,padding:'2px 8px',fontSize:12}}>{u.forecasts}</span></td>
                  <td><span style={{background:u.username==='keerthy'?'rgba(167,139,250,.1)':'rgba(96,165,250,.1)',color:u.username==='keerthy'?'#a78bfa':'#60a5fa',borderRadius:6,padding:'2px 8px',fontSize:12}}>{u.username==='keerthy'?'👑 Admin':'👤 User'}</span></td>
                  <td>{u.username !== 'keerthy' && (
                    <button onClick={() => handleDelete(u.id, u.username)} disabled={deleting===u.id}
                      style={{background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)',borderRadius:6,padding:'4px 12px',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
                      {deleting===u.id?'...':'🗑️ Delete'}
                    </button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'activity' && (
        <div className="fade-in card">
          <div className="section-header">🔧 System Health</div>
          {[['Backend API','Online','#4ade80'],['Database','Online','#4ade80'],
            ['Weather API','Online','#4ade80'],['News API','Online','#4ade80'],
            ['CO2 Signal','Fallback','#fbbf24'],['EIA Prices','Pending','#f97316'],
          ].map(([label,status,color]) => (
            <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #1a3a2a'}}>
              <span style={{fontSize:13,color:'#f0f4f8'}}>{label}</span>
              <span style={{fontSize:12,fontWeight:600,color,background:color+'22',borderRadius:20,padding:'2px 10px'}}>● {status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
