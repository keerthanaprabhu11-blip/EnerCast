import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import API from '../services/api';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COUNTRY_NAME_MAP = {
  'United States of America':'United States',
  'Russian Federation':'Russia',
  'Czech Republic':'Czechia',
  'Republic of Korea':'South Korea',
  'Dem. Rep. Congo':'Democratic Republic of Congo',
  'Congo':'Congo',
  'Tanzania':'Tanzania',
  'Iran':'Iran',
  'Syria':'Syria',
  'Vietnam':'Vietnam',
  'Laos':'Laos',
  'Bolivia':'Bolivia',
  'Venezuela':'Venezuela',
  'W. Sahara':'Western Sahara',
  'Central African Rep.':'Central African Republic',
  'Dominican Rep.':'Dominican Republic',
  'Eq. Guinea':'Equatorial Guinea',
  'Solomon Is.':'Solomon Islands',
  'Fr. S. Antarctic Lands':'French Southern Territories',
  'Falkland Is.':'Falkland Islands',
  'Myanmar':'Myanmar',
  'North Korea':'North Korea',
  'South Korea':'South Korea',
  'Taiwan':'Taiwan',
  'Somaliland':'Somalia',
  'Kosovo':'Kosovo',
  'United States of America':'United States',
  'Russian Federation':'Russia',
  'Czech Republic':'Czechia',
  'South Korea':'South Korea',
  'Republic of Korea':'South Korea',
  'Democratic Republic of the Congo':'Democratic Republic of Congo',
  'Republic of the Congo':'Congo',
  'United Republic of Tanzania':'Tanzania',
  'Iran (Islamic Republic of)':'Iran',
  'Syrian Arab Republic':'Syria',
  'Viet Nam':'Vietnam',
  'Lao PDR':'Laos',
  'Bolivia (Plurinational State of)':'Bolivia',
  'Venezuela (Bolivarian Republic of)':'Venezuela',
  'Trinidad and Tobago':'Trinidad and Tobago',
  'United Arab Emirates':'United Arab Emirates',
  'Saudi Arabia':'Saudi Arabia',
  'Myanmar':'Myanmar',
  'North Korea':'North Korea',
  'Taiwan':'Taiwan',
};

export default function WorldMap() {
  const [metric,    setMetric]    = useState('primary_energy_consumption');
  const [year,      setYear]      = useState(2022);
  const [data,      setData]      = useState({});
  const [loading,   setLoading]   = useState(true);
  const [tooltip,   setTooltip]   = useState(null);

  const METRICS = {
    primary_energy_consumption: 'Primary Energy (TWh)',
    co2:                        'CO₂ Emissions (Mt)',
    renewables_share_energy:    'Renewables Share (%)',
    fossil_share_energy:        'Fossil Fuel Share (%)',
    electricity_generation:     'Electricity Generation (TWh)',
  };

  useEffect(() => {
    setLoading(true);
    API.get(`/map-data?metric=${metric}&year=${year}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [metric, year]);

  const values = Object.values(data).filter(v => v > 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const colorScale = scaleLinear()
    .domain([minVal, minVal + (maxVal-minVal)*0.1, minVal + (maxVal-minVal)*0.3, maxVal])
    .range(['#1a2f55', '#1d4ed8', '#f0b429', '#ef4444']);

  const getCountryValue = (geoName) => {
    if (data[geoName]) return data[geoName];
    const mapped = COUNTRY_NAME_MAP[geoName];
    if (mapped && data[mapped]) return data[mapped];
    // fuzzy match
    const lower = geoName.toLowerCase();
    const key = Object.keys(data).find(k => k.toLowerCase() === lower);
    return key ? data[key] : null;
  };

  return (
    <div>
      <div className="page-title">🗺️ World Energy Map</div>
      <div className="page-subtitle">Global energy data visualized across countries</div>

      {/* Controls */}
      <div className="controls" style={{ marginBottom:20 }}>
        <div className="control-group">
          <label>📊 Metric</label>
          <select value={metric} onChange={e => setMetric(e.target.value)} style={{ width:240 }}>
            {Object.entries(METRICS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>📅 Year: {year}</label>
          <input type="range" min={1990} max={2022} value={year}
            onChange={e => setYear(+e.target.value)} style={{ width:200 }} />
        </div>
        {loading && <div style={{ color:'#4ade80', fontSize:13, alignSelf:'center' }}>⏳ Loading data...</div>}
      </div>

      {/* Map */}
      <div className="card" style={{ padding:0, overflow:'hidden', position:'relative' }}>
        <ComposableMap projectionConfig={{ scale: 147 }} style={{ width:'100%', height:'500px', background:'#060d13' }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const name  = geo.properties.name;
                  const value = getCountryValue(name);
                  const fill  = value ? colorScale(value) : '#1a2332';
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#0a1520"
                      strokeWidth={0.5}
                      style={{
                        default:  { outline:'none' },
                        hover:    { outline:'none', fill: value ? '#60a5fa' : '#1f2d3d', cursor:'pointer' },
                        pressed:  { outline:'none' },
                      }}
                      onMouseEnter={(e) => {
                        setTooltip({ name, value, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:'fixed', left: tooltip.x+12, top: tooltip.y-40,
            background:'#0d1e2e', border:'1px solid #1a3a2a', borderRadius:8,
            padding:'8px 14px', fontSize:13, pointerEvents:'none', zIndex:1000,
            boxShadow:'0 4px 20px rgba(0,0,0,.5)',
          }}>
            <div style={{ fontWeight:600, color:'#f0f4f8' }}>{tooltip.name}</div>
            <div style={{ color:'#4ade80', marginTop:2 }}>
              {tooltip.value ? `${tooltip.value.toFixed(1)} ${METRICS[metric].split('(')[1]?.replace(')','') || ''}` : 'No data'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop:16, display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:13, color:'#9ca3af' }}>Low</span>
        <div style={{
          flex:1, height:12, borderRadius:6,
          background:'linear-gradient(90deg, #0f2a1a, #4ade80)',
        }}/>
        <span style={{ fontSize:13, color:'#9ca3af' }}>High</span>
        <span style={{ fontSize:12, color:'#6b7280', marginLeft:16 }}>
          Range: {minVal.toFixed(0)} – {maxVal.toFixed(0)}
        </span>
        <span style={{ fontSize:12, color:'#4b5563' }}>Gray = no data</span>
      </div>

      {/* Top 10 Table */}
      <div className="section-header">🏆 Top 10 Countries — {METRICS[metric]}</div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>Country</th><th>{METRICS[metric]}</th><th>Share</th></tr>
          </thead>
          <tbody>
            {Object.entries(data)
              .sort((a,b) => b[1]-a[1])
              .slice(0,10)
              .map(([country, value], i) => (
                <tr key={country}>
                  <td style={{ color:'#6b7280' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </td>
                  <td style={{ fontWeight:500 }}>🌍 {country}</td>
                  <td style={{ color:'#4ade80', fontWeight:600 }}>{value.toFixed(1)}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ background:'#0a1520', borderRadius:4, height:6, width:100, overflow:'hidden' }}>
                        <div style={{ width:`${(value/maxVal*100).toFixed(0)}%`, height:'100%',
                          background:'linear-gradient(90deg,#4ade80,#60a5fa)', borderRadius:4 }}/>
                      </div>
                      <span style={{ fontSize:12, color:'#9ca3af' }}>{(value/maxVal*100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
