import React, { useEffect, useState } from "react";
import {
  getCountries,
  getMetrics,
  getHistorical,
  getEnergyMix
} from "../services/api";

function Dashboard() {

  const [countries, setCountries] = useState([]);
  const [metrics, setMetrics] = useState([]);

  const [country, setCountry] = useState("");
  const [metric, setMetric] = useState("");

  const [historicalData, setHistoricalData] = useState([]);
  const [energyMix, setEnergyMix] = useState(null);

  const [loading, setLoading] = useState(false);


  /* Load Countries & Metrics */
  useEffect(() => {

    async function loadInitialData() {

      try {

        const countryRes = await getCountries();
        const metricRes = await getMetrics();

        setCountries(countryRes.data || []);
        setMetrics(metricRes.data || []);

      } catch (error) {

        console.error("Error loading initial data:", error);

      }
    }

    loadInitialData();

  }, []);



  /* Load historical data */
  const loadHistorical = async () => {

    if (!country || !metric) return;

    setLoading(true);

    try {

      const res = await getHistorical(country, metric);

      setHistoricalData(res.data || []);

      const mixRes = await getEnergyMix(country);
      setEnergyMix(mixRes.data || {});

    } catch (error) {

      console.error("Error loading historical data:", error);

    }

    setLoading(false);

  };



  return (
    <div style={{ padding: "30px" }}>

      <h1>⚡ EnerCast Dashboard</h1>

      <hr />


      {/* COUNTRY SELECT */}

      <div style={{ marginBottom: "20px" }}>

        <label>Select Country:</label>
        <br />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >

          <option value="">-- Select Country --</option>

          {countries.map((c, index) => (
            <option key={index} value={c}>
              {c}
            </option>
          ))}

        </select>

      </div>



      {/* METRIC SELECT */}

      <div style={{ marginBottom: "20px" }}>

        <label>Select Metric:</label>
        <br />

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >

          <option value="">-- Select Metric --</option>

          {metrics.map((m, index) => (
            <option key={index} value={m}>
              {m}
            </option>
          ))}

        </select>

      </div>



      {/* LOAD DATA BUTTON */}

      <button onClick={loadHistorical}>
        Load Data
      </button>



      {loading && <p>Loading data...</p>}



      <hr />


      {/* HISTORICAL DATA */}

      <h2>Historical Energy Data</h2>

      {historicalData && historicalData.length > 0 ? (

        <table border="1" cellPadding="8">

          <thead>

            <tr>
              <th>Year</th>
              <th>Value</th>
            </tr>

          </thead>

          <tbody>

            {historicalData.map((item, index) => (

              <tr key={index}>

                <td>{item.year}</td>
                <td>{item[metric]}</td>

              </tr>

            ))}

          </tbody>

        </table>

      ) : (

        <p>No data available</p>

      )}



      <hr />


      {/* ENERGY MIX */}

      <h2>Energy Mix</h2>

      {energyMix ? (

        Object.entries(energyMix).map(([key, value]) => (

          <div key={key}>

            <strong>{key}</strong>: {value}

          </div>

        ))

      ) : (

        <p>No energy mix data</p>

      )}

    </div>
  );
}

export default Dashboard;
