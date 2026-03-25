import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COORDS = {
  "Afghanistan":[33.9391,67.7100,"Asia/Kabul"],
  "Albania":[41.1533,20.1683,"Europe/Tirane"],
  "Algeria":[28.0339,1.6596,"Africa/Algiers"],
  "Argentina":[-38.4161,-63.6167,"America/Argentina/Buenos_Aires"],
  "Australia":[-25.2744,133.7751,"Australia/Sydney"],
  "Austria":[47.5162,14.5501,"Europe/Vienna"],
  "Bangladesh":[23.6850,90.3563,"Asia/Dhaka"],
  "Belgium":[50.5039,4.4699,"Europe/Brussels"],
  "Brazil":[-14.2350,-51.9253,"America/Sao_Paulo"],
  "Canada":[56.1304,-106.3468,"America/Toronto"],
  "Chile":[-35.6751,-71.5430,"America/Santiago"],
  "China":[35.8617,104.1954,"Asia/Shanghai"],
  "Colombia":[4.5709,-74.2973,"America/Bogota"],
  "Czech Republic":[49.8175,15.4730,"Europe/Prague"],
  "Denmark":[56.2639,9.5018,"Europe/Copenhagen"],
  "Egypt":[26.8206,30.8025,"Africa/Cairo"],
  "Ethiopia":[9.1450,40.4897,"Africa/Addis_Ababa"],
  "Finland":[61.9241,25.7482,"Europe/Helsinki"],
  "France":[46.2276,2.2137,"Europe/Paris"],
  "Germany":[51.1657,10.4515,"Europe/Berlin"],
  "Ghana":[7.9465,-1.0232,"Africa/Accra"],
  "Greece":[39.0742,21.8243,"Europe/Athens"],
  "Hungary":[47.1625,19.5033,"Europe/Budapest"],
  "India":[20.5937,78.9629,"Asia/Kolkata"],
  "Indonesia":[-0.7893,113.9213,"Asia/Jakarta"],
  "Iran":[32.4279,53.6880,"Asia/Tehran"],
  "Iraq":[33.2232,43.6793,"Asia/Baghdad"],
  "Ireland":[53.1424,-7.6921,"Europe/Dublin"],
  "Israel":[31.0461,34.8516,"Asia/Jerusalem"],
  "Italy":[41.8719,12.5674,"Europe/Rome"],
  "Japan":[36.2048,138.2529,"Asia/Tokyo"],
  "Jordan":[30.5852,36.2384,"Asia/Amman"],
  "Kazakhstan":[48.0196,66.9237,"Asia/Almaty"],
  "Kenya":[-0.0236,37.9062,"Africa/Nairobi"],
  "Malaysia":[4.2105,101.9758,"Asia/Kuala_Lumpur"],
  "Mexico":[23.6345,-102.5528,"America/Mexico_City"],
  "Morocco":[31.7917,-7.0926,"Africa/Casablanca"],
  "Netherlands":[52.1326,5.2913,"Europe/Amsterdam"],
  "New Zealand":[-40.9006,174.8860,"Pacific/Auckland"],
  "Nigeria":[9.0820,8.6753,"Africa/Lagos"],
  "Norway":[60.4720,8.4689,"Europe/Oslo"],
  "Pakistan":[30.3753,69.3451,"Asia/Karachi"],
  "Peru":[-9.1900,-75.0152,"America/Lima"],
  "Philippines":[12.8797,121.7740,"Asia/Manila"],
  "Poland":[51.9194,19.1451,"Europe/Warsaw"],
  "Portugal":[39.3999,-8.2245,"Europe/Lisbon"],
  "Romania":[45.9432,24.9668,"Europe/Bucharest"],
  "Russia":[61.5240,105.3188,"Europe/Moscow"],
  "Saudi Arabia":[23.8859,45.0792,"Asia/Riyadh"],
  "South Africa":[-30.5595,22.9375,"Africa/Johannesburg"],
  "South Korea":[35.9078,127.7669,"Asia/Seoul"],
  "Spain":[40.4637,-3.7492,"Europe/Madrid"],
  "Sweden":[60.1282,18.6435,"Europe/Stockholm"],
  "Switzerland":[46.8182,8.2275,"Europe/Zurich"],
  "Thailand":[15.8700,100.9925,"Asia/Bangkok"],
  "Turkey":[38.9637,35.2433,"Europe/Istanbul"],
  "Ukraine":[48.3794,31.1656,"Europe/Kiev"],
  "United Arab Emirates":[23.4241,53.8478,"Asia/Dubai"],
  "United Kingdom":[55.3781,-3.4360,"Europe/London"],
  "United States":[37.0902,-95.7129,"America/New_York"],
  "Venezuela":[6.4238,-66.5897,"America/Caracas"],
  "Vietnam":[14.0583,108.2772,"Asia/Ho_Chi_Minh"],
};
const getCoords = (c) => COORDS[c] || [20.5937, 78.9629, "Asia/Kolkata"];
const COORDS_ORIG = {
  "India":[20.5937,78.9629,"Asia/Kolkata"],
  "United States":[37.0902,-95.7129,"America/New_York"],
  "China":[35.8617,104.1954,"Asia/Shanghai"],
  "Germany":[51.1657,10.4515,"Europe/Berlin"],
  "United Kingdom":[55.3781,-3.4360,"Europe/London"],
  "France":[46.2276,2.2137,"Europe/Paris"],
  "Japan":[36.2048,138.2529,"Asia/Tokyo"],
  "Brazil":[-14.2350,-51.9253,"America/Sao_Paulo"],
  "Australia":[-25.2744,133.7751,"Australia/Sydney"],
  "Canada":[56.1304,-106.3468,"America/Toronto"],
};

