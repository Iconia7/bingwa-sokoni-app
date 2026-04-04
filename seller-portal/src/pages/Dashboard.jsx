import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deviceApi, promoApi } from '../services/api';
import {
  Battery, Signal, Smartphone, RefreshCcw, History,
  Zap, LogOut, ArrowUpRight, Leaf, ChevronRight,
  BatteryCharging, Wifi, ShoppingCart, TrendingUp,
  Ticket, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// ---- Tiny Stat Card ----
function StatCard({ icon, label, value, badge, badgeType = 'success', footer, accent = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="card"
      style={{
        padding: '28px',
        background: accent ? 'var(--forest)' : 'var(--white)',
        color: accent ? 'white' : 'var(--text-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {accent && (
        <>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '80px', height: '80px', background: 'rgba(201,168,76,0.08)', borderRadius: '50%' }} />
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{
          width: '44px', height: '44px',
          background: accent ? 'rgba(255,255,255,0.1)' : 'var(--sage-light)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? 'white' : 'var(--sage)',
        }}>
          {icon}
        </div>
        {badge && (
          <span className={`badge badge-${badgeType}`} style={accent ? { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' } : {}}>
            <span style={{
              width: 6, height: 6, background: 'currentColor', borderRadius: '50%',
              opacity: 0.8, display: 'inline-block'
            }} />
            {badge}
          </span>
        )}
      </div>
      <div>
        <div style={{
          fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
          fontFamily: "'DM Serif Display', serif",
          color: accent ? 'white' : 'var(--forest)',
          lineHeight: 1.1, marginBottom: '4px'
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: accent ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
          letterSpacing: '0.03em', textTransform: 'uppercase'
        }}>
          {label}
        </div>
      </div>
      {footer}
    </motion.div>
  );
}

// ---- Offer Item ----
function OfferItem({ offer, onBuy }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--cream-border)',
      background: 'var(--cream)',
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'var(--sage-light)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sage)',
        }}>
          <Zap size={16} fill="currentColor" />
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{offer.planName}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>KES {offer.amount}</div>
        </div>
      </div>
      <button
        className="btn btn-primary"
        style={{ padding: '8px 16px', fontSize: '0.8rem', height: '36px', borderRadius: '10px' }}
        onClick={onBuy}
      >
        Buy <ArrowUpRight size={13} />
      </button>
    </div>
  );
}

