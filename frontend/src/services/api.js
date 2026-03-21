import axios from 'axios';

const API = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api',
  timeout: 300000
});

const LSTM_API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api',
  timeout: 600000
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

LSTM_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCountries         = ()                   => API.get('/countries');
export const getMetrics           = ()                   => API.get('/metrics');
export const getHistorical        = (c, m)               => API.get(`/historical?country=${c}&metric=${m}`);
export const getEnergyMix         = (c)                  => API.get(`/energy-mix?country=${c}`);
export const getGDPPop            = (c)                  => API.get(`/gdp-population?country=${c}`);
export const getInsights          = (c, m)               => API.get(`/insights?country=${c}&metric=${m}`);
export const getAnomalies         = (c, m)               => API.get(`/anomalies?country=${c}&metric=${m}`);
export const compareCountries     = (c1, c2, m)          => API.get(`/compare-countries?country1=${c1}&country2=${c2}&metric=${m}`);

export const forecastARIMA        = (c, m, y, p, d, q)  => API.get(`/forecast/arima?country=${c}&metric=${m}&years=${y}&p=${p}&d=${d}&q=${q}`);
export const forecastLinear       = (c, m, y)            => API.get(`/forecast/linear?country=${c}&metric=${m}&years=${y}`);
export const forecastRF           = (c, m, y)            => API.get(`/forecast/randomforest?country=${c}&metric=${m}&years=${y}`);
export const forecastLSTM         = (c, m, y)            => LSTM_API.get(`/forecast/lstm?country=${c}&metric=${m}&years=${y}`);
export const compareModels        = (c, m, y)            => LSTM_API.get(`/forecast/compare?country=${c}&metric=${m}&years=${y}`);

export const login                = (data)               => API.post('/auth/login', data);
export const register             = (data)               => API.post('/auth/register', data);
export const getProfile           = ()                   => API.get('/auth/profile');
export const saveForecast         = (data)               => API.post('/forecast/save', data);
export const getUserStats         = ()                   => API.get('/auth/stats');
export const deleteForecast       = (id)                 => API.delete(`/forecast/${id}`);
export const changePassword       = (data)               => API.post('/auth/change-password', data);

export const getWeatherByCountry  = (country)            => API.get(`/weather?country=${country}`);
export const getNews              = (country)            => API.get(`/news?country=${country}`);
export const getCO2               = (code)               => API.get(`/co2?country=${country}`);
export const getEnergyPrices      = ()                   => API.get('/energy-prices');

export default API;
export const sendTestAlert     = ()     => API.post('/alerts/test');
export const sendForecastAlert = (data) => API.post('/alerts/forecast', data);
