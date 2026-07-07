import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Package, Receipt, Users, Box,
    BarChart3, Settings, CreditCard, FileText, RefreshCw, Truck,
    ClipboardList, ArrowLeftRight, Wallet, ChevronRight, User
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

const navGroups = [
    {
        title: 'Overview',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/reports', icon: BarChart3, label: 'Reports' },
        ]
    },
    {
        title: 'Sale Transactions',
        items: [
            { to: '/sales', icon: ShoppingCart, label: 'Sales', sub: 'Invoices & Orders' },
        ]
    },
    {
        title: 'Purchase Transactions',
        items: [
            { to: '/purchases', icon: Package, label: 'Purchases', sub: 'POs & Bills' },
        ]
    },
    {
        title: 'Other Transactions',
        items: [
            { to: '/expenses', icon: Wallet, label: 'Expenses' },
            { to: '/other', icon: ArrowLeftRight, label: 'P2P Transfer' },
        ]
    },
    {
        title: 'Master',
        items: [
            { to: '/customers', icon: Users, label: 'Parties' },
            { to: '/items', icon: Box, label: 'Items' },
        ]
    },
    {
        title: 'Account',
        items: [
            { to: '/profile', icon: User, label: 'Profile & Settings' },
        ]
    },
];

export default function Sidebar() {
    const profile = useStore(s => s.profile);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <NavLink to="/dashboard" className="sidebar-logo">
                    <div className="sidebar-logo-icon">💊</div>
                    <span className="sidebar-logo-text">MediGlow</span>
                </NavLink>
                <div className="sidebar-business" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="dot dot-green"></div>
                    <span>{profile.name}</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {navGroups.map(group => (
                    <div key={group.title}>
                        <div className="nav-section-title">{group.title}</div>
                        {group.items.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            >
                                <item.icon size={16} />
                                <div style={{ flex: 1 }}>
                                    <div>{item.label}</div>
                                    {item.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>}
                                </div>
                                <ChevronRight size={13} style={{ opacity: 0.3 }} />
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(124,111,255,0.15), rgba(168,156,255,0.08))', borderRadius: 'var(--radius)', padding: '12px', textAlign: 'center', border: '1px solid var(--border)', marginBottom: '10px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MediGlow v1.0</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Business Management Suite</div>
                </div>
                <button 
                  onClick={() => {
                    useAuthStore.getState().logout();
                  }}
                  style={{ width: '100%', padding: '8px', background: 'transparent', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(231,76,60,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                >
                  Logout
                </button>
            </div>
        </aside>
    );
}
