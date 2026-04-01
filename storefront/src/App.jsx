import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://bingwa.nexoracreatives.co.ke/api';

function App() {
  const [seller, setSeller] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [buyForOther, setBuyForOther] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'success', 'failed'

  useEffect(() => {
    // 1. Get username from URL path (e.g., bingwa.com/newton)
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[pathParts.length - 1] || 'dita'; // Fallback for dev

    if (!username) {
      setError('Please provide a valid shop username.');
      setLoading(false);
      return;
    }

    fetchSellerData(username);
  }, []);

  const fetchSellerData = async (username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/public/user/${username}`);
      const data = await response.json();

      if (data.success) {
        setSeller(data.profile);
        setPlans(data.plans);
      } else {
        setError(data.message || 'Shop not found.');
      }
    } catch (err) {
      setError('Failed to connect to the store.');
    } finally {
      setLoading(false);
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
          amount: selectedPlan.amount,
          packageId: selectedPlan.id,
          phoneNumber: phoneNumber, // Number to be charged
          targetPhoneNumber: buyForOther ? targetNumber : phoneNumber, // Number to receive data
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPaymentStatus('success');
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setSelectedPlan(null);
          setIsPaying(false);
          setPaymentStatus(null);
        }, 3500);
      } else {
        alert(data.message || 'Payment initiation failed.');
        setIsPaying(false);
        setPaymentStatus(null);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      setIsPaying(false);
      setPaymentStatus(null);
    }
  };

  if (loading) return <div className="loading">🚀 Loading Shop...</div>;
  if (error) return <div className="error-screen"><h2>⚠️ Oops!</h2><p>{error}</p></div>;

  return (
    <div className="store-container">
      {/* Banner */}
      <div className="banner" style={{ backgroundImage: `url(${seller.bannerUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80'})` }}>
        <div className="overlay"></div>
      </div>

      <div className="content-wrapper">
        {/* Profile Section */}
        <div className="profile-card">
          <div className="avatar">
            <img src={seller.profilePicUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + seller.username} alt="Shop Logo" />
          </div>
          <h1 className="shop-name">{seller.shopName}</h1>
          <p className="shop-tagline">Buy Cheap Data & Airtime Instantly ⚡</p>
        </div>

        {/* Offers Grid */}
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card" onClick={() => setSelectedPlan(plan)}>
              <div className="plan-header">
                <span className="plan-title">{plan.planName}</span>
                <span className="plan-price">KES {plan.amount}</span>
              </div>
              <p className="plan-desc">{plan.placeholder || 'Get yours now!'}</p>
              <div className="buy-btn-visual">Choose Bundle</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <div className="modal-overlay" onClick={() => !isPaying && setSelectedPlan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Checkout: {selectedPlan.planName}</h2>
            <p className="price-tag">Total: KES {selectedPlan.amount}</p>

            <form onSubmit={handleBuy}>
              <div className="input-group">
                <label>M-Pesa Phone Number (To Pay)</label>
                <input 
                  type="tel" 
                  placeholder="2547XXXXXXXX" 
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
                  Buy for a different number?
                </label>
              </div>

              {buyForOther && (
                <div className="input-group">
                  <label>Recipient Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="254XXXXXXXXX" 
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    disabled={isPaying}
                    required 
                  />
                </div>
              )}

              {!isPaying ? (
                <button type="submit" className="pay-btn">Pay with M-Pesa</button>
              ) : (
                  paymentStatus === 'pending' ? (
                    <div className="payment-pending">
                      <div className="spinner"></div>
                      <p>Sending STK Push to your phone...</p>
                    </div>
                  ) : (
                    <div className="success-message">
                      <div className="checkmark">✅</div>
                      <p>Payment Sent! Please check your phone.</p>
                    </div>
                  )
              )}
            </form>
            
            {!isPaying && <button className="cancel-btn" onClick={() => setSelectedPlan(null)}>Cancel</button>}
          </div>
        </div>
      )}
      
      <footer className="footer">
        Powered by Bingwa Sokoni © 2026
      </footer>
    </div>
  );
}

export default App;
