import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAuth } from '../services/api';
import { Lock, Phone, ArrowRight, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await portalAuth.login(phone, pin);
      if (data.success) {
        if (data.isFirstTime) {
          navigate('/setup-pin', { state: { phone } });
        } else {
          localStorage.setItem('sellerUser', JSON.stringify(data.user));
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-on-mobile" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily: "'DM Sans', sans-serif",
      background: 'var(--cream)',
      backgroundImage: 'radial-gradient(ellipse at 10% 0%, rgba(74,124,89,0.07) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(201,168,76,0.05) 0%, transparent 55%)',
    }}>

      {/* ---- Left decorative panel ---- */}
      <div className="hide-on-mobile" style={{
        background: 'var(--forest)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* ... decorative elements ... */}
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '200px', height: '200px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '280px', height: '280px', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '120px', right: '40px', width: '100px', height: '100px', background: 'rgba(201,168,76,0.08)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '10px 18px',
          }}>
            <Leaf size={18} color='var(--gold)' fill='var(--gold)' />
            <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
              Bingwa Portal
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
            color: 'white',
            lineHeight: 1.2,
            marginBottom: '20px',
          }}>
            Remote control,<br />
            <em style={{ color: 'var(--gold)' }}>at your fingertips.</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', maxWidth: '280px', lineHeight: 1.7 }}>
            Manage your Bingwa Sokoni device, track orders, and issue commands — anywhere, anytime.
          </p>
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', gap: '24px',
        }}>
          {[['99.9%', 'Uptime'], ['0s', 'Latency'], ['Secure', 'Access']].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', color: 'white', fontWeight: 400 }}>{val}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Right login form ---- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: '380px' }}
        >
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '2rem',
              color: 'var(--forest)',
              marginBottom: '8px',
            }}>
              Sign in
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Enter your credentials to access your seller portal.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--red-light)',
                color: 'var(--red)',
                border: '1px solid rgba(192,57,43,0.15)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '24px',
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.82rem', fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px', letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="tel"
                  className="input-field"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.82rem', fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px', letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}>
                Portal PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="password"
                  className="input-field"
                  placeholder="• • • •"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ paddingLeft: '44px', letterSpacing: '6px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '52px', marginTop: '8px', fontSize: '0.95rem', borderRadius: 'var(--radius-sm)' }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <>Enter Portal <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button 
              onClick={() => navigate('/setup-pin', { state: { phone } })}
              style={{ 
                background: 'none', border: 'none', 
                color: 'var(--sage)', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              New seller? Set up your Portal PIN
            </button>
          </div>

          <p style={{
            textAlign: 'center', marginTop: '40px',
            fontSize: '0.78rem', color: 'var(--text-muted)',
            lineHeight: 1.7
          }}>
            Bingwa Sokoni Portal<br />
            <span style={{ color: 'var(--cream-border)' }}>—</span>{' '}
            Powered by <strong style={{ color: 'var(--sage)', fontWeight: 600 }}>Nexora Creative Solutions</strong>
          </p>
        </motion.div>
      </div>

    </div>
  );
}