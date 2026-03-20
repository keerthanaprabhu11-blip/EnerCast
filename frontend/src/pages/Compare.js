import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCountries, getMetrics, compareCountries, forecastARIMA } from '../services/api';

export default function Compare() {
  const [countries, setCountries] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [c1, setC1] = useState('India');
  const [c2, setC2] = useState('China');
  const [metric, setMetric] = useState('primary_energy_consumption');
  const [forecastYears, setFY] = useState(7);
  const [data, setData] = useState(null);
  const [fc1, setFc1] = useState(null);
  const [fc2, setFc2] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCountries().then(r => setCountries(r.data.countries));
    getMetrics().then(r => setMetrics(r.data.metrics));
  }, []);

  const runCompare = async () => {
    if (c1 === c2) return alert('Please select two different countries');
    setLoading(true); setData(null);
    try {
      const [cmp, f1, f2] = await Promise.all([
        compareCountries(c1, c2, metric),
        forecastARIMA(c1, metric, forecastYears, 2, 1, 2),
        forecastARIMA(c2, metric, forecastYears, 2, 1, 2),
      ]);
      setData(cmp.data); setFc1(f1.data); setFc2(f2.data);
    } catch (e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
    setLoading(false);
  };

  const buildHistChart = () => {
    if (!data) return [];
    const map = {};
    data.country1.years.forEach((y, i) => { map[y] = { year: y, [c1]: data.country1.values[i] }; });
    data.country2.years.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; map[y][c2] = data.country2.values[i]; });
    return Object.values(map).sort((a, b) => a.year - b.year);
  };

  const buildFcChart = () => {
    if (!fc1 || !fc2) return [];
    const map = {};
    fc1.historical_years.forEach((y, i) => { map[y] = { year: y, [`${c1} Hist`]: fc1.historical_values[i] }; });
    fc2.historical_years.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; map[y][`${c2} Hist`] = fc2.historical_values[i]; });
    fc1.forecast_years.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; map[y][`${c1} Forecast`] = fc1.forecast_values[i]; });
    fc2.forecast_years.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; map[y][`${c2} Forecast`] = fc2.forecast_values[i]; });
    return Object.values(map).sort((a, b) => a.year - b.year);
  };

  const ts = { background:'#1a2332', border:'1px solid #2d4a3e', color:'#e5e7eb' };
  const barData = data ? [
    { name: 'CAGR (%)', [c1]: data.country1.cagr, [c2]: data.country2.cagr },
    { name: 'Renew %', [c1]: data.country1.renew_share || 0, [c2]: data.country2.renew_share || 0 },
    { name: 'Fossil %', [c1]: data.country1.fossil_share || 0, [c2]: data.country2.fossil_share || 0 },
  ] : [];

  return (
    <div>
      <div className="page-title">🌍 Country Comparison</div>
      <div className="page-subtitle">Compare energy profiles and forecasts between two countries</div>
      <div className="controls">
        <div className="control-group"><label>🔵 Country 1</label><select value={c1} onChange={e => setC1(e.target.value)} style={{width:160}}>{countries.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="control-group"><label>🟠 Country 2</label><select value={c2} onChange={e => setC2(e.target.value)} style={{width:160}}>{countries.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="control-group"><label>📊 Metric</label><select value={metric} onChange={e => setMetric(e.target.value)} style={{width:220}}>{Object.entries(metrics).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="control-group"><label>🔮 Years: {forecastYears}</label><input type="range" min={3} max={15} value={forecastYears} onChange={e => setFY(+e.target.value)} style={{width:120}} /></div>
        <div className="control-group" style={{justifyContent:'flex-end'}}><label>&nbsp;</label><button className="btn btn-primary" onClick={runCompare} disabled={loading}>{loading?'⏳ Comparing...':'🔍 Compare'}</button></div>
      </div>
      {loading && <div className="loading"><div className="spinner"></div>Analyzing both countries...</div>}
      {data && (
        <div>
          <div className="section-header">📌 Side-by-Side Metrics</div>
          <div className="two-col">
            {[data.country1, data.country2].map((c, idx) => (
              <div key={idx} className="card">
                <h3 style={{color:idx===0?'#60a5fa':'#fb923c',marginBottom:12}}>{c.name}</h3>
                <div className="metric-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
                  <div className="metric-card"><div className="metric-value" style={{fontSize:'1.2rem',color:idx===0?'#60a5fa':'#fb923c'}}>{c.latest?.toFixed(1)}</div><div className="metric-label">Latest (TWh)</div></div>
                  <div className="metric-card"><div className="metric-value" style={{fontSize:'1.2rem',color:idx===0?'#60a5fa':'#fb923c'}}>{c.cagr?.toFixed(2)}%</div><div className="metric-label">CAGR</div></div>
                  <div className="metric-card"><div className="metric-value" style={{fontSize:'1.2rem',color:'#4ade80'}}>{c.renew_share?.toFixed(1)||'N/A'}%</div><div className="metric-label">Renewables</div></div>
                  <div className="metric-card"><div className="metric-value" style={{fontSize:'1.2rem',color:'#f59e0b'}}>{c.fossil_share?.toFixed(1)||'N/A'}%</div><div className="metric-label">Fossil Fuels</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-header">📈 Historical Comparison</div>
          <div className="card"><ResponsiveContainer width="100%" height={350}><LineChart data={buildHistChart()}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="year" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={ts} /><Legend /><Line type="monotone" dataKey={c1} stroke="#60a5fa" strokeWidth={2} dot={false} /><Line type="monotone" dataKey={c2} stroke="#fb923c" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          <div className="section-header">🔮 Forecast Comparison</div>
          <div className="card"><ResponsiveContainer width="100%" height={380}><LineChart data={buildFcChart()}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="year" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={ts} /><Legend /><Line type="monotone" dataKey={`${c1} Hist`} stroke="#60a5fa" strokeWidth={2} dot={false} /><Line type="monotone" dataKey={`${c1} Forecast`} stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" dot={{r:4}} /><Line type="monotone" dataKey={`${c2} Hist`} stroke="#fb923c" strokeWidth={2} dot={false} /><Line type="monotone" dataKey={`${c2} Forecast`} stroke="#fb923c" strokeWidth={2} strokeDasharray="5 5" dot={{r:4}} /></LineChart></ResponsiveContainer></div>
          <div className="section-header">📊 Key Indicators</div>
          <div className="card"><ResponsiveContainer width="100%" height={280}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="name" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={ts} /><Legend /><Bar dataKey={c1} fill="#60a5fa" radius={[4,4,0,0]} /><Bar dataKey={c2} fill="#fb923c" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
        </div>
      )}
    </div>
  );
}
