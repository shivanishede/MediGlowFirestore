import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import { dashboardService, transactionsService } from '../services/firestoreService';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
    TrendingUp, TrendingDown, ShoppingCart, Package, Wallet,
    Users, Box, ArrowRight, Plus, FileText, BarChart2
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/billPdf';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
    const navigate = useNavigate();
    const { profile } = useStore();

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // === NEW: State for our SQLite Backend Data ===
    const [dbStats, setDbStats] = useState({
        totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0,
        youllGet: 0, youllGive: 0, totalParties: 0, totalItems: 0, pendingSales: 0
    });
    const [trendData, setTrendData] = useState({ sales: [], purchases: [] });
    const [recentTxns, setRecentTxns] = useState([]);

    // Fetch live data from Firestore
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch top cards data
                const stats = await dashboardService.getStats();
                setDbStats(stats);

                // Fetch recent transaction list
                const transactions = await transactionsService.getAll();
                setRecentTxns(transactions.slice(0, 5));

                // Map trend data for charts
                const salesTrend = Object.entries(stats.trend.sales).map(([month, total]) => ({ month, total }));
                const purchaseTrend = Object.entries(stats.trend.purchases).map(([month, total]) => ({ month, total }));
                
                setTrendData({ 
                    sales: salesTrend, 
                    purchases: purchaseTrend 
                }); 
                
            } catch (error) {
                console.error("Failed to fetch dashboard data from Firestore:", error);
            }
        };

        fetchDashboardData();
    }, []);

    // Format the backend trend data for Chart.js
    const chartData = useMemo(() => {
        const labels = [];
        const salesData = [];
        const purchaseData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            labels.push(MONTHS[d.getMonth()]);
            // Format to match SQLite month (YYYY-MM)
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            const saleMonth = trendData.sales.find(s => s.month === monthStr);
            salesData.push(saleMonth ? saleMonth.total : 0);

            const purchaseMonth = trendData.purchases.find(p => p.month === monthStr);
            purchaseData.push(purchaseMonth ? purchaseMonth.total : 0);
        }
        return { labels, salesData, purchaseData };
    }, [trendData, thisMonth, thisYear]);

    const lineChartData = {
        labels: chartData.labels,
        datasets: [
            {
                label: 'Sales',
                data: chartData.salesData,
                borderColor: '#7C6FFF',
                backgroundColor: 'rgba(124, 111, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#7C6FFF',
                pointRadius: 5,
                pointHoverRadius: 7,
            },
            {
                label: 'Purchases',
                data: chartData.purchaseData,
                borderColor: '#F39C12',
                backgroundColor: 'rgba(243, 156, 18, 0.08)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#F39C12',
                pointRadius: 5,
                pointHoverRadius: 7,
                borderDash: [5, 5],
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#9B97B2', font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyleWidth: 8 }
            },
            tooltip: {
                backgroundColor: '#1A1929',
                titleColor: '#EFEFEF',
                bodyColor: '#9B97B2',
                borderColor: 'rgba(124,111,255,0.3)',
                borderWidth: 1,
                callbacks: { label: (c) => ` ₹${c.raw.toLocaleString('en-IN')}` }
            },
        },
        scales: {
            x: { grid: { color: 'rgba(124,111,255,0.05)' }, ticks: { color: '#9B97B2', font: { family: 'Inter', size: 11 } } },
            y: { grid: { color: 'rgba(124,111,255,0.08)' }, ticks: { color: '#9B97B2', font: { family: 'Inter', size: 11 }, callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } },
        },
    };

    const barData = {
        labels: chartData.labels,
        datasets: [{
            label: 'Sales',
            data: chartData.salesData,
            backgroundColor: 'rgba(124, 111, 255, 0.7)',
            borderRadius: 6,
            hoverBackgroundColor: '#7C6FFF',
        }, {
            label: 'Purchases',
            data: chartData.purchaseData,
            backgroundColor: 'rgba(243, 156, 18, 0.5)',
            borderRadius: 6,
            hoverBackgroundColor: '#F39C12',
        }]
    };

    return (
        <div>
            {/* Welcome banner */}
            <div className="welcome-card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: 4 }}>Welcome back! 👋</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {profile.name} — {MONTHS[thisMonth]} {thisYear} Overview (Live Data)
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, zIndex: 1 }}>
                        <button className="btn btn-primary" onClick={() => navigate('/sales')}>
                            <Plus size={16} /> New Sale
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/reports')}>
                            <BarChart2 size={16} /> Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* You'll get / give cards */}
            <div className="grid-2" style={{ marginBottom: 20, gap: 16 }}>
                <div className="stat-card" style={{ borderColor: 'rgba(46,204,113,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(46,204,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={18} color="var(--green)" />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>YOU'LL GET</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--green)' }}>{formatCurrency(dbStats.youllGet)}</div>
                    <div className="stat-label">Receivables from customers</div>
                </div>
                <div className="stat-card" style={{ borderColor: 'rgba(231,76,60,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(231,76,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={18} color="var(--red)" />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>YOU'LL GIVE</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--red)' }}>{formatCurrency(dbStats.youllGive)}</div>
                    <div className="stat-label">Payables to suppliers</div>
                </div>
            </div>

            {/* Main stats */}
            <div className="grid-4" style={{ marginBottom: 20, gap: 16 }}>
                {[
                    { label: 'Total Sales', value: formatCurrency(dbStats.totalSales), icon: ShoppingCart, color: '#7C6FFF', bg: 'rgba(124,111,255,0.15)', trend: `Live from DB` },
                    { label: 'Total Purchases', value: formatCurrency(dbStats.totalPurchases), icon: Package, color: '#F39C12', bg: 'rgba(243,156,18,0.15)', trend: `Live from DB` },
                    { label: 'Total Expenses', value: formatCurrency(dbStats.totalExpenses), icon: Wallet, color: '#E74C3C', bg: 'rgba(231,76,60,0.15)', trend: 'This month' },
                    { label: 'Net Profit', value: formatCurrency(dbStats.netProfit), icon: TrendingUp, color: '#2ECC71', bg: 'rgba(46,204,113,0.15)', trend: 'Estimated' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={18} color={s.color} />
                            </div>
                        </div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.trend}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom: 20, gap: 16 }}>
                <div className="card">
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Sales & Purchase Trend</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 6 months comparison</p>
                    </div>
                    <div style={{ height: 230 }}>
                        <Line data={lineChartData} options={chartOptions} />
                    </div>
                </div>
                <div className="card">
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Monthly Comparison</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sales vs Purchases bar chart</p>
                    </div>
                    <div style={{ height: 230 }}>
                        <Bar data={barData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { ...chartOptions.plugins.legend } } }} />
                    </div>
                </div>
            </div>

            {/* Quick actions + Recent transactions */}
            <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
                {/* Quick Links */}
                <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Quick Links</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'New Sale', icon: '🛒', color: '#7C6FFF', action: () => navigate('/sales') },
                            { label: 'New Purchase', icon: '📦', color: '#F39C12', action: () => navigate('/purchases') },
                            { label: 'Add Expense', icon: '💸', color: '#E74C3C', action: () => navigate('/expenses') },
                            { label: 'Add Party', icon: '👤', color: '#2ECC71', action: () => navigate('/customers') },
                            { label: 'Add Item', icon: '📋', color: '#3498DB', action: () => navigate('/items') },
                            { label: 'View Reports', icon: '📊', color: '#9B59B6', action: () => navigate('/reports') },
                        ].map(q => (
                            <div key={q.label} className="quick-action" onClick={q.action}>
                                <div className="quick-action-icon" style={{ background: q.color + '22' }}>
                                    <span style={{ fontSize: 22 }}>{q.icon}</span>
                                </div>
                                <span className="quick-action-label">{q.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent transactions */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Transactions</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales')}>
                            See All <ArrowRight size={13} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentTxns.length === 0 && (
                            <div className="empty-state" style={{ padding: '30px 0' }}>
                                <FileText size={32} />
                                <p>No transactions yet</p>
                            </div>
                        )}
                        {recentTxns.map(txn => (
                            <div key={txn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: txn.type === 'SALE' ? 'rgba(124,111,255,0.15)' : (txn.type === 'PURCHASE' ? 'rgba(243,156,18,0.15)' : 'rgba(231,76,60,0.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                        {txn.type === 'SALE' ? '🛒' : (txn.type === 'PURCHASE' ? '📦' : '💸')}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{txn.customerName || txn.fromParty || 'Unknown'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{txn.type} · {formatDate(txn.date)}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: (txn.type === 'SALE' || txn.type === 'sale') ? 'var(--accent2)' : 'var(--yellow)' }}>{formatCurrency(txn.total || txn.amount || txn.transferAmount || 0)}</div>
                                    <div style={{ fontSize: 11, color: (txn.balance || 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
                                        {(txn.balance || 0) > 0 ? 'Pending' : 'Paid'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom stats */}
            <div className="grid-3" style={{ gap: 16 }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Users size={18} color="var(--accent2)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PARTIES</span>
                    </div>
                    <div className="stat-value" style={{ fontSize: 32 }}>{dbStats.totalParties}</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/customers')}>
                        Manage <ArrowRight size={13} />
                    </button>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Box size={18} color="var(--accent2)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL ITEMS</span>
                    </div>
                    <div className="stat-value" style={{ fontSize: 32 }}>{dbStats.totalItems}</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/items')}>
                        Manage <ArrowRight size={13} />
                    </button>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <ShoppingCart size={18} color="var(--accent2)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>PENDING SALES</span>
                    </div>
                    <div className="stat-value" style={{ fontSize: 32, color: 'var(--yellow)' }}>{dbStats.pendingSales}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Unpaid invoices</div>
                </div>
            </div>
        </div>
    );
}
