import React, { useState } from 'react';
import { login } from '../services/api';

const inputStyle = {
  width:'100%', background:'#0a1520', border:'1px solid #1a3a2a',
  borderRadius:8, color:'#f0f4f8', padding:'10px 14px',
  fontSize:14, fontFamily:'inherit', outline:'none', marginTop:6,
};

export default function Login({ onLogin }) {
  const [form, setForm]   = useState({ username:'', password:'' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!form.username || !form.password) { setError('All fields required'); return; }
    setLoading(true);
    try {
      const res = await login({ username: form.username, password: form.password });
      onLogin(res.data.token, res.data.username);
    } catch(e) {
      setError(e.response?.data?.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:420, margin:'60px auto', padding:24 }}>
      <div className="page-title">Welcome Back</div>
      <div className="page-subtitle">Login to your EnerCast account</div>
      <div className="card" style={{ marginTop:24 }}>
        {error && <div className="error-box" style={{ marginBottom:16 }}>❌ {error}</div>}
        {[['username','Username','text'],['password','Password','password']].map(([key,label,type]) => (
          <div key={key} style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px' }}>{label}</label>
            <input type={type} style={inputStyle} placeholder={label}
              value={form[key]} onChange={e => setForm({ ...form, [key]:e.target.value })} />
          </div>
        ))}
        <button className="btn btn-primary" style={{ width:'100%', marginTop:8 }}
          onClick={handleLogin} disabled={loading}>
          {loading ? '⏳ Logging in...' : '🔑 Login'}
        </button>
        <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#6b7280' }}>
          No account? <a href="/register" style={{ color:'#4ade80' }}>Sign Up</a>
        </div>
      </div>
    </div>
  );
}
