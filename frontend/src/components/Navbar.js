import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ token, username, onLogout }) {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const isActive = (path) => loc.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? '#f0b429' : '#94a3b8',
    textDecoration: 'none', fontSize: '.875rem', fontWeight: 500,
    padding: '6px 14px', borderRadius: 8,
    background: isActive(path) ? 'rgba(240,180,41,.1)' : 'transparent',
    border: isActive(path) ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
    transition: 'all .2s ease', display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  const navLinks = [
    ['/', '🏠', 'Dashboard'],
    ['/compare', '🌍', 'Compare'],
    ['/models', '🤖', 'Models'],
    ['/map', '🗺️', 'World Map'],
    ['/grid', '⚡', 'Live Grid'],
  ];

  return (
    <nav style={{
      background: 'rgba(5,13,26,.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1a2f55',
      padding: '0 28px',
      display: 'flex', alignItems: 'center',
      height: 64, position: 'sticky', top: 0, zIndex: 100,
      gap: 8,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, marginRight:16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1d4ed8, #f0b429)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 0 16px rgba(240,180,41,.3)',
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0f4ff', letterSpacing: '-.3px' }}>EnerCast</div>
          <div style={{ fontSize: 9, color: '#f0b429', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: -2 }}>Energy Intelligence</div>
        </div>
        <span style={{ fontSize: 10, color: '#f0b429', background: 'rgba(240,180,41,.1)', border: '1px solid rgba(240,180,41,.25)', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>v2.0</span>
      </Link>

      {/* Desktop nav */}
      {!mobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {navLinks.map(([path, icon, label]) => (
            <Link key={path} to={path} style={linkStyle(path)}>{icon} {label}</Link>
          ))}
          {username === 'keerthy' && (
            <Link to="/admin" style={{ ...linkStyle('/admin'), color: isActive('/admin') ? '#8b5cf6' : '#94a3b8',
              background: isActive('/admin') ? 'rgba(139,92,246,.1)' : 'transparent',
              border: isActive('/admin') ? '1px solid rgba(139,92,246,.25)' : '1px solid transparent' }}>
              🛡️ Admin
            </Link>
          )}
        </div>
      )}

      {/* Auth buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: mobile ? 'auto' : 0 }}>
        {token ? (
          <>
            {!mobile && (
              <Link to="/profile" style={{ ...linkStyle('/profile'),
                color: isActive('/profile') ? '#8b5cf6' : '#94a3b8',
                background: isActive('/profile') ? 'rgba(139,92,246,.1)' : 'transparent',
                border: isActive('/profile') ? '1px solid rgba(139,92,246,.25)' : '1px solid transparent',
              }}>
                👤 {username}
              </Link>
            )}
            <button onClick={onLogout} style={{
              background: 'transparent', border: '1px solid #ef4444',
              color: '#ef4444', borderRadius: 8, padding: '7px 16px',
              cursor: 'pointer', fontSize: '.875rem', fontWeight: 600,
              transition: 'all .2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,.1)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ ...linkStyle('/login') }}>Login</Link>
            <Link to="/register" style={{
              textDecoration: 'none', padding: '7px 18px', borderRadius: 8,
              background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
              color: '#fff', fontSize: '.875rem', fontWeight: 600,
              border: '1px solid #2563eb', transition: 'all .2s',
              boxShadow: '0 0 16px rgba(59,130,246,.2)',
            }}>Sign Up</Link>
          </>
        )}

        {/* Mobile hamburger */}
        {mobile && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{
              background: 'transparent', border: '1px solid #1a2f55',
              color: '#f0f4ff', borderRadius: 8, padding: '6px 12px',
              cursor: 'pointer', fontSize: 18,
            }}>☰</button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 46, right: 0, background: '#0d1b33',
                border: '1px solid #1a2f55', borderRadius: 12, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 6,
                zIndex: 200, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
              }}>
                {navLinks.map(([path, icon, label]) => (
                  <Link key={path} to={path} onClick={() => setMenuOpen(false)}
                    style={{ ...linkStyle(path), display: 'block', padding: '10px 14px' }}>
                    {icon} {label}
                  </Link>
                ))}
                {token && <Link to="/profile" onClick={() => setMenuOpen(false)}
                  style={{ ...linkStyle('/profile'), display: 'block', padding: '10px 14px' }}>
                  👤 Profile
                </Link>}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
