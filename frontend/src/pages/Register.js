import React, { useState } from 'react';
import { register } from '../services/api';
import { Link } from 'react-router-dom';

export default function Register({ onLogin }) {
  const [form,    setForm]    = useState({ username:'', email:'', password:'', confirm:'' });
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!form.username || !form.email || !form.password) { setError('All fields required'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await register({ username:form.username, email:form.email, password:form.password });
      onLogin(res.data.token, res.data.username);
    } catch(e) {
      setError(e.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  const fields = [
    ['username','Username','text','👤','Choose a username'],
    ['email','Email','email','📧','your@email.com'],
    ['password','Password','password','🔑','Min 6 characters'],
    ['confirm','Confirm Password','password','🔐','Repeat password'],
  ];

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['#334155','#ef4444','#f0b429','#10b981'][strength];
  const strengthLabel = ['','Weak','Good','Strong'][strength];

  return (
    <div style={{
      minHeight:'90vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:24, background:'radial-gradient(ellipse at 50% 0%, #0d1b33 0%, #050d1a 70%)',
    }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16,
            background:'linear-gradient(135deg,#1d4ed8,#f0b429)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, margin:'0 auto 16px', boxShadow:'0 0 30px rgba(240,180,41,.3)' }}>⚡</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#f0f4ff',
            letterSpacing:'-.5px', marginBottom:4 }}>Create account</h1>
          <p style={{ color:'#64748b', fontSize:'.95rem' }}>Join EnerCast — it's free</p>
        </div>

        <div style={{ background:'#0d1b33', border:'1px solid #1a2f55',
          borderRadius:16, padding:32, boxShadow:'0 8px 40px rgba(0,0,0,.4)' }}>
          {error && (
            <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)',
              borderRadius:8, padding:'10px 14px', color:'#fca5a5',
              fontSize:14, marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              ⚠️ {error}
            </div>
          )}

          {fields.map(([key,label,type,icon,placeholder]) => (
            <div key={key} style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, color:'#64748b',
                textTransform:'uppercase', letterSpacing:'.8px', fontWeight:600, marginBottom:7 }}>
                {label}
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%',
                  transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>{icon}</span>
                <input
                  type={key.includes('password')||key==='confirm' ? (showPw?'text':'password') : type}
                  value={form[key]}
                  onChange={e => setForm({...form, [key]:e.target.value})}
                  placeholder={placeholder}
                  style={{ width:'100%', background:'#091428', border:'1px solid #1a2f55',
                    borderRadius:10, color:'#f0f4ff', padding:'11px 14px 11px 42px',
                    fontSize:14, fontFamily:'inherit', outline:'none',
                    transition:'all .2s', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#f0b429'}
                  onBlur={e  => e.target.style.borderColor='#1a2f55'}
                />
                {key==='password' && (
                  <button onClick={() => setShowPw(p=>!p)} style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'transparent', border:'none', cursor:'pointer',
                    color:'#64748b', fontSize:15, padding:0 }}>
                    {showPw?'🙈':'👁️'}
                  </button>
                )}
              </div>
              {/* Password strength */}
              {key==='password' && form.password.length > 0 && (
                <div style={{ marginTop:6 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2,
                        background: i<=strength ? strengthColor : '#1a2f55',
                        transition:'background .3s' }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:11, color:strengthColor, marginTop:3, display:'block' }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>
          ))}

          <button onClick={handleRegister} disabled={loading} style={{
            width:'100%', padding:'13px', borderRadius:10, border:'none',
            background: loading ? '#1a2f55' : 'linear-gradient(135deg,#1d4ed8,#1e40af)',
            color:'#fff', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer',
            transition:'all .2s', fontFamily:'inherit', marginTop:8,
            boxShadow: loading ? 'none' : '0 0 20px rgba(59,130,246,.3)',
          }}>
            {loading ? '⏳ Creating account...' : '🚀 Create Account'}
          </button>

          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#475569' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#f0b429', fontWeight:600, textDecoration:'none' }}>
              Sign in →
            </Link>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#334155' }}>
          © 2025 EnerCast · Energy Intelligence Platform
        </p>
      </div>
    </div>
  );
}
