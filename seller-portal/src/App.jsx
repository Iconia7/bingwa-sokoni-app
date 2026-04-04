import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PinSetup from './pages/PinSetup';
import Transactions from './pages/Transactions';
import Coupons from './pages/Coupons';
import { Toaster } from 'react-hot-toast';
import './index.css';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('sellerUser');
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1b3022',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 20px',
            border: '1px solid rgba(201,168,76,0.2)'
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-pin" element={<PinSetup />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <PrivateRoute>
              <Transactions />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/coupons" 
          element={
            <PrivateRoute>
              <Coupons />
            </PrivateRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