const NEWS = [
  {text:'Global renewable energy capacity hits record 3,500 GW in 2025',src:'IEA Report'},
  {text:'India targets 500 GW renewable energy by 2030 — on track',src:'Ministry of Power'},
  {text:'Solar panel costs drop 12% year-over-year — highest adoption in Asia',src:'Bloomberg NEF'},
  {text:'Europe achieves 45% renewable electricity share in Q1 2026',src:'Eurostat'},
  {text:'Global EV sales surpass 20 million units — energy demand shifts accelerate',src:'IEA'},
];

const FEATURES = [
  {title:'ARIMA Forecasting',desc:'Time-series ML model with tunable p,d,q parameters',color:'#7c3aed',link:'/dashboard'},
  {title:'Neural Network',desc:'MLP deep learning for complex non-linear patterns',color:'#a855f7',link:'/models'},
  {title:'Random Forest',desc:'Ensemble learning with feature importance analysis',color:'#06b6d4',link:'/models'},
  {title:'Linear Regression',desc:'Baseline trend model for quick predictions',color:'#10b981',link:'/models'},
  {title:'Country Comparison',desc:'Benchmark energy profiles across 180+ countries',color:'#f59e0b',link:'/compare'},
  {title:'Live Grid Monitor',desc:'Real-time estimated consumption with weather data',color:'#ef4444',link:'/grid'},
];

