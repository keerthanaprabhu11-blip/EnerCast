import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API from '../services/api';

export default function GridLive() {
  const [country, setCountry] = useState('India');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const COUNTRIES = ['India','United States','Germany','France','United Kingdom','China','Australia','Brazil','Japan','Canada'];

  useEffect(() => {
    setLoading(true);
    API.get(`/grid-live?country=${country}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [country]);

  const GaugeBar = ({ value, color, label }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
        <span style={{ color:'#94a3b8' }}>{label}</span>
        <span style={{ color, fontWeight:700 }}>{value}%</span>
      </div>
      <div style={{ background:'#091428', borderRadius:6, height:10, overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', borderRadius:6,
          background:`linear-gradient(90deg, ${color}88, ${color})`,
          transition:'width 1s ease', boxShadow:`0 0 8px ${color}44` }}/>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-title">⚡ Live Grid Monitor</div>
      <div className="page-subtitle">Real-time renewable generation potential and grid demand</div>

      <div className="controls">
        <div className="control-group">
          <label>🌍 Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ width:180 }}>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {loading && <div style={{ color:'#f0b429', fontSize:13, alignSelf:'center' }}>⏳ Fetching live data...</div>}
        {data && !loading && (
          <div style={{ display:'flex', alignItems:'center', gap:6, alignSelf:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:12, color:'#64748b' }}>LIVE</span>
          </div>
        )}
      </div>

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="metric-grid" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
            {[
              { label:'Temperature',    value:`${data.temp}°C`,     color:'#f97316' },
              { label:'Wind Speed',     value:`${data.wind} m/s`,   color:'#3b82f6' },
              { label:'Solar Radiation',value:`${data.radiation}W`, color:'#f0b429' },
              { label:'Cloud Cover',    value:`${data.cloud}%`,     color:'#94a3b8' },
              { label:'Grid Demand',    value:`${data.demand}%`,    color:'#ef4444' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div className="metric-value" style={{ color:m.color, fontSize:'1.4rem' }}>{m.value}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="two-col">
            {/* Generation Potential */}
            <div>
              <div className="section-header">⚡ Generation Potential</div>
              <div className="card">
                <GaugeBar value={data.solar_pct} color="#f0b429" label="☀️ Solar Generation Potential" />
                <GaugeBar value={data.wind_pct}  color="#3b82f6" label="💨 Wind Generation Potential" />
                <GaugeBar value={data.demand}    color="#ef4444" label="🔌 Estimated Grid Demand" />
                <div style={{ marginTop:20, padding:16, background:'#091428', borderRadius:10, border:'1px solid #1a2f55' }}>
                  <div style={{ fontSize:13, color:'#94a3b8', marginBottom:8 }}>💡 Grid Insight</div>
                  {data.solar_pct > 60
                    ? <div className="green-box">☀️ Excellent solar conditions — ideal for renewable generation</div>
                    : data.solar_pct > 30
                    ? <div className="insight-box">⚡ Moderate solar — hybrid generation recommended</div>
                    : <div className="alert-box">🌧️ Low solar — wind or conventional backup needed</div>
                  }
                  {data.wind_pct > 70 && <div className="green-box" style={{marginTop:6}}>💨 Strong winds — wind turbines operating near peak</div>}
                  {data.demand > 80 && <div className="alert-box" style={{marginTop:6}}>🔴 High demand — consider demand-side management</div>}
                </div>
              </div>
            </div>

            {/* Today's Forecast Chart */}
            <div>
              <div className="section-header">📈 Today's Hourly Forecast</div>
              <div className="card">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fontSize:11 }}
                      tickFormatter={t => t.substring(0,5)} interval={3} />
                    <YAxis stroke="#475569" tick={{ fontSize:11 }} />
                    <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', fontSize:12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="solar" stroke="#f0b429" strokeWidth={2} dot={false} name="☀️ Solar %" />
                    <Line type="monotone" dataKey="wind"  stroke="#3b82f6" strokeWidth={2} dot={false} name="💨 Wind %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
