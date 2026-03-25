import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Models from './pages/Models';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import WorldMap from './pages/WorldMap';
import Admin from './pages/Admin';
import GridLive from './pages/GridLive';
import './App.css';

const PAGE_TITLES = {
  '/':         'Dashboard',
  '/dashboard':'Forecast',
  '/compare':  'Compare',
  '/models':   'Models',
  '/map':      'World Map',
  '/grid':     'Live Grid',
  '/profile':  '👤 Profile',
  '/admin':    'Admin',
};

function Topbar({ token, username, onLogout }) {
  const loc = useLocation();
  const title = PAGE_TITLES[loc.pathname] || '⚡ EnerCast';
  return (
    <div className="topbar">
      <div style={{flex:1, fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1rem', color:'#f1f5f9'}}>{title}</div>
      {token ? (
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <Link to="/profile" style={{display:'flex', alignItems:'center', gap:8, textDecoration:'none',
            background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)',
            borderRadius:10, padding:'6px 14px', color:'#c084fc', fontSize:'.85rem', fontWeight:600, transition:'all .2s'}}
            onMouseEnter={e => e.currentTarget.style.background='rgba(124,58,237,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(124,58,237,0.1)'}>
            👤 {username}
          </Link>
          <button onClick={onLogout} style={{background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
            color:'#fca5a5', borderRadius:10, padding:'6px 14px', cursor:'pointer',
            fontSize:'.85rem', fontWeight:600, fontFamily:'inherit', transition:'all .2s'}}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}>
            🚪 Logout
          </button>
        </div>
      ) : (
        <div style={{display:'flex', gap:8}}>
          <Link to="/login" style={{textDecoration:'none', background:'rgba(255,255,255,0.06)',
            border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', borderRadius:10,
            padding:'6px 14px', fontSize:'.85rem', fontWeight:600}}>🔑 Login</Link>
          <Link to="/register" style={{textDecoration:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)',
            color:'white', borderRadius:10, padding:'6px 14px', fontSize:'.85rem', fontWeight:600,
            boxShadow:'0 0 20px rgba(124,58,237,0.3)'}}>✨ Sign Up</Link>
        </div>
      )}
    </div>
  );
}

function App() {
  const [token, setToken]       = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));

  const handleLogin = (tok, user) => {
    localStorage.setItem('token', tok); localStorage.setItem('username', user);
    setToken(tok); setUsername(user);
  };
  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('username');
    setToken(null); setUsername(null);
  };

  return (
    <Router>
      <div className="app">
        <Navbar token={token} username={username} onLogout={handleLogout} />
        <div className="main-content">
          <Topbar token={token} username={username} onLogout={handleLogout} />
          <Routes>
            <Route path="/"          element={<Home token={token} username={username} />} />
            <Route path="/dashboard" element={<Dashboard token={token} />} />
            <Route path="/compare"   element={<Compare />} />
            <Route path="/models"    element={<Models />} />
            <Route path="/map"       element={<WorldMap />} />
            <Route path="/grid"      element={<GridLive />} />
            <Route path="/login"     element={token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
            <Route path="/register"  element={token ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
            <Route path="/profile"   element={token ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/admin"     element={token ? <Admin token={token} /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