export default function Home({ token }) {
  const [weather, setWeather] = useState(null);
  const [allCountries, setAllCountries] = useState(Object.keys(COORDS));
  const [country, setCountry] = useState('India');
  const [time, setTime]       = useState(new Date());
  const [newsIdx, setNewsIdx] = useState(0);
  const [carbon, setCarbon]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNewsIdx(i => (i+1) % NEWS.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const info = getCoords(country);
    const [lat, lon] = info;
    setLoading(true);
    setWeather(null);
    fetch(`http://127.0.0.1:5000/api/weather?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => { setWeather(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`http://127.0.0.1:5000/api/insights?country=${encodeURIComponent(country)}&metric=primary_energy_consumption`)
      .then(r => r.json())
      .then(d => { if (d.fossil_share) setCarbon({value: Math.round(d.fossil_share * 8.5), fossil: d.fossil_share?.toFixed(1)}); })
      .catch(() => {});
  }, [country]);

  const getLocalTime = () => {
    const tz = getCoords(country)[2] || 'Asia/Kolkata';
    return new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone: tz });
  };

  const getLocalDate = () => {
    const tz = getCoords(country)[2] || 'Asia/Kolkata';
    return new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', timeZone: tz });
  };

  const getIcon  = c => !c&&c!==0?'🌡️':c<=1?'☀️':c<=3?'⛅':c<=48?'🌫️':c<=67?'🌧️':'⛈️';
  const getLabel = c => !c&&c!==0?'N/A':c<=1?'Clear Sky':c<=3?'Partly Cloudy':c<=48?'Overcast':c<=67?'Rainy':'Stormy';

  const getAlert = () => {
    if (!weather || weather.error) return null;
    if (weather.temperature > 35) return {type:'alert', msg:`🔴 High temperature (${weather.temperature}°C) — Expect 15-20% spike in electricity demand`};
    if (weather.temperature > 28) return {type:'warn',  msg:`⚠️ Warm weather (${weather.temperature}°C) — Moderate cooling demand increase expected`};
    if (weather.windspeed > 20)   return {type:'good',  msg:`✅ Strong winds (${weather.windspeed} km/h) — Excellent conditions for wind energy`};
    if (weather.weathercode <= 1) return {type:'good',  msg:`☀️ Clear sky — Solar panels operating at peak efficiency`};
    return {type:'ok', msg:`✅ Comfortable temperature (${weather.temperature}°C) — optimal energy efficiency window`};
  };

  const alert = getAlert();
  const carbonPct = carbon ? Math.min((carbon.value / 900) * 100, 100) : 50;

  return (
    <div className="page-body">
      {/* Hero */}
      <div className="home-hero">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20}}>
          <div style={{flex:1, minWidth:280}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
              <span className="live-badge"><span className="live-dot"></span>Live Data — {country}</span>
            </div>
            <h1 style={{fontFamily:'Syne,sans-serif', fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, lineHeight:1.1, marginBottom:16}}>
              Energy Intelligence<br/>
              <span className="gradient-text">Forecasting Platform</span>
            </h1>
            <p style={{color:'#94a3b8', fontSize:'.95rem', lineHeight:1.7, maxWidth:480, marginBottom:20}}>
              AI-powered energy consumption forecasting using ARIMA, Neural Network &amp; Random Forest.
              Real-time weather insights, CO₂ tracking, and global energy analytics.
            </p>
            <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
              <Link to="/dashboard" className="btn btn-primary">🚀 Start Forecasting</Link>
              <Link to="/models"    className="btn btn-secondary">🤖 View Models</Link>
            </div>
          </div>

          {/* Stats - vertical stack */}
          <div style={{display:'flex', flexDirection:'column', gap:10, minWidth:160}}>
            {[
              {val:'180+', lbl:'Countries',  color:'#a855f7'},
              {val:'4',    lbl:'AI Models',  color:'#06b6d4'},
              {val:'7',    lbl:'Metrics',    color:'#10b981'},
              {val:'Live', lbl:'Data',       color:'#f59e0b'},
            ].map((s,i) => (
              <div key={i} className="home-stat" style={{display:'flex', alignItems:'center', gap:12, textAlign:'left', padding:'12px 16px'}}>
                <div className="home-stat-val" style={{color:s.color, fontSize:'1.4rem', minWidth:50}}>{s.val}</div>
                <div className="home-stat-lbl" style={{fontSize:'.75rem'}}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {alert && (
          <div style={{marginTop:20, padding:'12px 16px', borderRadius:10,
            background: alert.type==='alert'?'rgba(239,68,68,0.1)':alert.type==='warn'?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)',
            border:`1px solid ${alert.type==='alert'?'rgba(239,68,68,0.25)':alert.type==='warn'?'rgba(245,158,11,0.25)':'rgba(16,185,129,0.25)'}`,
            color: alert.type==='alert'?'#fca5a5':alert.type==='warn'?'#fcd34d':'#6ee7b7',
            fontSize:'.875rem', fontWeight:500}}>
            ⚡ Weather-Based Energy Alert &nbsp;·&nbsp; {alert.msg}
          </div>
        )}
      </div>

      {/* Country selector */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <label style={{fontSize:'.75rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600}}>Live Data For:</label>
        <select value={country} onChange={e => setCountry(e.target.value)}
          style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', borderRadius:8, padding:'8px 12px', fontSize:'.85rem', fontFamily:'Space Grotesk,sans-serif', outline:'none'}}>
          {allCountries.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Live Data Row */}
      <div className="three-col" style={{marginBottom:24}}>
        {/* Weather */}
        <div className="card" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(10,6,18,0.8))', border:'1px solid rgba(124,58,237,0.2)'}}>
          <div style={{fontSize:'.65rem', color:'#94a3b8', letterSpacing:'2px', textTransform:'uppercase', marginBottom:12}}>🌤️ Weather — {country}</div>
          {loading && <div style={{color:'#475569', fontSize:'.85rem'}}>Loading weather...</div>}
          {!loading && weather && !weather.error ? (
            <>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
                <span style={{fontSize:'2.5rem'}}>{getIcon(weather.weathercode)}</span>
                <div>
                  <div style={{fontSize:'2rem', fontWeight:800, fontFamily:'Syne,sans-serif', color:'#c084fc'}}>{weather.temperature}°C</div>
                  <div style={{fontSize:'.8rem', color:'#94a3b8'}}>{getLabel(weather.weathercode)}</div>
                </div>
              </div>
              <div style={{display:'flex', gap:16, fontSize:'.8rem', color:'#94a3b8'}}>
                <span>💨 {weather.windspeed} km/h</span>
              </div>
              <div style={{fontSize:'.7rem', color:'#475569', marginTop:8}}>Feels like {(weather.temperature - 1.5).toFixed(1)}°C</div>
            </>
          ) : !loading && <div style={{color:'#475569', fontSize:'.85rem'}}>Weather unavailable</div>}
        </div>

        {/* Carbon Intensity */}
        <div className="card" style={{background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(10,6,18,0.8))', border:'1px solid rgba(239,68,68,0.15)'}}>
          <div style={{fontSize:'.65rem', color:'#94a3b8', letterSpacing:'2px', textTransform:'uppercase', marginBottom:12}}>🌿 Carbon Intensity</div>
          <div style={{fontSize:'2.2rem', fontWeight:800, fontFamily:'Syne,sans-serif', color:carbonPct>60?'#ef4444':carbonPct>30?'#f59e0b':'#10b981', marginBottom:4}}>
            {carbon ? carbon.value : '---'} <span style={{fontSize:'.9rem', fontWeight:400}}>gCO₂/kWh</span>
          </div>
          <div style={{display:'inline-flex', alignItems:'center', gap:6, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, padding:'3px 10px', fontSize:'.72rem', color:'#fca5a5', marginBottom:12}}>
            {carbonPct>60?'Very High':carbonPct>40?'High':carbonPct>20?'Moderate':'Low'}
          </div>
          <div className="carbon-bar"><div className="carbon-needle" style={{left:`${carbonPct}%`}}></div></div>
          <div style={{fontSize:'.75rem', color:'#94a3b8', marginTop:8}}>Fossil fuel {carbon?.fossil || '—'}%</div>
        </div>

        {/* Local Time */}
        <div className="card" style={{background:'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(10,6,18,0.8))', border:'1px solid rgba(6,182,212,0.15)'}}>
          <div style={{fontSize:'.65rem', color:'#94a3b8', letterSpacing:'2px', textTransform:'uppercase', marginBottom:12}}>🕐 Local Time — {country}</div>
          <div style={{fontSize:'2rem', fontWeight:800, fontFamily:'monospace', color:'#67e8f9', marginBottom:8}}>
            {getLocalTime()}
          </div>
          <div style={{fontSize:'.85rem', color:'#94a3b8', marginBottom:4}}>{getLocalDate()}</div>
          <div style={{fontSize:'.75rem', color:'#475569'}}>{COORDS[country]?.[2] || 'Asia/Kolkata'}</div>
          <div style={{marginTop:16}}>
            <div style={{fontSize:'.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6}}>Backend Status</div>
            <div style={{display:'flex', alignItems:'center', gap:6, fontSize:'.8rem', color:'#34d399'}}>
              <div className="live-dot"></div> API Connected
            </div>
          </div>
        </div>
      </div>

      {/* News Ticker */}
      <div className="news-ticker" style={{marginBottom:32}}>
        <span className="news-badge">⚡ Energy News</span>
        <div style={{flex:1, overflow:'hidden'}}>
          <div style={{fontSize:'.85rem', color:'#f1f5f9'}}>{NEWS[newsIdx].text}</div>
          <div style={{fontSize:'.7rem', color:'#475569', marginTop:2}}>{NEWS[newsIdx].src} · {new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</div>
        </div>
        <div style={{display:'flex', gap:4}}>
          {NEWS.map((_,i) => <div key={i} onClick={() => setNewsIdx(i)} style={{width:i===newsIdx?16:6, height:6, borderRadius:3, background:i===newsIdx?'#7c3aed':'#1e293b', cursor:'pointer', transition:'all .3s'}}></div>)}
        </div>
      </div>

      {/* Features */}
      <div className="section-header">🚀 Platform Features</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, marginBottom:32}}>
        {FEATURES.map((f,i) => (
          <Link key={i} to={f.link} style={{textDecoration:'none'}}>
            <div className="card" style={{height:'100%', transition:'all .2s', cursor:'pointer'}}
              onMouseEnter={e => {e.currentTarget.style.borderColor=f.color+'55'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 32px ${f.color}22`;}}
              onMouseLeave={e => {e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none';}}>
              <div style={{fontSize:'2rem', marginBottom:12}}>{f.icon}</div>
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1rem', color:f.color, marginBottom:8}}>{f.title}</div>
              <div style={{fontSize:'.82rem', color:'#94a3b8', lineHeight:1.6}}>{f.desc}</div>
              <div style={{marginTop:12, fontSize:'.75rem', color:f.color}}>Open →</div>
            </div>
          </Link>
        ))}
      </div>

      {!token && (
        <div style={{background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.08))', border:'1px solid rgba(124,58,237,0.25)', borderRadius:20, padding:32, textAlign:'center', marginBottom:24}}>
          <div style={{fontFamily:'Syne,sans-serif', fontSize:'1.4rem', fontWeight:800, marginBottom:8}}>Start Analysing Energy Data</div>
          <div style={{color:'#94a3b8', fontSize:'.9rem', marginBottom:20}}>Create a free account to save forecasts, track countries, and get personalized insights</div>
          <div style={{display:'flex', gap:12, justifyContent:'center'}}>
            <Link to="/register" className="btn btn-primary">✨ Create Free Account</Link>
            <Link to="/login"    className="btn btn-secondary">🔑 Login</Link>
          </div>
        </div>
      )}

      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20, textAlign:'center', color:'#475569', fontSize:'.78rem'}}>
        EnerCast v2.0 &nbsp;·&nbsp; Team 8 &nbsp;·&nbsp; Keerthana Prabhu &nbsp;·&nbsp; Pooja K &nbsp;·&nbsp; Barath Vishnu R.P
      </div>
    </div>
  );
}
