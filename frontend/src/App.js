import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Models from './pages/Models';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import WorldMap from './pages/WorldMap';
import Admin from './pages/Admin';
import GridLive from './pages/GridLive';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const handleLogin = (tok, user) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('username', user);
    setToken(tok); setUsername(user);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null); setUsername(null);
  };
  return (
    <Router>
      <div className="app">
        <Navbar token={token} username={username} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/models" element={<Models />} />
            <Route path="/login" element={token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
            <Route path="/register" element={token ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
            <Route path="/profile" element={token ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/map" element={<WorldMap />} />
            <Route path="/grid" element={<GridLive />} />
            <Route path="/admin" element={token ? <Admin token={token} /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
