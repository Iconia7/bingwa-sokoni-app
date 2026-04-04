import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

const API_BASE_URL = 'https://bingwa.nexoracreatives.co.ke/api';

function getCategoryKey(plan) {
  return plan.category?.toLowerCase() || 'default';
}

function getPlanEmoji(plan) {
  const type = plan.type?.toLowerCase();
  const cat = plan.category?.toLowerCase();

  if (type === 'minutes') return '📞';
  if (type === 'sms') return '💬';

  if (cat === 'hourly') return '🕒';
  if (cat === 'daily') return '⚡';
  if (cat === 'weekly') return '🗂️';
  if (cat === 'monthly') return '🗓️';
  if (cat === 'other') return '🎁';
  return '📦';
}

function App() {
  const [seller, setSeller] = useState(null);
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [buyForOther, setBuyForOther] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [activeType, setActiveType] = useState('Data');
  const [activeCategory, setActiveCategory] = useState('All');
  const [availableTypes, setAvailableTypes] = useState(['Data']);
  const [availableCategories, setAvailableCategories] = useState(['All']);

  // Promo State
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[pathParts.length - 1] || 'Bingwa';
    if (!username) {
      setError('Please provide a valid shop username.');
      setLoading(false);
      return;
    }
    fetchSellerData(username);
  }, []);

  useEffect(() => {
    let result = plans;

    // 1. Identify all available types from data
    const types = ['Data', ...new Set(plans.map(p => p.type).filter(t => t && t !== 'Data'))];
    setAvailableTypes(types);

    // 2. Filter by Type
    result = result.filter(p => (p.type || 'Data') === activeType);

    // 3. Identify all available categories for this specific type
    const cats = ['All', ...new Set(result.map(p => p.category).filter(c => c))];
    setAvailableCategories(cats);

    // 4. Filter by Category
    if (activeCategory !== 'All' && cats.includes(activeCategory)) {
      result = result.filter(p => p.category === activeCategory);
    } else if (activeCategory !== 'All') {
      // Reset category if it's not available in the new type
      setActiveCategory('All');
    }

    setFilteredPlans(result);
  }, [activeType, activeCategory, plans]);

  const fetchSellerData = async (username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/public/user/${username}`);
      const data = await response.json();
      if (data.success) {
        if (data.isExpired) {
          setIsExpired(true);
          setExpiryMessage(data.message);
          setSeller(data.profile);
        } else {
          setSeller(data.profile);
          setPlans(data.plans);
          setIsExpired(false);
          // Set initial type if "Data" doesn't exist
          const types = [...new Set(data.plans.map(p => p.type || 'Data'))];
          if (!types.includes('Data') && types.length > 0) {
            setActiveType(types[0]);
          }
        }
      } else {
        setError(data.message || 'Shop not found.');
      }
    } catch {
      setError('Failed to connect to the store.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePromo = async () => {
    if (!promoCode || !selectedPlan) return;
    setIsValidatingPromo(true);
    try {
      const response = await fetch(`${API_BASE_URL}/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          userId: seller.userId,
          amount: selectedPlan.amount,
          productType: 'STOREFRONT_PLANS',
          productId: selectedPlan.id
        })
      });
      const data = await response.json();
      if (data.success) {
        setPromoData(data);
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Invalid promo code');
        setPromoData(null);
      }
    } catch {
      toast.error('Error validating promo code.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsPaying(true);
    setPaymentStatus('pending');

    try {
      const response = await fetch(`${API_BASE_URL}/payments/public-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerUsername: seller.username,
          amount: promoData ? promoData.finalAmount : selectedPlan.amount,
          packageId: selectedPlan.id,
          phoneNumber,
          targetPhoneNumber: buyForOther ? targetNumber : phoneNumber,
          promoId: promoData ? promoData.promoId : null
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          setSelectedPlan(null);
          setIsPaying(false);
          setPaymentStatus(null);
        }, 3500);
      } else {
        toast.error(data.message || 'Payment initiation failed.');
        setIsPaying(false);
        setPaymentStatus(null);
      }
    } catch {
      toast.error('Network error. Please try again.');
      setIsPaying(false);
      setPaymentStatus(null);
    }
  };

  // ─── Loading ───
  if (loading) return (
    <div className="loading">
      <span>Entering Shop</span>
      <div className="loading-dot">
        <span /><span /><span />
      </div>
    </div>
  );

  // ─── Inactive ───
  if (isExpired) return (
    <div className="error-screen" style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '4.5rem', marginBottom: '20px' }}>🛖</div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', color: '#1a1a1a' }}>Shop Temporarily Closed</h2>
      <p style={{ color: '#666', maxWidth: '300px', margin: '20px auto', lineHeight: '1.6' }}>
        {expiryMessage || "The shop owner's storefront subscription has expired. Please check back later."}
      </p>
      <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '12px', fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>
        Powered by Bingwa Sokoni
      </div>
    </div>
  );

  // ─── Error ───
  if (error) return (
    <div className="error-screen">
      <h2 style={{ fontSize: '3rem' }}>⚠️</h2>
      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem' }}>Oops!</h3>
      <p>{error}</p>
    </div>
  );


  const categoryIcons = {
    'All': '✦',
    'Hourly': '🕒',
    'Daily': '⚡',
    'Weekly': '🗂️',
    'Monthly': '🗓️',
    'Other': '🎁'
  };

  const typeIcons = {
    'Data': '📶',
    'Minutes': '📞',
    'SMS': '💬'
  };

  const whatsappNumber = seller.whatsappNumber || '254115332870';

  return (
    <div className="store-container">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      {/* ── Sticky Header ── */}
      <header className="shop-header">
        <div className="content-wrapper">
          <nav className="shop-nav">
            <div className="shop-brand">
              <div className="brand-logo-wrap">📦</div>
              <span className="brand-name">{seller.shopName || 'Marketplace'}</span>
            </div>
            <div className="nav-actions">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                className="nav-support-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="wa-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.11 1.523 5.836L0 24l6.336-1.499A11.941 11.941 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.005-1.372l-.359-.213-3.76.889.945-3.657-.234-.376A9.818 9.818 0 012.182 12c0-5.424 4.394-9.818 9.818-9.818 5.424 0 9.818 4.394 9.818 9.818 0 5.424-4.394 9.818-9.818 9.818z" />
                </svg>
                Support
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Hero Strip ── */}
      <section className="hero-strip">
        <div className="content-wrapper">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="dot" />
              Verified Safaricom Partner
            </div>
            <h1 className="hero-title">
              {activeType} Bundles, <em>Delivered</em><br />in Seconds.
            </h1>
            <p className="hero-subtitle">
              Instant activation for {activeType.toLowerCase()}. No delays.
            </p>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="content-wrapper">

        {/* Type Filter (Show only if multiple types exist) */}
        {availableTypes.length > 1 && (
          <div className="type-section">
            <div className="type-bar">
              {availableTypes.map(type => (
                <button
                  key={type}
                  className={`type-pill ${activeType === type ? 'active' : ''}`}
                  onClick={() => setActiveType(type)}
                >
                  <span className="type-emoji">
                    {type === 'Data' ? '⚡' : type === 'SMS' ? '💬' : '📞'}
                  </span>
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Bar */}
        <div className="category-section">
          <div className="category-bar">
            {availableCategories.map(label => (
              <button
                key={label}
                className={`category-pill ${activeCategory === label ? 'active' : ''}`}
                onClick={() => setActiveCategory(label)}
              >
                {label !== 'All' ? `${label} Plans` : 'All Plans'}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="section-header">
          <h2 className="section-title">
            {activeCategory === 'All' ? `Browse All ${activeType}` : `${activeCategory} ${activeType}`}
          </h2>
          <span className="section-count">{filteredPlans.length} offers ready</span>
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {filteredPlans.map((plan, index) => {
            const cat = getCategoryKey(plan);
            const emoji = getPlanEmoji(plan);
            return (
              <div
                key={plan.id}
                className="product-tile"
                data-category={cat}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="product-tile-top">
                  {index === 0 && <span className="product-badge badge-bestseller">Best Seller</span>}
                  {index === 1 && <span className="product-badge badge-value">Best Value</span>}
                  <span className="product-image-emoji">{emoji}</span>
                </div>

                <div className="product-body">
                  <h3 className="product-name">{plan.planName}</h3>
                  <p className="product-offer">{plan.category} {plan.type} • Instant delivery</p>

                  <div className="product-footer">
                    <div className="price-block">
                      <div className="price-label">Price</div>
                      <div>
                        <span className="price-amount">{plan.amount}</span>
                        <span className="price-currency">KES</span>
                      </div>
                    </div>
                    <button
                      className="btn-buy-circle"
                      aria-label={`Buy ${plan.planName}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan); }}
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trust Section ── */}
      <section className="trust-section">
        <div className="content-wrapper">
          <div className="trust-inner">
            <div className="trust-item">
              <div className="trust-icon">🔒</div>
              <h4>Secure Payment</h4>
              <p>M-Pesa Safaricom<br />verified & encrypted</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">⚡</div>
              <h4>Instant Vending</h4>
              <p>Automated delivery<br />within 10 seconds</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">📞</div>
              <h4>24/7 Support</h4>
              <p>Direct seller contact<br />available anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Checkout Modal ── */}
      {selectedPlan && (
        <div className="modal-overlay" onClick={() => !isPaying && setSelectedPlan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="modal-handle" />

            <div className="modal-plan-badge">
              {getPlanEmoji(selectedPlan)} &nbsp;{selectedPlan.planName}
            </div>
            <h2 className="modal-title">Complete Your Order</h2>

            <div className="order-card">
              <div className="summary-row">
                <span>Bundle Price</span>
                <span>KES {selectedPlan.amount}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>FREE ✓</span>
              </div>
            </div>

            <div className="total-row">
              <span>Total Payable</span>
              <span className="total-amount">
                {promoData ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.8em', marginRight: '8px' }}>
                      KES {selectedPlan.amount}
                    </span>
                    KES {promoData.finalAmount}
                  </>
                ) : (
                  `KES ${selectedPlan.amount}`
                )}
              </span>
            </div>

            <div className="promo-section" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Have a promo code?"
                  className="promo-input"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  className="promo-btn"
                  onClick={handleValidatePromo}
                  disabled={isValidatingPromo || !promoCode}
                  style={{ padding: '0 15px', borderRadius: '8px', border: 'none', background: '#1a1a1a', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {isValidatingPromo ? '...' : 'Apply'}
                </button>
              </div>
            </div>

            <form onSubmit={handleBuy}>
              <div className="input-group">
                <label>M-Pesa Number (Paying)</label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isPaying}
                  required
                />
              </div>

              <div className="toggle-group">
                <label>
                  <input
                    type="checkbox"
                    checked={buyForOther}
                    onChange={(e) => setBuyForOther(e.target.checked)}
                    disabled={isPaying}
                  />
                  Send as a gift to someone else
                </label>
              </div>

              {buyForOther && (
                <div className="input-group">
                  <label>Recipient Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0798 765 432"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    disabled={isPaying}
                    required
                  />
                </div>
              )}

              {!isPaying ? (
                <button type="submit" className="btn-buy">
                  Pay with M-Pesa →
                </button>
              ) : paymentStatus === 'pending' ? (
                <div className="payment-state">
                  <div className="spinner" />
                  <p className="state-title">Awaiting M-Pesa Prompt</p>
                  <p className="state-sub">Check your phone and enter your PIN.</p>
                </div>
              ) : (
                <div className="payment-state">
                  <div className="checkmark-circle">✅</div>
                  <p className="state-title">Order Confirmed!</p>
                  <p className="state-sub">Your bundle will activate shortly.</p>
                </div>
              )}
            </form>

            {!isPaying && (
              <button className="cancel-btn" onClick={() => setSelectedPlan(null)}>
                ← Back to Shop
              </button>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        Powered by Bingwa Sokoni Marketplace &mdash; © 2026. All rights reserved.
      </footer>
    </div>
  );
}

export default App;