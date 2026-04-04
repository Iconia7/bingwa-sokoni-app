import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { promoApi, deviceApi } from '../services/api';
import { 
  Ticket, Plus, Trash2, Calendar, Users, 
  Percent, Banknote, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function Coupons() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [availableOffers, setAvailableOffers] = useState([]);
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    usageLimit: 50,
    expiryDays: 30,
    targetId: '',
    targetProductId: '',
    oneTimePerUser: false
  });

  const fetchPromos = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('sellerUser'));
      if (!user) { navigate('/login'); return; }
      
      const [{ data: promoRes }, { data: deviceRes }] = await Promise.all([
        promoApi.getSellerPromos(user.userId),
        deviceApi.getDeviceData(user.userId)
      ]);

      if (promoRes.success) setPromos(promoRes.promos);
      if (deviceRes.success) setAvailableOffers(deviceRes.user?.availableOffers || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load coupon data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const user = JSON.parse(localStorage.getItem('sellerUser'));
      const payload = { ...formData, creatorId: user.userId };
      const { data } = await promoApi.create(payload);
      if (data.success) {
        toast.success(`Coupon ${formData.code} created!`);
        setIsModalOpen(false);
        setFormData({ 
          code: '', discountType: 'PERCENTAGE', discountValue: '', usageLimit: 50, expiryDays: 30, 
          targetId: '', targetProductId: '', oneTimePerUser: false 
        });
        fetchPromos();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const { data } = await promoApi.delete(id);
      if (data.success) {
        toast.success('Coupon removed.');
        fetchPromos();
      }
    } catch (err) {
      toast.error('Failed to delete coupon.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-sage" size={32} />
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost p-2">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl text-forest">Manage Coupons</h1>
            <p className="text-sm text-text-muted">Create promo codes for your storefront customers</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Create New Coupon
        </button>
      </div>

      {/* Coupon List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.length > 0 ? promos.map((promo) => (
                <tr key={promo._id}>
                  <td>
                    <div className="flex items-center gap-2 font-bold text-forest">
                      <Ticket size={16} className="text-gold" />
                      {promo.code}
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold">
                      {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% Off` : `KES ${promo.discountValue} Off`}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-text-muted">{promo.usageCount} / {promo.usageLimit} used</div>
                      <div className="progress-track w-24">
                        <div 
                          className="progress-fill bg-sage" 
                          style={{ width: `${Math.min(100, (promo.usageCount / promo.usageLimit) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar size={12} />
                      {new Date(promo.expiryDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    {new Date() > new Date(promo.expiryDate) ? (
                      <span className="badge badge-danger">Expired</span>
                    ) : promo.usageCount >= promo.usageLimit ? (
                      <span className="badge badge-warning">Max Used</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(promo._id)}
                      className="text-red hover:bg-red-light p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-text-muted">
                    <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                    <p>No coupons found. Create your first one to reward customers!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-md p-8 bg-white shadow-2xl"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <h2 className="text-xl mb-6 text-forest">Create New Coupon</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Coupon Code</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. WELCOME20"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Type</label>
                    <select 
                      className="input-field"
                      value={formData.discountType}
                      onChange={e => setFormData({...formData, discountType: e.target.value})}
                    >
                      <option value="PERCENTAGE">Percentage %</option>
                      <option value="FLAT">Flat Amount (KES)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Value</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 10"
                      value={formData.discountValue}
                      onChange={e => setFormData({...formData, discountValue: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Max Uses</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={formData.usageLimit}
                      onChange={e => setFormData({...formData, usageLimit: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Expiry (Days)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={formData.expiryDays}
                      onChange={e => setFormData({...formData, expiryDays: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="divider my-2" />
                <h3 className="text-xs font-bold text-forest uppercase mb-2">Targeting & Restrictions (Optional)</h3>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Specific Customer Phone</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 254708..."
                    value={formData.targetId}
                    onChange={e => setFormData({...formData, targetId: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Specific Offer/Plan</label>
                  <select 
                    className="input-field"
                    value={formData.targetProductId}
                    onChange={e => setFormData({...formData, targetProductId: e.target.value})}
                  >
                    <option value="">Apply to All Plans</option>
                    {availableOffers.map(offer => (
                      <option key={offer.id} value={offer.id}>{offer.label} (KES {offer.amount})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-sage-light rounded-xl cursor-pointer" onClick={() => setFormData({...formData, oneTimePerUser: !formData.oneTimePerUser})}>
                  <input 
                    type="checkbox" 
                    checked={formData.oneTimePerUser}
                    onChange={() => {}} // Handled by div click
                    className="w-4 h-4 accent-sage"
                  />
                  <div>
                    <div className="text-xs font-bold text-forest uppercase">One-time per customer</div>
                    <div className="text-[10px] text-sage">Ensure each customer can only use this code once.</div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating}
                    className="btn btn-primary flex-1"
                  >
                    {creating ? <Loader2 className="animate-spin" size={18} /> : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-8 { margin-top: 2rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .p-2 { padding: 0.5rem; }
        .p-4 { padding: 1rem; }
        .p-8 { padding: 2rem; }
        .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
        .w-24 { width: 6rem; }
        .w-full { width: 100%; }
        .max-w-md { max-width: 28rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-xl { font-size: 1.25rem; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-center { text-align: center; }
        .uppercase { text-transform: uppercase; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .text-forest { color: var(--forest); }
        .text-sage { color: var(--sage); }
        .text-gold { color: var(--gold); }
        .text-red { color: var(--red); }
        .text-white { color: white; }
        .text-text-muted { color: var(--text-muted); }
        .bg-white { background-color: white; }
        .bg-forest { background-color: var(--forest); }
        .bg-sage { background-color: var(--sage); }
        .bg-red-light { background-color: var(--red-light); }
        .rounded-lg { border-radius: 0.5rem; }
        .fixed { position: fixed; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .z-50 { z-index: 50; }
        .backdrop-blur-sm { backdrop-filter: blur(4px); }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .space-y-4 > * + * { margin-top: 1rem; }
        .flex-1 { flex: 1 1 0%; }
        .opacity-20 { opacity: 0.2; }
      `}</style>
    </div>
  );
}
