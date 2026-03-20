import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCountries, getMetrics, forecastARIMA, forecastLinear, forecastRF, forecastLSTM } from '../services/api';

const MODEL_COLORS = { arima:'#4ade80', linear:'#60a5fa', rf:'#f59e0b', lstm:'#a78bfa' };
const MODEL_LABELS = { arima:'ARIMA', linear:'Linear Regression', rf:'Random Forest', lstm:'Neural Network' };

export default function Models() {
  const [countries, setCountries] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [country, setCountry] = useState('India');
  const [metric, setMetric] = useState('primary_energy_consumption');
  const [forecastYears, setFY] = useState(7);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState('all');

  useEffect(() => {
    getCountries().then(r => setCountries(r.data.countries));
    getMetrics().then(r => setMetrics(r.data.metrics));
  }, []);

  const runAllModels = async () => {
    setLoading(true); setResults(null);
    const res = {};
    const models = [
      { key:'arima',  fn: () => forecastARIMA(country, metric, forecastYears, 2, 1, 2) },
      { key:'linear', fn: () => forecastLinear(country, metric, forecastYears) },
      { key:'rf',     fn: () => forecastRF(country, metric, forecastYears) },
      { key:'lstm',   fn: () => forecastLSTM(country, metric, forecastYears) },
    ];
    for (const m of models) {
      try { res[m.key] = (await m.fn()).data; }
      catch (e) { res[m.key] = { error: e.response?.data?.error || e.message }; }
    }
    setResults(res); setLoading(false);
  };

  const buildCompareChart = () => {
    if (!results) return [];
    const map = {};
    Object.entries(results).forEach(([key, data]) => {
      if (data.error) return;
      data.historical_years?.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; if (key === 'arima') map[y]['Historical'] = data.historical_values[i]; });
      data.forecast_years?.forEach((y, i) => { if (!map[y]) map[y] = { year: y }; map[y][MODEL_LABELS[key]] = data.forecast_values[i]; });
    });
    return Object.values(map).sort((a,b) => a.year - b.year);
  };

  const ts = { background:'#1a2332', border:'1px solid #2d4a3e', color:'#e5e7eb' };

  return (
    <div>
      <div className="page-title">🤖 Model Comparison</div>
      <div className="page-subtitle">Compare ARIMA, Linear Regression, Random Forest & Neural Network forecasts</div>
      <div className="controls">
        <div className="control-group"><label>🌍 Country</label><select value={country} onChange={e => setCountry(e.target.value)} style={{width:160}}>{countries.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="control-group"><label>📊 Metric</label><select value={metric} onChange={e => setMetric(e.target.value)} style={{width:220}}>{Object.entries(metrics).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="control-group"><label>🔮 Years: {forecastYears}</label><input type="range" min={3} max={15} value={forecastYears} onChange={e => setFY(+e.target.value)} style={{width:120}} /></div>
        <div className="control-group" style={{justifyContent:'flex-end'}}><label>&nbsp;</label><button className="btn btn-primary" onClick={runAllModels} disabled={loading}>{loading?'⏳ Running...':'🚀 Run All Models'}</button></div>
      </div>
      {loading && <div className="loading"><div className="spinner"></div>Running all 4 models... (may take 1-2 mins for Neural Network)</div>}
      {results && (
        <div>
          <div className="tabs">
            <button className={`tab ${activeModel==='all'?'active':''}`} onClick={() => setActiveModel('all')}>📊 All Models</button>
            {Object.keys(MODEL_LABELS).map(k => <button key={k} className={`tab ${activeModel===k?'active':''}`} onClick={() => setActiveModel(k)}>{MODEL_LABELS[k]}</button>)}
          </div>
          {activeModel === 'all' && (
            <div>
              <div className="section-header">📊 All Models Forecast Comparison</div>
              <div className="card"><ResponsiveContainer width="100%" height={400}><LineChart data={buildCompareChart()}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="year" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={ts} /><Legend /><Line type="monotone" dataKey="Historical" stroke="#ffffff" strokeWidth={2} dot={false} />{Object.entries(MODEL_LABELS).map(([k,v]) => !results[k]?.error && <Line key={k} type="monotone" dataKey={v} stroke={MODEL_COLORS[k]} strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} />)}</LineChart></ResponsiveContainer></div>
              <div className="section-header">📐 Model Performance</div>
              <div className="card">
                <table className="data-table">
                  <thead><tr><th>Model</th><th>MAE (TWh)</th><th>RMSE (TWh)</th><th>MAPE (%)</th><th>Status</th></tr></thead>
                  <tbody>{Object.entries(results).map(([k, data]) => <tr key={k}><td style={{color:MODEL_COLORS[k],fontWeight:600}}>{MODEL_LABELS[k]}</td><td>{data.error?'—':data.metrics?.mae}</td><td>{data.error?'—':data.metrics?.rmse}</td><td>{data.error?'—':`${data.metrics?.mape}%`}</td><td>{data.error?<span style={{color:'#ef4444'}}>❌ {data.error}</span>:<span style={{color:'#4ade80'}}>✅ OK</span>}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {activeModel !== 'all' && results[activeModel] && !results[activeModel].error && (
            <div>
              <div className="section-header">🔮 {MODEL_LABELS[activeModel]} Forecast</div>
              <div className="card"><ResponsiveContainer width="100%" height={380}><LineChart data={[...results[activeModel].historical_years.map((y,i) => ({year:y,historical:results[activeModel].historical_values[i]})),...results[activeModel].forecast_years.map((y,i) => ({year:y,forecast:results[activeModel].forecast_values[i],lower:results[activeModel].lower_bound[i],upper:results[activeModel].upper_bound[i]}))]}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" /><XAxis dataKey="year" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={ts} /><Legend /><Line type="monotone" dataKey="historical" stroke="#60a5fa" strokeWidth={2} dot={false} name="Historical" /><Line type="monotone" dataKey="forecast" stroke={MODEL_COLORS[activeModel]} strokeWidth={3} dot={{r:4}} name="Forecast" /><Line type="monotone" dataKey="upper" stroke={MODEL_COLORS[activeModel]} strokeWidth={1} strokeDasharray="2 2" dot={false} name="Upper CI" /><Line type="monotone" dataKey="lower" stroke={MODEL_COLORS[activeModel]} strokeWidth={1} strokeDasharray="2 2" dot={false} name="Lower CI" /></LineChart></ResponsiveContainer></div>
            </div>
          )}
          {activeModel !== 'all' && results[activeModel]?.error && <div className="error-box">❌ {MODEL_LABELS[activeModel]} error: {results[activeModel].error}</div>}
        </div>
      )}
    </div>
  );
}
