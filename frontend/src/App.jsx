import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  const { isAuthenticated } = useApp();

  return (
    <Suspense fallback={<div style={{ background: '#020408', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Initializing STADTWERKE X...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Suspense>
  );
}

export default App;