// ============== MODALS ==============
function PurchaseModal({ isOpen, onClose, onConfirm, offer }) {
  const [phone, setPhone] = useState('');
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(20,24,20,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="card"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', padding: '32px', background: 'white' }}
          >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: 'var(--forest)' }}>Complete Purchase</h2>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '4px', borderRadius: '50%' }}>
              <RefreshCcw size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
          
          <div style={{ background: 'var(--sage-light)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Zap size={20} color="var(--sage)" />
             <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{offer?.planName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--sage)', fontWeight: 600 }}>KES {offer?.amount}</div>
             </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.03em' }}>
              RECIPIENT PHONE NUMBER
            </label>
            <input
              autoFocus
              type="tel"
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" style={{ flex: 1, height: '52px' }} onClick={onClose}>Cancel</button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 2, height: '52px', fontSize: '1rem' }} 
              onClick={() => { onConfirm(phone); setPhone(''); }}
              disabled={!phone.trim()}
            >
              Confirm Purchase
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============== DASHBOARD ==============
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [deviceState, setDeviceState] = useState(null);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  
  // Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedSim, setSelectedSim] = useState(0); // 0 = SIM 1, 1 = SIM 2

  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (isPolling && pollingCount < 7) { 
      interval = setInterval(() => {
        setPollingCount(prev => prev + 1);
        fetchDashboardData(true); 
      }, 3000);
    } else {
      setIsPolling(false);
      setPollingCount(0);
      setRefreshing(false);
    }
    return () => clearInterval(interval);
  }, [isPolling, pollingCount]);

  const fetchDashboardData = async (isSilent = false) => {
    const seller = JSON.parse(localStorage.getItem('sellerUser'));
    if (!seller) { navigate('/login'); return; }
    setUser(seller);
    if (!isSilent) setRefreshing(true);
    try {
      const { data } = await deviceApi.getDeviceData(seller.userId);
      if (data.success) {
        setDeviceData(data.user);
        setTodayTransactions(data.todayTransactions || []); // Fixed mapping
        setDeviceState(data.user?.deviceState || {});
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!isSilent || !isPolling) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleIssueCommand = async (type, payload = {}) => {
    setRefreshing(true);
    try {
      await deviceApi.issueCommand(user.userId, type, payload);
      toast.success(`Sync started: ${type === 'BALANCE_CHECK' ? 'Updating Airtime' : 'Procesing...'}`);
      setIsPolling(true);
      setPollingCount(0);
      setIsPurchaseModalOpen(false);
    } catch { 
      toast.error('Failed to issue command.'); 
      setRefreshing(false); 
    }
  };

  const logout = () => { localStorage.removeItem('sellerUser'); navigate('/login'); };

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: '16px',
      background: 'var(--cream)',
    }}>
      <div style={{
        width: '52px', height: '52px',
        background: 'var(--forest)', borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Leaf size={24} color='var(--gold)' fill='var(--gold)' />
      </div>
      <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
        CONNECTING TO DEVICE…
      </p>
    </div>
  );

  const {
    availableOffers = [],
  } = deviceData || {};

  const successCount = todayTransactions.filter(t => t.status === 'Success').length;
  const failCount = todayTransactions.length - successCount;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      backgroundImage: 'radial-gradient(ellipse at 5% 0%, rgba(74,124,89,0.05) 0%, transparent 50%), radial-gradient(ellipse at 95% 100%, rgba(201,168,76,0.04) 0%, transparent 50%)',
    }}>

      {/* ===== NAVBAR ===== */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(250,248,245,0.88)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--cream-border)',
          padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '68px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--forest)', borderRadius: '10px',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Leaf size={16} color='var(--gold)' fill='var(--gold)' />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Bingwa Portal</div>
            <div className="hide-on-mobile" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {user?.phoneNumber}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="hide-on-mobile" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px',
            background: 'var(--sage-light)',
            borderRadius: '999px',
            fontSize: '0.7rem', fontWeight: 600, color: 'var(--sage)',
          }}>
            <span style={{ width: 6, height: 6, background: 'var(--sage)', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
            Live
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.75rem', height: '34px' }}
            onClick={() => { setRefreshing(true); fetchDashboardData(); }}
            disabled={refreshing}
          >
            <RefreshCcw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hide-on-mobile">Sync</span>
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.75rem', height: '34px', color: 'var(--gold)', borderColor: 'var(--gold)' }}
            onClick={() => navigate('/coupons')}
          >
            <Ticket size={12} />
            <span className="hide-on-mobile">Coupons</span>
          </button>
          <button
            className="btn btn-danger-ghost"
            style={{ padding: '6px 10px', fontSize: '0.75rem', height: '34px' }}
            onClick={logout}
          >
            <LogOut size={12} />
            <span className="hide-on-mobile">Logout</span>
          </button>
        </div>
      </motion.nav>

      {/* ===== MAIN ===== */}
      <main className="page-container">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '32px' }}
        >
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            color: 'var(--forest)', marginBottom: '4px',
          }}>
            Good day, <em>{user?.username || 'Seller'}</em>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* ===== STATS GRID ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <StatCard
            delay={0.1}
            icon={<Phone size={20} />}
            label="SIM Airtime"
            value={deviceState?.airtimeBalance !== undefined ? `KES ${parseFloat(deviceState.airtimeBalance).toFixed(2)}` : 'KES ---'}
            badge={deviceState?.airtimeBalance !== undefined ? 'Sync Ready' : 'Syncing...'}
            badgeType={deviceState?.airtimeBalance !== undefined ? 'info' : 'warning'}
          />

          {/* Tokens Balance */}
          <StatCard
            delay={0.1}
            accent
            icon={<Zap size={20} />}
            label="Token Balance"
            value={deviceData?.tokens_balance ?? 0}
            badge="Portal Active"
          />

          {/* Battery */}
          <StatCard
            delay={0.05}
            icon={deviceState?.isCharging ? <BatteryCharging size={20} /> : <Battery size={20} />}
            label="Battery"
            value={`${deviceState?.batteryLevel ?? 0}%`}
            badge={deviceState?.isCharging ? 'Charging' : 'On Battery'}
            badgeType={deviceState?.isCharging ? 'success' : 'warning'}
            footer={
              <div style={{ marginTop: '16px' }}>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${deviceState?.batteryLevel ?? 0}%`,
                      background: (deviceState?.batteryLevel ?? 0) > 20 ? 'var(--sage)' : 'var(--red)',
                    }}
                  />
                </div>
              </div>
            }
          />

          {/* Network */}
          <StatCard
            delay={0.1}
            icon={<Wifi size={20} />}
            label="Network"
            value={deviceState?.networkOperator ?? 'N/A'}
            badge="Online"
            badgeType="success"
            footer={
              <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Last seen: <strong style={{ color: 'var(--text-secondary)' }}>
                  {deviceState?.lastSeen ? new Date(deviceState.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </strong>
              </div>
            }
          />

          {/* Today orders — accent card */}
          <StatCard
            delay={0.15}
            accent
            icon={<ShoppingCart size={20} />}
            label="Today's Orders"
            value={todayTransactions.length}
            footer={
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                  ✓ {successCount} success
                </span>
                {failCount > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,200,150,0.8)' }}>
                    ✗ {failCount} failed
                  </span>
                )}
              </div>
            }
          />

          {/* Sync */}
          <StatCard
            delay={0.2}
            icon={<TrendingUp size={20} />}
            label="Remote Sync"
            value="Active"
            footer={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--cream-bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--cream-border)' }}>
                   {[0, 1].map((sim) => (
                      <button 
                         key={sim}
                         onClick={() => setSelectedSim(sim)}
                         style={{
                            flex: 1, padding: '6px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontSize: '0.7rem', fontWeight: 700,
                            background: selectedSim === sim ? 'var(--forest)' : 'transparent',
                            color: selectedSim === sim ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.2s ease',
                         }}
                      >
                         SIM {sim + 1}
                      </button>
                   ))}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '36px', fontSize: '0.8rem', borderRadius: '10px' }}
                  onClick={() => handleIssueCommand('BALANCE_CHECK', { simSlot: selectedSim })}
                  disabled={refreshing}
                >
                  {refreshing ? 'Syncing...' : 'Sync Airtime'}
                </button>
              </div>
            }
          />
        </div>

        {/* ===== LOWER GRID ===== */}
        <div className="stack-on-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="card"
            style={{ padding: '28px', overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: 'var(--forest)' }}>
                  Recent Activity
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Today's transactions
                </p>
              </div>
              <button
                className="btn"
                style={{
                  padding: '7px 14px', fontSize: '0.8rem', height: '34px',
                  background: 'var(--sage-light)', color: 'var(--sage)',
                  borderRadius: '10px', fontWeight: 600,
                }}
                onClick={() => navigate('/transactions')}
              >
                View All <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTransactions.length > 0 ? todayTransactions.map((tx, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px',
                            background: 'var(--cream-dark)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)',
                          }}>
                            {tx.recipient?.slice(-2)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.recipient}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--forest)' }}>KES {tx.amount}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${tx.status === 'Success' ? 'success' : 'danger'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4">
                        <div style={{
                          textAlign: 'center', padding: '48px 20px',
                          color: 'var(--text-muted)',
                        }}>
                          <History size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                          <p style={{ fontSize: '0.88rem' }}>No orders recorded today yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Available Offers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="card"
            style={{ padding: '28px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: 'var(--forest)' }}>
                Remote Buy
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Issue a purchase command
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {availableOffers.length > 0 ? availableOffers.map((offer, i) => (
                <OfferItem
                  key={i}
                  offer={offer}
                  onBuy={() => {
                    setSelectedOffer(offer);
                    setIsPurchaseModalOpen(true);
                  }}
                />
              )) : (
                <div style={{
                  textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)',
                }}>
                  <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontSize: '0.88rem' }}>No offers synced yet.</p>
                  <button
                    className="btn"
                    style={{ marginTop: '16px', background: 'var(--sage-light)', color: 'var(--sage)', fontSize: '0.8rem', height: '36px', borderRadius: '10px' }}
                    onClick={() => handleIssueCommand('BALANCE_CHECK')}
                  >
                    Sync to load offers
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px', paddingTop: '20px',
          borderTop: '1px solid var(--cream-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Bingwa Sokoni
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Powered by <strong style={{ color: 'var(--sage)', fontWeight: 600 }}>Nexora Creative Solutions</strong>
          </span>
        </div>
      </main>

      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        offer={selectedOffer}
        onClose={() => setIsPurchaseModalOpen(false)}
        onConfirm={(phone) => {
          handleIssueCommand('PURCHASE_OFFER', {
            offerId: selectedOffer.id,
            planName: selectedOffer.planName,
            amount: selectedOffer.amount,
            recipientPhone: phone
          });
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}