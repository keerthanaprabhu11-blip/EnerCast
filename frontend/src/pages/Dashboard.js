import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import LivePanel from '../components/LivePanel';
import {
  getCountries, getMetrics, forecastARIMA,
  getEnergyMix, getInsights, getAnomalies, getGDPPop, saveForecast, sendForecastAlert
} from '../services/api';

const COLORS = ['#6b7280','#374151','#9ca3af','#8b5cf6','#60a5fa','#fbbf24','#4ade80','#f97316'];

export default function Dashboard({ token }) {
  const [countries, setCountries]   = useState([]);
  const [metrics, setMetrics]       = useState({});
  const [country, setCountry]       = useState('India');
  const [metric, setMetric]         = useState('primary_energy_consumption');
  const [forecastYears, setForecastYears] = useState(7);
  const [p, setP] = useState(2); const [d, setD] = useState(1); const [q, setQ] = useState(2);
  const [forecast, setForecast]     = useState(null);
  const [mix, setMix]               = useState(null);
  const [insights, setInsights]     = useState(null);
  const [anomalies, setAnomalies]   = useState(null);
  const [gdpPop, setGdpPop]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState('forecast');
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    getCountries().then(r => setCountries(r.data.countries));
    getMetrics().then(r => setMetrics(r.data.metrics));
  }, []);

  const runForecast = async () => {
    setLoading(true); setError(null); setForecast(null); setSaved(false);
    try {
      const [fc, mx, ins, anom, gp] = await Promise.all([
        forecastARIMA(country, metric, forecastYears, p, d, q),
        getEnergyMix(country),
        getInsights(country, metric),
        getAnomalies(country, metric),
        getGDPPop(country),
      ]);
      setForecast(fc.data);
      setMix(mx.data);
      setInsights(ins.data);
      setAnomalies(anom.data);
      setGdpPop(gp.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!token) return alert('Please login to save forecasts');
    try {
      await saveForecast({ country, metric, model: 'ARIMA' });
      setSaved(true);
    } catch (e) { alert('Failed to save'); }
  };

  const [exporting, setExporting] = useState(false);

  const handleEmailAlert = async () => {
    if (!token) return alert('Please login to receive alerts');
    try {
      await sendForecastAlert({
        country, metric,
        forecast_val: forecast?.forecast_values?.[0]?.toFixed(1),
        mape: forecast?.metrics?.mape,
      });
      alert('📧 Forecast report sent to your email!');
    } catch(e) { alert('Failed to send email'); }
  };

  const handleExportCSV = () => {
    if (!forecast) return;
    const rows = [['Year','Forecast','Lower Bound','Upper Bound']];
    forecast.forecast_years.forEach((y,i) => rows.push([y, forecast.forecast_values[i], forecast.lower_bound[i], forecast.upper_bound[i]]));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `EnerCast_${country}_${metric}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch((process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api') + '/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ country, metric, forecast, insights }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `EnerCast_${country}_Report.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('PDF export failed: ' + e.message); }
    setExporting(false);
  };

  // Build chart data
  const buildForecastData = () => {
    if (!forecast) return [];
    const hist = forecast.historical_years.map((y, i) => ({
      year: y, historical: forecast.historical_values[i],
      fitted: forecast.fitted_values[i]
    }));
    const fc = forecast.forecast_years.map((y, i) => ({
      year: y, forecast: forecast.forecast_values[i],
      lower: forecast.lower_bound[i], upper: forecast.upper_bound[i]
    }));
    return [...hist, ...fc];
  };

  const buildMixData = () => {
    if (!mix) return [];
    return mix.years.map((y, i) => ({
      year: y,
      Coal:    mix.coal_consumption?.[i]    || 0,
      Oil:     mix.oil_consumption?.[i]     || 0,
      Gas:     mix.gas_consumption?.[i]     || 0,
      Nuclear: mix.nuclear_consumption?.[i] || 0,
      Hydro:   mix.hydro_consumption?.[i]   || 0,
      Solar:   mix.solar_consumption?.[i]   || 0,
      Wind:    mix.wind_consumption?.[i]    || 0,
    }));
  };

  const buildAnomalyData = () => {
    if (!anomalies || !anomalies.years || !anomalies.values) return [];
    return anomalies.years.map((y, i) => ({
      year: y,
      value:   (anomalies.values[i] == null || anomalies.values[i] !== anomalies.values[i]) ? null : +anomalies.values[i],
      mean:    (anomalies.roll_mean[i] == null || anomalies.roll_mean[i] !== anomalies.roll_mean[i]) ? null : +anomalies.roll_mean[i],
      upper:   (anomalies.upper_band[i] == null || anomalies.upper_band[i] !== anomalies.upper_band[i]) ? null : +anomalies.upper_band[i],
      lower:   (anomalies.lower_band[i] == null || anomalies.lower_band[i] !== anomalies.lower_band[i]) ? null : +anomalies.lower_band[i],
      anomaly: (anomalies.anomaly_years || []).includes(y) ? anomalies.values[i] : null,
    }));
  };

  const buildGDPData = () => {
    if (!gdpPop) return [];
    return gdpPop.years.map((y, i) => ({
      year: y,
      gdp:        gdpPop.gdp[i] / 1e9,
      population: gdpPop.population[i] / 1e6,
    }));
  };

  const pieData = mix ? Object.entries(mix.pie || {}).map(([k, v]) => ({ name: k, value: v })) : [];

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        background:'linear-gradient(135deg, #091428 0%, #0d1b33 50%, #091428 100%)',
        border:'1px solid #1a2f55', borderRadius:16, padding:'40px 36px',
        marginBottom:28, position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200,
          background:'radial-gradient(circle, rgba(240,180,41,.08) 0%, transparent 70%)',
          borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:-60, width:250, height:250,
          background:'radial-gradient(circle, rgba(59,130,246,.06) 0%, transparent 70%)',
          borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:42, height:42, borderRadius:10,
                background:'linear-gradient(135deg,#1d4ed8,#f0b429)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, boxShadow:'0 0 20px rgba(240,180,41,.3)' }}>⚡</div>
              <span style={{ fontSize:12, color:'#f0b429', fontWeight:700,
                textTransform:'uppercase', letterSpacing:2 }}>EnerCast v2.0</span>
            </div>
            <h1 style={{ fontSize:'2rem', fontWeight:800, color:'#f0f4ff',
              letterSpacing:'-.5px', marginBottom:8, lineHeight:1.2 }}>
              Energy Intelligence<br/>
              <span style={{ background:'linear-gradient(135deg,#f0b429,#60a5fa)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Forecasting Platform
              </span>
            </h1>
            <p style={{ color:'#64748b', fontSize:'.95rem', maxWidth:480, lineHeight:1.6 }}>
              AI-powered energy consumption forecasting using ARIMA, LSTM & Random Forest models.
              Real-time weather insights, CO₂ tracking, and global energy analytics.
            </p>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['🌍','180+','Countries'],['🧠','4','AI Models'],['📊','20+','Metrics'],['⚡','Live','Data']].map(([icon,val,label]) => (
              <div key={label} style={{ background:'rgba(255,255,255,.04)', border:'1px solid #1a2f55',
                borderRadius:12, padding:'16px 20px', textAlign:'center', minWidth:80 }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:'1.2rem', fontWeight:700, color:'#f0b429' }}>{val}</div>
                <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase', letterSpacing:.8 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LivePanel country={country} />

      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <label>🌍 Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ width: 160 }}>
            {countries.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>📊 Metric</label>
          <select value={metric} onChange={e => setMetric(e.target.value)} style={{ width: 220 }}>
            {Object.entries(metrics).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>🔮 Forecast Years: {forecastYears}</label>
          <input type="range" min={3} max={15} value={forecastYears} onChange={e => setForecastYears(+e.target.value)} style={{ width: 120 }} />
        </div>
        <div className="control-group">
          <label>p: {p}</label>
          <input type="range" min={0} max={5} value={p} onChange={e => setP(+e.target.value)} style={{ width: 80 }} />
        </div>
        <div className="control-group">
          <label>d: {d}</label>
          <input type="range" min={0} max={2} value={d} onChange={e => setD(+e.target.value)} style={{ width: 80 }} />
        </div>
        <div className="control-group">
          <label>q: {q}</label>
          <input type="range" min={0} max={5} value={q} onChange={e => setQ(+e.target.value)} style={{ width: 80 }} />
        </div>
        <div className="control-group" style={{ justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn btn-primary" onClick={runForecast} disabled={loading}>
            {loading ? '⏳ Running...' : '🚀 Run Forecast'}
          </button>
        </div>
      </div>

      {error && <div className="error-box">❌ {error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div> Running ARIMA model...
        </div>
      )}

      {forecast && (
        <>
          {/* KPI Cards */}
          <div className="metric-grid">
            {[
              { label: 'Latest (TWh)',    value: forecast.historical_values?.at(-1)?.toFixed(1),  color: '#10b981' },
              { label: 'Next Year (TWh)', value: forecast.forecast_values[0]?.toFixed(1),         color: '#f0b429' },
              { label: 'MAPE',            value: `${forecast.metrics.mape}%`,                     color: '#3b82f6' },
              { label: 'MAE (TWh)',       value: forecast.metrics.mae,                            color: '#8b5cf6' },
              { label: 'AIC Score',       value: forecast.metrics.aic,                            color: '#ef4444' },
            ].map((m, i) => (
              <div key={i} className="metric-card">
                <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Save + Export buttons */}
          <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSave} disabled={saved}>
              {saved ? '✅ Saved!' : '💾 Save Forecast'}
            </button>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '⏳ Generating...' : '📄 Export PDF'}
            </button>
            <button className="btn btn-secondary" onClick={handleEmailAlert}>
              📧 Email Report
            </button>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['forecast','validation','energy-mix','anomalies','gdp-pop','insights'].map(t => (
              <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
                {{ 'forecast':'🔮 Forecast', 'validation':'📐 Validation', 'energy-mix':'🔋 Energy Mix',
                   'anomalies':'🚨 Anomalies', 'gdp-pop':'📈 GDP & Population', 'insights':'💡 Insights' }[t]}
              </button>
            ))}
          </div>

          {/* Forecast Tab */}
          {activeTab === 'forecast' && (
            <>
              <div className="section-header">🔮 ARIMA Forecast — {country}</div>
              <div className="card">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={buildForecastData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                    <XAxis dataKey="year" stroke="#475569" />
                    <YAxis stroke="#475569" />
                    <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Historical" />
                    <Line type="monotone" dataKey="fitted"     stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Fitted" />
                    <Line type="monotone" dataKey="forecast"   stroke="#f0b429" strokeWidth={3} dot={{ r:3, fill:"#f0b429" }} name="Forecast" />
                    <Line type="monotone" dataKey="upper"      stroke="#f0b429" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Upper CI" opacity={0.5} />
                    <Line type="monotone" dataKey="lower"      stroke="#f0b429" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Lower CI" opacity={0.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Table */}
              <div className="section-header">📋 Forecast Table</div>
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr><th>Year</th><th>Forecast (TWh)</th><th>Lower Bound</th><th>Upper Bound</th></tr>
                  </thead>
                  <tbody>
                    {forecast.forecast_years.map((y, i) => (
                      <tr key={y}>
                        <td>{y}</td>
                        <td>{forecast.forecast_values[i]?.toFixed(2)}</td>
                        <td>{forecast.lower_bound[i]?.toFixed(2)}</td>
                        <td>{forecast.upper_bound[i]?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <>
              <div className="section-header">📐 Model Validation (80/20 Split)</div>
              <div className="two-col">
                <div className="card">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={forecast.test_years.map((y,i) => ({
                      year: y, actual: forecast.test_values[i], predicted: forecast.pred_values[i]
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                      <XAxis dataKey="year" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }} />
                      <Legend />
                      <Line type="monotone" dataKey="actual"    stroke="#4ade80" strokeWidth={2} name="Actual" />
                      <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" name="Predicted" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:16 }}>Performance Metrics</h3>
                  <table className="data-table">
                    <thead><tr><th>Metric</th><th>Value</th><th>Meaning</th></tr></thead>
                    <tbody>
                      <tr><td>MAE</td><td>{forecast.metrics.mae} TWh</td><td>Mean Absolute Error</td></tr>
                      <tr><td>RMSE</td><td>{forecast.metrics.rmse} TWh</td><td>Root Mean Sq. Error</td></tr>
                      <tr><td>MAPE</td><td>{forecast.metrics.mape}%</td><td>Mean Abs. % Error</td></tr>
                      <tr><td>AIC</td><td>{forecast.metrics.aic}</td><td>Model Fit Score</td></tr>
                    </tbody>
                  </table>
                  <div style={{ marginTop:16 }}>
                    {forecast.metrics.mape < 5  && <div className="green-box">🟢 Excellent accuracy!</div>}
                    {forecast.metrics.mape >= 5  && forecast.metrics.mape < 15 && <div className="insight-box">🟡 Good accuracy</div>}
                    {forecast.metrics.mape >= 15 && <div className="alert-box">🔴 Needs tuning — try adjusting p, d, q</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Energy Mix Tab */}
          {activeTab === 'energy-mix' && mix && (
            <>
              <div className="section-header">🔋 Energy Mix Over Time</div>
              <div className="two-col">
                <div className="card">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={buildMixData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                      <XAxis dataKey="year" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }} />
                      <Legend />
                      {['Coal','Oil','Gas','Nuclear','Hydro','Solar','Wind'].map((k,i) => (
                        <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={COLORS[i]} fill={COLORS[i]} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:16 }}>Current Energy Mix</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                        dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Anomalies Tab */}
          {activeTab === 'anomalies' && anomalies && (
            <>
              <div className="section-header">🚨 Anomaly Detection</div>
              <div className="card">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={buildAnomalyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                    <XAxis dataKey="year" stroke="#475569" />
                    <YAxis stroke="#475569" />
                    <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="value"  stroke="#60a5fa" strokeWidth={2} dot={false} name="Consumption" />
                    <Line type="monotone" dataKey="mean"   stroke="#a78bfa" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Rolling Avg" />
                    <Line type="monotone" dataKey="upper"  stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Upper Band" />
                    <Line type="monotone" dataKey="lower"  stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Lower Band" />
                    <Line type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={0} dot={{ r:8, fill:'#ef4444' }} name="⚠️ Anomaly" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {anomalies?.anomaly_years?.length > 0
                ? <div className="alert-box">⚠️ Anomalies detected in: {anomalies?.anomaly_years?.join(', ')}</div>
                : <div className="green-box">✅ No significant anomalies detected.</div>
              }
            </>
          )}

          {/* GDP & Population Tab */}
          {activeTab === 'gdp-pop' && gdpPop && (
            <>
              <div className="section-header">📈 GDP & Population Trends</div>
              <div className="two-col">
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:12 }}>GDP (Billion USD)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={buildGDPData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                      <XAxis dataKey="year" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }}
                        formatter={v => [`$${v.toFixed(0)}B`, 'GDP']} />
                      <Area type="monotone" dataKey="gdp" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} name="GDP (B USD)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:12 }}>Population (Millions)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={buildGDPData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2f55" />
                      <XAxis dataKey="year" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip contentStyle={{ background:'#0d1b33', border:'1px solid #1a2f55', color:'#f0f4ff', borderRadius:8, fontSize:12 }}
                        formatter={v => [`${v.toFixed(1)}M`, 'Population']} />
                      <Area type="monotone" dataKey="population" stroke="#4ade80" fill="#4ade80" fillOpacity={0.2} name="Population (M)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card" style={{ marginTop:16 }}>
                <h3 style={{ color:'#4ade80', marginBottom:8 }}>Latest Values</h3>
                <div style={{ display:'flex', gap:24 }}>
                  {insights && <>
                    <div><span style={{ color:'#9ca3af' }}>GDP: </span><strong style={{ color:'#60a5fa' }}>${insights.gdp ? (insights.gdp/1e9).toFixed(0) : 'N/A'}B</strong></div>
                    <div><span style={{ color:'#9ca3af' }}>Population: </span><strong style={{ color:'#4ade80' }}>{insights.population ? (insights.population/1e6).toFixed(1) : 'N/A'}M</strong></div>
                  </>}
                </div>
              </div>
            </>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && insights && (
            <>
              <div className="section-header">💡 Optimization Insights</div>
              <div className="two-col">
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:12 }}>📊 Key Statistics</h3>
                  <div className="insight-box">📈 Historical CAGR: <strong>{insights.cagr}%</strong>/year</div>
                  <div className="insight-box">⚡ Latest consumption: <strong>{insights.latest_value?.toFixed(1)} TWh</strong></div>
                  {insights.renew_share && <div className={insights.renew_share > 20 ? 'green-box' : 'insight-box'}>🌿 Renewables share: <strong>{insights.renew_share?.toFixed(1)}%</strong></div>}
                  {insights.fossil_share && <div className={insights.fossil_share > 70 ? 'alert-box' : 'insight-box'}>🏭 Fossil fuel share: <strong>{insights.fossil_share?.toFixed(1)}%</strong></div>}
                  {insights.gdp && <div className="insight-box">💰 GDP: <strong>${(insights.gdp/1e9).toFixed(0)}B</strong></div>}
                  {insights.population && <div className="insight-box">👥 Population: <strong>{(insights.population/1e6).toFixed(1)}M</strong></div>}
                </div>
                <div className="card">
                  <h3 style={{ color:'#4ade80', marginBottom:12 }}>🎯 Recommendations</h3>
                  {insights.recommendations?.map((r, i) => (
                    <div key={i} className={r.type==='alert'?'alert-box':r.type==='success'?'green-box':'insight-box'}>
                      {r.type==='alert'?'🔴':r.type==='success'?'✅':'⚠️'} {r.text}
                    </div>
                  ))}
                  {(!insights.recommendations || insights.recommendations.length === 0) && (
                    <div className="green-box">✅ Energy profile looks stable!</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!forecast && !loading && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
          <div style={{ fontSize:'3rem', marginBottom:16 }}>⚡</div>
          <div style={{ fontSize:'1.2rem', marginBottom:8 }}>Select a country and click <strong style={{ color:'#4ade80' }}>Run Forecast</strong></div>
          <div style={{ fontSize:'0.9rem' }}>EnerCast will analyze historical data and forecast future energy consumption</div>
        </div>
      )}
    </div>
  );
}
