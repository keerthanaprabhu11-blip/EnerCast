import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ token, username, onLogout }) {
  const loc = useLocation();
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const isActive = (path) => loc.pathname === path;
  const navItems = [
    { path:'/',        icon:'🏠', label:'Home',        badge:null },
    { path:'/dashboard', icon:'⚡', label:'Forecast',   badge:null },
    { path:'/compare', icon:'🌍', label:'Compare',    badge:null },
    { path:'/models',  icon:'🤖', label:'Models',     badge:'4 AI' },
    { path:'/map',     icon:'🗺️', label:'World Map',  badge:null },
    { path:'/grid',    icon:'⚡', label:'Live Grid',  badge:'LIVE' },
  ];
  return (
    <aside className="sidebar">
      <Link to="/" style={{textDecoration:'none'}}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">EnerCast</div>
            <div className="sidebar-logo-sub">Energy Intelligence</div>
          </div>
        </div>
      </Link>
      <div style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:10,padding:'10px 14px',marginBottom:20}}>
        <div style={{fontSize:'1.1rem',fontWeight:700,color:'#c084fc',letterSpacing:1,fontFamily:'monospace'}}>{time.toLocaleTimeString()}</div>
        <div style={{fontSize:'.7rem',color:'#475569',marginTop:2}}>{time.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
      </div>
      <div className="sidebar-section-label">Navigation</div>
      <nav className="sidebar-nav">
        {navItems.map(({path,icon,label,badge}) => (
          <Link key={path} to={path} className={`sidebar-link ${isActive(path)?'active':''}`}>
            <span className="sidebar-link-icon">{icon}</span>
            <span>{label}</span>
            {badge && <span className="sidebar-link-badge">{badge}</span>}
          </Link>
        ))}
        {username === 'keerthy' && (
          <Link to="/admin" className={`sidebar-link ${isActive('/admin')?'active':''}`}>
            <span className="sidebar-link-icon">🛡️</span>
            <span>Admin</span>
            <span className="sidebar-link-badge" style={{color:'#a78bfa',borderColor:'rgba(167,139,250,0.3)',background:'rgba(167,139,250,0.1)'}}>ADMIN</span>
          </Link>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-section-label">Account</div>
        {token ? (
          <>
            <Link to="/profile" className={`sidebar-link ${isActive('/profile')?'active':''}`}>
              <span className="sidebar-link-icon">👤</span>
              <span>{username||'Profile'}</span>
            </Link>
            <button onClick={onLogout} className="sidebar-link" style={{border:'1px solid rgba(239,68,68,0.2)',color:'#fca5a5',background:'rgba(239,68,68,0.05)',cursor:'pointer',fontFamily:'inherit',width:'100%',textAlign:'left'}}>
              <span className="sidebar-link-icon">🚪</span>
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    className={`sidebar-link ${isActive('/login')?'active':''}`}><span className="sidebar-link-icon">🔑</span><span>Login</span></Link>
            <Link to="/register" className={`sidebar-link ${isActive('/register')?'active':''}`} style={{color:'#c084fc'}}><span className="sidebar-link-icon">✨</span><span>Sign Up</span></Link>
          </>
        )}
      </div>
    </aside>
  );
}
