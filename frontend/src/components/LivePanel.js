import React, { useState, useEffect } from 'react';
import { getWeatherByCountry, getNews, getCO2, getEnergyPrices } from '../services/api';

const COUNTRY_CODES = {
  'India':'IN','United States':'US','China':'CN','Germany':'DE',
  'France':'FR','Brazil':'BR','Australia':'AU','United Kingdom':'GB',
  'Japan':'JP','Canada':'CA','Russia':'RU','South Korea':'KR',
};

const weatherIcon = (desc='') => {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('overcast') || d.includes('cloudy')) return '☁️';
  if (d.includes('partly')) return '⛅';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  return '☀️';
};

const co2Color = (i) => i < 150 ? '#4ade80' : i < 350 ? '#fbbf24' : i < 550 ? '#f97316' : '#ef4444';
const co2Label = (i) => i < 150 ? 'Very Clean' : i < 350 ? 'Moderate' : i < 550 ? 'High' : 'Very High';

function Skeleton() {
  return <div style={{
    background:'linear-gradient(90deg,#0d1e2e 25%,#122030 50%,#0d1e2e 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite',
    borderRadius:12, height:160,
  }}/>;
}

export default function LivePanel({ country }) {
  const [weather,    setWeather]    = useState(null);
  const [news,       setNews]       = useState(null);
  const [co2,        setCo2]        = useState(null);
  const [prices,     setPrices]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [newsIndex,  setNewsIndex]  = useState(0);


  useEffect(() => {
    if (!country) return;
    setLoading(true);
    setNewsIndex(0);
    setWeather(null); setNews(null); setCo2(null); setPrices(null);
    const code = COUNTRY_CODES[country] || 'IN';
    Promise.allSettled([
      getWeatherByCountry(country),
      getNews(country),
      getCO2(code),
      getEnergyPrices(),
    ]).then(([w, n, c, p]) => {
      if (w.status === 'fulfilled') setWeather(w.value.data);
      if (n.status === 'fulfilled') setNews(n.value.data);
      if (c.status === 'fulfilled') setCo2(c.value.data);
      if (p.status === 'fulfilled') setPrices(p.value.data);
      setLoading(false);
    });
  }, [country]);

  useEffect(() => {
    if (!news?.articles?.length) return;
    const t = setInterval(() => setNewsIndex(i => (i+1) % news.articles.length), 5000);
    return () => clearInterval(t);
  }, [news]);

  return (
    <div style={{ marginBottom:24 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        .live-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; }
        .lcard { background:#0d1e2e; border:1px solid #1a3a2a; border-radius:12px; padding:16px; animation:fadeIn .4s ease; }
        .lcard h4 { margin:0 0 10px; font-size:10px; text-transform:uppercase; letter-spacing:1.2px; color:#4b5563; }
        .rec-box { padding:8px 12px; border-radius:8px; font-size:12px; margin-bottom:6px; line-height:1.5; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:8,height:8,borderRadius:'50%',background:'#4ade80',
          boxShadow:'0 0 6px #4ade80', animation:'pulse 2s infinite' }}/>
        <span style={{ fontSize:11,color:'#6b7280',letterSpacing:1 }}>
          LIVE DATA — {country?.toUpperCase()}
        </span>

      </div>

      {/* Weather Recommendations — always visible */}
      {weather?.recommendations?.length > 0 && (
        <div style={{ marginBottom:14, animation:'fadeIn .3s ease' }}>
          <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase',
            letterSpacing:1, marginBottom:8 }}>⚡ Weather-based Energy Alerts</div>
          {weather.recommendations.map((r,i) => (
            <div key={i} className="rec-box" style={{
              background: r.type==='alert' ? '#2a1a1a' : r.type==='success' ? '#0f2a1a' : '#1a2a1a',
              borderLeft: `3px solid ${r.type==='alert'?'#ef4444':r.type==='success'?'#4ade80':'#fbbf24'}`,
              color: r.type==='alert' ? '#fca5a5' : r.type==='success' ? '#86efac' : '#fde68a',
            }}>
              {r.type==='alert'?'🔴':r.type==='success'?'✅':'⚠️'} {r.text}
            </div>
          ))}
        </div>
      )}

      <div className="live-grid">
        {/* Weather */}
        {loading ? <Skeleton/> : weather ? (
          <div className="lcard">
            <h4>🌤 Weather — {weather.city}</h4>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:38 }}>{weatherIcon(weather.description)}</span>
              <div>
                <div style={{ fontSize:30,fontWeight:700,color:'#f0f4f8' }}>{weather.temp}°C</div>
                <div style={{ fontSize:12,color:'#9ca3af' }}>{weather.description}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:14, marginTop:10, fontSize:12, color:'#6b7280' }}>
              <span>💧 {weather.humidity}%</span>
              <span>💨 {weather.wind_speed} m/s</span>
              <span>👁 {weather.visibility}km</span>
            </div>
            <div style={{ fontSize:11,color:'#374151',marginTop:6 }}>
              Feels like {weather.feels_like}°C
            </div>
          </div>
        ) : null}

        {/* CO2 */}
        {loading ? <Skeleton/> : co2 ? (
          <div className="lcard">
            <h4>🌿 Carbon Intensity</h4>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <span style={{ fontSize:30,fontWeight:700, color:co2Color(co2.intensity) }}>
                {co2.intensity}
              </span>
              <span style={{ fontSize:12,color:'#6b7280',marginBottom:5 }}>gCO₂/kWh</span>
            </div>
            <span style={{
              display:'inline-block', marginTop:8, padding:'2px 10px', borderRadius:20,
              fontSize:11, fontWeight:600,
              background: co2Color(co2.intensity)+'22',
              color: co2Color(co2.intensity),
              border:`1px solid ${co2Color(co2.intensity)}44`,
            }}>{co2Label(co2.intensity)}</span>
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11,color:'#6b7280',marginBottom:4 }}>
                Fossil fuel {co2.fossil_pct?.toFixed(1)}%
              </div>
              <div style={{ background:'#0a1520',borderRadius:4,height:5,overflow:'hidden' }}>
                <div style={{ width:`${co2.fossil_pct}%`,height:'100%',
                  background:'linear-gradient(90deg,#4ade80,#ef4444)',borderRadius:4 }}/>
              </div>
            </div>
            {co2.source==='estimated' && (
              <div style={{ fontSize:10,color:'#374151',marginTop:6 }}>* estimated</div>
            )}
          </div>
        ) : null}

        {/* Energy Price */}
        {loading ? <Skeleton/> : prices ? (
          <div className="lcard">
            <h4>⚡ Energy Price (US)</h4>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <span style={{ fontSize:30,fontWeight:700,color:'#fbbf24' }}>
                {prices.price?.toFixed(2)}
              </span>
              <span style={{ fontSize:12,color:'#6b7280',marginBottom:5 }}>{prices.unit}</span>
            </div>
            <div style={{ fontSize:12,color:'#6b7280',marginTop:10 }}>📅 {prices.period}</div>
            <div style={{ fontSize:12,color:'#6b7280' }}>🗂 {prices.source}</div>
            {prices.source==='estimated' && (
              <div style={{ fontSize:10,color:'#374151',marginTop:6 }}>* EIA key activating</div>
            )}
          </div>
        ) : null}

        {/* Live Clock */}
        <div className="lcard">
          <h4>🕐 Local Time</h4>
          <LiveClock country={country}/>
        </div>
      </div>

      {/* News Ticker */}
      {!loading && news?.articles?.length > 0 && (
        <div style={{ background:'#0d1e2e',border:'1px solid #1a3a2a',borderRadius:12,
          padding:'12px 18px',marginTop:14,animation:'fadeIn .4s ease' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:11,color:'#4ade80',fontWeight:600,whiteSpace:'nowrap' }}>
              📰 ENERGY NEWS
            </span>
            <div style={{ width:1,height:16,background:'#1a3a2a' }}/>
            <div key={newsIndex} style={{ flex:1,overflow:'hidden',animation:'fadeIn .5s ease' }}>
              <a href={news?.articles?.[newsIndex]?.url} target="_blank" rel="noreferrer"
                style={{ color:'#e5e7eb',fontSize:13,textDecoration:'none',
                  display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                {news?.articles?.[newsIndex]?.title}
              </a>
              <div style={{ fontSize:11,color:'#6b7280',marginTop:2 }}>
                {news?.articles?.[newsIndex]?.source} · {new Date(news?.articles?.[newsIndex]?.publishedAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display:'flex',gap:4 }}>
              {news.articles.map((_,i) => (
                <div key={i} onClick={() => setNewsIndex(i)} style={{
                  width:i===newsIndex?16:6, height:6, borderRadius:3,
                  background:i===newsIndex?'#4ade80':'#1a3a2a',
                  cursor:'pointer', transition:'all .3s',
                }}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TIMEZONES = {
  'India':'Asia/Kolkata','United States':'America/New_York','China':'Asia/Shanghai',
  'Germany':'Europe/Berlin','France':'Europe/Paris','Brazil':'America/Sao_Paulo',
  'Australia':'Australia/Sydney','United Kingdom':'Europe/London','Japan':'Asia/Tokyo',
  'Canada':'America/Toronto','Russia':'Europe/Moscow','South Korea':'Asia/Seoul',
  'Italy':'Europe/Rome','Spain':'Europe/Madrid','Mexico':'America/Mexico_City',
  'Indonesia':'Asia/Jakarta','Saudi Arabia':'Asia/Riyadh','Turkey':'Europe/Istanbul',
  'Argentina':'America/Argentina/Buenos_Aires','South Africa':'Africa/Johannesburg',
};

function LiveClock({ country }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tz = TIMEZONES[country] || 'UTC';
  return (
    <div>
      <div style={{ fontSize:26,fontWeight:700,color:'#f0f4f8',fontVariantNumeric:'tabular-nums' }}>
        {time.toLocaleTimeString('en-US', { timeZone:tz, hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </div>
      <div style={{ fontSize:12,color:'#9ca3af',marginTop:4 }}>
        {time.toLocaleDateString('en-US', { timeZone:tz, weekday:'short', month:'short', day:'numeric' })}
      </div>
      <div style={{ fontSize:11,color:'#4b5563',marginTop:2 }}>{tz}</div>
    </div>
  );
}
