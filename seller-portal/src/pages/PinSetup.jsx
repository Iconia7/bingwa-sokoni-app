import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { portalAuth } from '../services/api';
import { ShieldCheck, ArrowLeft, CheckCircle, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PinSetup() {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!phone) { navigate('/login'); return null; }

  const handleSetup = async (e) => {
    e.preventDefault();
    if (pin.length < 4) return setError('PIN must be at least 4 digits.');
    if (pin !== confirmPin) return setError('PINs do not match. Please try again.');
    setLoading(true); setError('');
    try {
      const { data } = await portalAuth.setPin(phone, pin);
      if (data.success) { setSuccess(true); setTimeout(() => navigate('/login'), 2600); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set PIN. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--cream)',
      backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(74,124,89,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(201,168,76,0.05) 0%, transparent 60%)',
    }}>
      {/* Decorative background shapes */}
      <div style={{
        position: 'fixed', top: '10%', left: '5%',
        width: '200px', height: '200px',
        border: '1px solid rgba(74,124,89,0.08)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '5%',
        width: '150px', height: '150px',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: '420px', padding: '0 16px' }}
          >
            {/* Logo mark */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'var(--forest)',
                borderRadius: '12px', padding: '10px 18px',
              }}>
                <Leaf size={16} color='var(--gold)' fill='var(--gold)' />
                <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>Bingwa Portal</span>
              </div>
            </div>

            <div className="card" style={{ padding: '40px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '56px', height: '56px',
                  background: 'var(--sage-light)',
                  borderRadius: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  color: 'var(--sage)',
                }}>
                  <ShieldCheck size={28} />
                </div>
                <h1 style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: '1.75rem', color: 'var(--forest)', marginBottom: '8px',
                }}>
                  Set your PIN
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  Create a secure PIN for <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{phone}</span>
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--red-light)', color: 'var(--red)',
                    border: '1px solid rgba(192,57,43,0.15)',
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem', fontWeight: 500,
                    marginBottom: '20px',
                  }}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '8px',
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                  }}>New PIN</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="4 – 6 digits"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.3rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block', fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '8px',
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                  }}>Confirm PIN</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Repeat your PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={6}
                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.3rem' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', height: '52px', marginTop: '8px', borderRadius: 'var(--radius-sm)' }}
                  disabled={loading}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
                      </svg>
                      Saving PIN...
                    </span>
                  ) : 'Save PIN & Continue'}
                </button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: '12px', height: '44px' }}
              >
                <ArrowLeft size={15} />
                Back to Login
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="card"
            style={{
              padding: '60px 48px', textAlign: 'center',
              maxWidth: '380px', width: '100%',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ marginBottom: '24px' }}
            >
              <div style={{
                width: '72px', height: '72px',
                background: 'var(--sage-light)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--sage)',
              }}>
                <CheckCircle size={36} />
              </div>
            </motion.div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '1.75rem', color: 'var(--forest)',
              marginBottom: '10px'
            }}>PIN Created!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Your portal PIN has been set successfully.<br />Redirecting you to login…
            </p>
            <div style={{
              marginTop: '28px', height: '3px',
              background: 'var(--cream-dark)', borderRadius: '2px', overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
                style={{ height: '100%', background: 'var(--sage)', borderRadius: '2px' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}