import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deviceApi } from '../services/api';
import { ArrowLeft, History, Search, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const seller = JSON.parse(localStorage.getItem('sellerUser'));
      if (!seller) { navigate('/login'); return; }
      try {
        const { data } = await deviceApi.getDeviceData(seller.userId);
        if (data.success) {
          setTransactions(data.todayTransactions || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading) return null;

  // const transactions is now a state variable
  const filtered = transactions.filter(t => 
    t.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) {
      alert("No transactions to export.");
      return;
    }
    
    // Headers
    const headers = ["Recipient", "Amount (KES)", "Status", "Reference", "Date"];
    
    // Create CSV rows
    const rows = filtered.map(tx => [
      `="\t${tx.recipient || ''}"`, // Force text to avoid scientific notation
      tx.amount,
      tx.status,
      `="\t${tx.reference || ''}"`, // Force text to avoid scientific notation
      `"${new Date(tx.date).toLocaleString()}"`
    ].join(","));

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '20px 0' }}>
      <div className="page-container">
        
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn btn-ghost"
              style={{ width: '40px', height: '40px', padding: 0 }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.8rem', color: 'var(--forest)' }}>
              Transaction History
            </h1>
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={handleExportCSV}
          >
            <Download size={14} /> Export CSV
          </button>
        </header>

        <div className="card" style={{ padding: '32px' }}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by recipient or status..." 
              style={{ paddingLeft: '44px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((tx, i) => (
                  <motion.tr 
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.recipient}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--forest)' }}>KES {tx.amount}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.status === 'Success' ? 'success' : 'danger'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {tx.reference || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="5">
                      <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
                        <History size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>No transactions found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
