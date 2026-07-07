import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Box, BarChart3, Menu } from 'lucide-react';

export default function MobileNav() {
    return (
        <nav className="nav-mobile">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-mobile-item${isActive ? ' active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/sales" className={({ isActive }) => `nav-mobile-item${isActive ? ' active' : ''}`}>
                <ShoppingCart size={20} />
                <span>Sales</span>
            </NavLink>
            <NavLink to="/purchases" className={({ isActive }) => `nav-mobile-item${isActive ? ' active' : ''}`}>
                <Package size={20} />
                <span>Purchase</span>
            </NavLink>
            <NavLink to="/items" className={({ isActive }) => `nav-mobile-item${isActive ? ' active' : ''}`}>
                <Box size={20} />
                <span>Items</span>
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `nav-mobile-item${isActive ? ' active' : ''}`}>
                <BarChart3 size={20} />
                <span>Reports</span>
            </NavLink>
        </nav>
    );
}
