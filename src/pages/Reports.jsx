import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart2, FileText, Download, Filter,
    Calendar, TrendingUp, TrendingDown, Layers,
    ChevronRight, ArrowRight, IndianRupee
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { formatCurrency, formatDate } from '../utils/billPdf';
import { transactionsService, itemsService } from '../services/firestoreService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const CHIP_TABS = [
    { id: 'summary', name: 'Executive Summary', icon: Layers },
    { id: 'sales', name: 'Sales Report', icon: TrendingUp },
    { id: 'purchases', name: 'Purchase Report', icon: TrendingDown },
    { id: 'gst', name: 'GST & Taxes', icon: FileText },
    { id: 'items', name: 'Item Performance', icon: BarChart2 },
];

export default function Reports() {
    const [activeTab, setActiveTab] = useState('summary');
    const [transactions, setTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const [transactionsData, itemsData] = await Promise.all([
                    transactionsService.getAll(),
                    itemsService.getAll()
                ]);
                
                // Map Firestore fields to our UI fields
                const mappedTrx = transactionsData.map(t => ({
                    ...t,
                    invoiceNo: t.invoice_number || t.invoiceNo,
                    customerName: t.customerName || t.fromParty || 'Unknown',
                    total: t.total || t.amount || t.transferAmount || 0,
                    subtotal: t.subtotal || 0,
                    tax: t.tax || t.tax_amount || 0,
                }));
                setTransactions(mappedTrx);
                
                const mappedProducts = itemsData.map(i => ({
                    id: i.id,
                    name: i.item_name,
                    category: i.category,
                    purchasePrice: i.purchase_price,
                    stock: i.stock,
                    minStock: 5
                }));
                setProducts(mappedProducts);
                
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch report data:", err);
                setLoading(false);
            }
        };
        fetchReportData();
    }, []);

    const sales = useMemo(() => transactions.filter(t => t.type === 'SALE'), [transactions]);
    const purchases = useMemo(() => transactions.filter(t => t.type === 'PURCHASE'), [transactions]);

    // Data Aggregation
    const reports = useMemo(() => {
        if (!transactions.length && !products.length) return { totalSalesGst: 0, totalPurchaseGst: 0, catSales: {}, topItems: [], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], monthlySales: Array(12).fill(0), monthlyPurchases: Array(12).fill(0) };

        // GST Calculations
        const totalSalesGst = sales.reduce((s, t) => s + (t.tax_amount || t.tax || 0), 0);
        const totalPurchaseGst = purchases.reduce((s, t) => s + (t.tax_amount || t.tax || 0), 0);

        // Category performance
        const catSales = {};
        sales.forEach(s => {
            s.items?.forEach(item => {
                const pId = item.item_id || item.productId;
                const prod = products.find(p => String(p.id) === String(pId));
                const cat = prod?.category || 'Other / General';
                catSales[cat] = (catSales[cat] || 0) + (item.amount || item.amount_paid || item.total_amount || 0);
            });
            // If the transaction has no items (like the dummy data), credit the entire amount to 'General'
            if (!s.items || s.items.length === 0) {
                catSales['Other / General'] = (catSales['Other / General'] || 0) + (s.total_amount || s.total || 0);
            }
        });

        // Top Items
        const itemQty = {};
        sales.forEach(s => {
            s.items?.forEach(item => {
                const qty = item.quantity || item.qty || 0;
                // Item name comes from joined i.item_name AS name on the backend
                const name = item.name || 'Unknown Item';
                itemQty[name] = (itemQty[name] || 0) + qty;
            });
        });
        const topItems = Object.entries(itemQty).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Monthly data for charts
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlySales = Array(12).fill(0);
        const monthlyPurchases = Array(12).fill(0);

        sales.forEach(s => {
            const m = new Date(s.date).getMonth();
            monthlySales[m] += (s.total_amount || s.total || 0);
        });

        purchases.forEach(p => {
            const m = new Date(p.date).getMonth();
            monthlyPurchases[m] += (p.total_amount || p.total || 0);
        });

        return { totalSalesGst, totalPurchaseGst, catSales, topItems, months, monthlySales, monthlyPurchases };
    }, [sales, purchases, products, transactions]);

    const handleExportAll = () => {
        const headers = ["Type", "Date", "Invoice No", "Party Name", "Status", "Payment Mode", "Tax", "Total Amount"];
        let csv = headers.join(",") + "\n";
        
        transactions.forEach(t => {
            const party = (t.customerName || 'Unknown').replace(/,/g, '');
            const notes = (t.notes || '').replace(/,/g, ' ');
            const type = t.type || 'UNKNOWN';
            const date = t.date || '';
            const inv = t.invoice_number || t.invoiceNo || '-';
            const status = t.payment_status || '';
            const mode = t.payment_mode || '';
            const tax = t.tax_amount || t.tax || 0;
            const total = t.total_amount || t.total || 0;
            
            // For P2P we can grab the party from notes
            const finalParty = type === 'P2P' ? notes.split('|')[0] || party : party;

            csv += `${type},${date},${inv},${finalParty},${status},${mode},${tax},${total}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `MediGlow_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const catChartData = {
        labels: Object.keys(reports.catSales),
        datasets: [{
            data: Object.values(reports.catSales),
            backgroundColor: [
                'rgba(124, 111, 255, 0.8)', // Purple
                'rgba(46, 204, 113, 0.8)',  // Green
                'rgba(241, 196, 15, 0.8)',  // Yellow
                'rgba(231, 76, 60, 0.8)',   // Red
                'rgba(52, 152, 219, 0.8)',  // Blue
                'rgba(155, 89, 182, 0.8)',  // Amethyst
                'rgba(230, 126, 34, 0.8)',  // Orange
                'rgba(26, 188, 156, 0.8)'   // Turquoise
            ],
            borderWidth: 0,
            borderRadius: 8,
        }]
    };

    return (
        <div className="reports-page">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">Business Reports</h1>
                    <p className="page-subtitle">Analyze your business performance and tax liabilities</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>
                        <Calendar size={14} /> This Year
                    </button>
                    <button className="btn btn-primary" onClick={handleExportAll}>
                        <Download size={14} /> Export All
                    </button>
                </div>
            </div>

            {/* Navigation Chips */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
                {CHIP_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-chip ${activeTab === tab.id ? 'active' : ''}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 100,
                            background: activeTab === tab.id ? 'var(--accent2)' : 'var(--bg-card)',
                            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                            border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                            cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13,
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="reports-content">
                {activeTab === 'summary' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="grid-3" style={{ gap: 20 }}>
                            <div className="card" style={{ borderLeft: '4px solid var(--accent2)' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>GROSS SALES</p>
                                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(sales.reduce((s, t) => s + (t.total || 0), 0))}</h2>
                                <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>↑ 12% from last period</p>
                            </div>
                            <div className="card" style={{ borderLeft: '4px solid var(--yellow)' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>GROSS PURCHASES</p>
                                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(purchases.reduce((s, t) => s + (t.total || 0), 0))}</h2>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Total stock acquired</p>
                            </div>
                            <div className="card" style={{ borderLeft: '4px solid var(--red)' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>TOTAL TAX COLLECTED</p>
                                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(reports.totalSalesGst)}</h2>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>GST Output tax</p>
                            </div>
                        </div>

                        <div className="grid-2" style={{ gap: 20 }}>
                            <div className="card">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Sales by Category</h3>
                                <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                                    <Pie
                                        data={catChartData}
                                        options={{
                                            plugins: {
                                                legend: { position: 'right', labels: { color: '#9B97B2', font: { family: 'Inter', size: 11 } } }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="card">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Top Selling Items</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {reports.topItems.map(([name, qty], idx) => (
                                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 6,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700, color: 'var(--accent2)'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                                                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 4 }}>
                                                    <div style={{ width: `${(qty / reports.topItems[0][1]) * 100}%`, height: '100%', background: 'var(--accent2)', borderRadius: 2 }} />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{qty} Pcs</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gst' && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>GSTR-1 (Sales Tax Summary)</h3>
                            <button className="btn btn-ghost btn-sm">PDF Report</button>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoice No.</th>
                                        <th>Party Name</th>
                                        <th>Taxable Value</th>
                                        <th>GST Amount</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontSize: 12 }}>{formatDate(s.date)}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>{s.invoiceNo}</td>
                                            <td>{s.customerName}</td>
                                            <td>{formatCurrency(s.subtotal)}</td>
                                            <td style={{ color: 'var(--yellow)' }}>{formatCurrency(s.tax || s.tax_amount || 0)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(s.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, padding: 16 }}>TOTALS</td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(sales.reduce((s, t) => s + (t.subtotal || 0), 0))}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--yellow)' }}>{formatCurrency(reports.totalSalesGst)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(sales.reduce((s, t) => s + (t.total || 0), 0))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card">
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Annual Sales Trend</h3>
                            <div style={{ height: 300 }}>
                                <Line
                                    data={{
                                        labels: reports.months,
                                        datasets: [{
                                            label: 'Sales Revenue',
                                            data: reports.monthlySales,
                                            borderColor: 'var(--accent2)',
                                            backgroundColor: 'rgba(124, 111, 255, 0.1)',
                                            fill: true,
                                            tension: 0.4,
                                            pointBackgroundColor: 'var(--accent2)'
                                        }]
                                    }}
                                    options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                />
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Recent Sales Transactions</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Customer</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.slice(-5).reverse().map(s => (
                                            <tr key={s.id}>
                                                <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>{s.invoiceNo}</td>
                                                <td>{s.customerName}</td>
                                                <td style={{ fontSize: 12 }}>{formatDate(s.date)}</td>
                                                <td>{s.items?.length || 0}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(s.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'purchases' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card">
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Annual Purchase Trend</h3>
                            <div style={{ height: 300 }}>
                                <Line
                                    data={{
                                        labels: reports.months,
                                        datasets: [{
                                            label: 'Purchase Expenditure',
                                            data: reports.monthlyPurchases,
                                            borderColor: 'var(--yellow)',
                                            backgroundColor: 'rgba(243, 156, 18, 0.1)',
                                            fill: true,
                                            tension: 0.4,
                                            pointBackgroundColor: 'var(--yellow)'
                                        }]
                                    }}
                                    options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                />
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Recent Purchase Bills</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Bill No.</th>
                                            <th>Supplier</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchases.slice(-5).reverse().map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600, color: 'var(--yellow)' }}>{p.invoiceNo}</td>
                                                <td>{p.customerName}</td>
                                                <td style={{ fontSize: 12 }}>{formatDate(p.date)}</td>
                                                <td>{p.items?.length || 0}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="grid-2" style={{ gap: 20 }}>
                            <div className="card">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Category Distribution</h3>
                                <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                                    <Pie
                                        data={catChartData}
                                        options={{ maintainAspectRatio: false }}
                                    />
                                </div>
                            </div>
                            <div className="card">
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Inventory Summary</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="card-sm" style={{ border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Unique Items</span>
                                            <span style={{ fontSize: 18, fontWeight: 700 }}>{products.length}</span>
                                        </div>
                                    </div>
                                    <div className="card-sm" style={{ border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Low Stock Items</span>
                                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>
                                                {products.filter(p => (p.stock || 0) < (p.minStock || 5)).length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card-sm" style={{ border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Stock Value</span>
                                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                                                {formatCurrency(products.reduce((s, p) => s + (p.stock * p.purchasePrice || 0), 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Top Performers</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Item Name</th>
                                            <th style={{ textAlign: 'right' }}>Total Quantity Sold</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.topItems.map(([name, qty], idx) => (
                                            <tr key={name}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{qty} Pcs</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
