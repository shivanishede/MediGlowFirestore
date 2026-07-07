import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react';
import { itemsService, companiesService } from '../services/firestoreService';
import { formatCurrency } from '../utils/billPdf';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Pcs', 'Box', 'Strip', 'Bottle', 'Pack', 'Kg', 'Ltr', 'Dozen', 'Set'];

const EMPTY_FORM = { name: '', category: '', mrp: 0, salePrice: 0, purchasePrice: 0, stock: 0, unit: 'Pcs', hsn: '', gst: 0, description: '' };

// ─── Company Name Combobox ────────────────────────────────────────────────────
function CompanyCombobox({ value, onChange, companies }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState(value || '');
    const wrapRef = useRef(null);

    // Sync external value changes (e.g. form reset)
    useEffect(() => { setInput(value || ''); }, [value]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = companies.filter(c => c.toLowerCase().includes(input.toLowerCase()));
    const showAddOption = input.trim() && !companies.map(c => c.toLowerCase()).includes(input.trim().toLowerCase());

    const select = (val) => {
        setInput(val);
        onChange(val);
        setOpen(false);
    };

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <input
                    className="form-control"
                    value={input}
                    placeholder="Type or select company name..."
                    onFocus={() => setOpen(true)}
                    onChange={e => {
                        setInput(e.target.value);
                        onChange(e.target.value);
                        setOpen(true);
                    }}
                    autoComplete="off"
                />
                <ChevronDown
                    size={15}
                    onClick={() => setOpen(o => !o)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                />
            </div>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                    background: 'var(--bg-card2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', marginTop: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto'
                }}>
                    {filtered.length === 0 && !showAddOption && (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No companies found</div>
                    )}
                    {filtered.map(c => (
                        <div
                            key={c}
                            onMouseDown={() => select(c)}
                            style={{
                                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                                color: c === value ? 'var(--accent)' : 'var(--text-primary)',
                                background: c === value ? 'rgba(124,58,237,0.1)' : 'transparent',
                                fontWeight: c === value ? 600 : 400,
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => { if (c !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            onMouseLeave={e => { if (c !== value) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {c}
                        </div>
                    ))}
                    {showAddOption && (
                        <div
                            onMouseDown={() => select(input.trim())}
                            style={{
                                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                                color: 'var(--accent2)', borderTop: filtered.length ? '1px solid var(--border)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,204,113,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={13} />
                            Add "{input.trim()}" as new company
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Items Page ──────────────────────────────────────────────────────────
export default function Items() {
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [data, companyList] = await Promise.all([
                itemsService.getAll(),
                companiesService.getAll()
            ]);
            const fItems = data.map(i => ({
                id: i.id,
                name: i.item_name,
                category: i.category,
                mrp: i.mrp || 0,
                salePrice: i.selling_price,
                purchasePrice: i.purchase_price,
                stock: i.stock,
                unit: i.unit || 'Pcs',
                hsn: i.hsn || '',
                gst: i.gst || 0,
                description: i.description || ''
            }));
            setProducts(fItems);
            setCompanies(companyList);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load items:", error);
            toast.error("Failed to load items from database");
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [view, setView] = useState('grid');

    const filtered = products.filter(p => {
        const matchSearch = (p.name + p.category + p.id + (p.hsn || '')).toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All' || p.category === filterCat;
        return matchSearch && matchCat;
    });

    const handleOpen = (prod) => {
        if (prod) { setForm({ ...prod }); setEditProduct(prod); }
        else { setForm(EMPTY_FORM); setEditProduct(null); }
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Product name is required'); return; }
        if (!form.category.trim()) { toast.error('Company name is required'); return; }

        const companyName = form.category.trim();

        const payload = {
            item_name: form.name,
            category: companyName,
            mrp: form.mrp,
            selling_price: form.salePrice,
            purchase_price: form.purchasePrice,
            stock: form.stock,
            unit: form.unit,
            hsn: form.hsn,
            gst: form.gst,
            description: form.description
        };

        try {
            if (editProduct) {
                await itemsService.update(editProduct.id, payload);
                toast.success('Product updated!');
            } else {
                await itemsService.add(payload);
                toast.success('Product added!');
            }
            // If it's a new company, save it
            if (!companies.map(c => c.toLowerCase()).includes(companyName.toLowerCase())) {
                await companiesService.add(companyName);
                toast.success(`Company "${companyName}" saved!`);
            }
            setShowForm(false);
            fetchAll();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save item');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this item permanently?')) return;
        try {
            await itemsService.delete(id);
            toast.success('Item deleted!');
            fetchAll();
        } catch (err) {
            toast.error('Failed to delete item (Might be linked to transactions)');
        }
    };

    const lowStock = products.filter(p => p.stock <= 2);
    const totalValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
    const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Items / Products</h1>
                    <p className="page-subtitle">Manage your inventory and product catalog</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={() => handleOpen(null)}>
                        <Plus size={16} /> Add Item
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: 20, gap: 14 }}>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>TOTAL ITEMS</div>
                    <div className="stat-value">{products.length}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>STOCK VALUE</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalValue)}</div>
                </div>
                <div className="stat-card" style={{ borderColor: lowStock.length > 0 ? 'rgba(243,156,18,0.3)' : 'var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <AlertTriangle size={13} color="var(--yellow)" />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>LOW STOCK</span>
                    </div>
                    <div className="stat-value" style={{ color: lowStock.length > 0 ? 'var(--yellow)' : 'var(--text-primary)' }}>{lowStock.length}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>OUT OF STOCK</div>
                    <div className="stat-value" style={{ color: 'var(--red)' }}>{products.filter(p => p.stock <= 0).length}</div>
                </div>
            </div>

            {/* Low stock alert */}
            {lowStock.length > 0 && (
                <div style={{ background: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={16} color="var(--yellow)" />
                    <span style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 500 }}>
                        {lowStock.length} item(s) are running low on stock: {lowStock.map(p => p.name).join(', ')}
                    </span>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items by name, company, HSN..." />
                </div>
                <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 200 }}>
                    {cats.map(c => <option key={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    {['grid', 'list'].map(v => (
                        <button key={v} onClick={() => setView(v)}
                            style={{ padding: '8px 14px', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                            {v === 'grid' ? '⊞ Grid' : '☰ List'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid view */}
            {view === 'grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {filtered.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                            <TrendingUp size={40} />
                            <h3>No items found</h3>
                            <p>Add your first product to start managing inventory</p>
                        </div>
                    )}
                    {filtered.map(prod => (
                        <div key={prod.id} className="product-card">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>{prod.name}</div>
                                    <span className="badge badge-purple" style={{ fontSize: 10 }}>{prod.category}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleOpen(prod)}><Edit2 size={13} /></button>
                                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(prod.id)}><Trash2 size={13} /></button>
                                </div>
                            </div>
                            <div className="divider"></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>MRP</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{prod.mrp ? formatCurrency(prod.mrp) : '—'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Sale Price</div>
                                    <div style={{ fontWeight: 700, color: 'var(--accent2)' }}>{formatCurrency(prod.salePrice)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Purchase Price</div>
                                    <div style={{ fontWeight: 600 }}>{formatCurrency(prod.purchasePrice)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>In Stock</div>
                                    <div style={{ fontWeight: 700, color: prod.stock <= 0 ? 'var(--red)' : prod.stock <= 2 ? 'var(--yellow)' : 'var(--green)' }}>
                                        {prod.stock} {prod.unit}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>GST</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{prod.gst}%</div>
                                </div>
                            </div>
                            {prod.hsn && (
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>HSN: {prod.hsn}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* List view */}
            {view === 'list' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Company</th>
                                    <th style={{ textAlign: 'right' }}>MRP</th>
                                    <th style={{ textAlign: 'right' }}>Sale Price</th>
                                    <th style={{ textAlign: 'right' }}>Purchase Price</th>
                                    <th style={{ textAlign: 'right' }}>In Stock</th>
                                    <th>Unit</th>
                                    <th>GST%</th>
                                    <th>HSN</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={10}><div className="empty-state"><p>No items found</p></div></td></tr>
                                )}
                                {filtered.map(prod => (
                                    <tr key={prod.id}>
                                        <td><div style={{ fontWeight: 600 }}>{prod.name}</div></td>
                                        <td><span className="badge badge-purple">{prod.category}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>{prod.mrp ? formatCurrency(prod.mrp) : '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent2)' }}>{formatCurrency(prod.salePrice)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(prod.purchasePrice)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: prod.stock <= 0 ? 'var(--red)' : prod.stock <= 2 ? 'var(--yellow)' : 'var(--green)' }}>
                                            {prod.stock}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{prod.unit}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{prod.gst}%</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{prod.hsn || '—'}</td>
                                        <td>
                                            <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleOpen(prod)}><Edit2 size={13} /></button>
                                                <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(prod.id)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h2 className="modal-title">{editProduct ? 'Edit Item' : 'Add New Item'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="grid-2" style={{ gap: 14 }}>
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Item Name *</label>
                                        <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or item name" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            Company Name *
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                                                (type to add new)
                                            </span>
                                        </label>
                                        <CompanyCombobox
                                            value={form.category}
                                            onChange={val => setForm(f => ({ ...f, category: val }))}
                                            companies={companies}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Unit</label>
                                        <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                                            {UNITS.map(u => <option key={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">MRP (₹)</label>
                                        <input className="form-control" type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: Number(e.target.value) }))} min="0" step="0.01" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sale Price (₹)</label>
                                        <input className="form-control" type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: Number(e.target.value) }))} min="0" step="0.01" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Purchase Price (₹)</label>
                                        <input className="form-control" type="number" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: Number(e.target.value) }))} min="0" step="0.01" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Opening Stock</label>
                                        <input className="form-control" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} min="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">GST Rate (%)</label>
                                        <select className="form-control" value={form.gst} onChange={e => setForm(f => ({ ...f, gst: Number(e.target.value) }))}>
                                            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">HSN Code</label>
                                        <input className="form-control" value={form.hsn} onChange={e => setForm(f => ({ ...f, hsn: e.target.value }))} placeholder="e.g. 3004" />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Description</label>
                                        <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..."></textarea>
                                    </div>
                                </div>
                                {form.salePrice > 0 && form.purchasePrice > 0 && (
                                    <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 20 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Profit Margin</div>
                                            <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>
                                                {formatCurrency(form.salePrice - form.purchasePrice)} ({(((form.salePrice - form.purchasePrice) / form.purchasePrice) * 100).toFixed(1)}%)
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock Value</div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(form.stock * form.purchasePrice)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editProduct ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}