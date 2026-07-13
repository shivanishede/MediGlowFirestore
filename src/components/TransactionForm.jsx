import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, UserPlus, PackagePlus } from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/billPdf';
import { partiesService, itemsService, companiesService } from '../services/firestoreService';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit'];

// ─── Quick Add Party Modal ────────────────────────────────────────────────────
function QuickAddParty({ name, onSave, onCancel }) {
    const [form, setForm] = useState({ name: name || '', phone: '', type: 'customer', email: '', address: '', balance: 0 });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        try {
            const ref = await partiesService.add({
                name: form.name.trim(),
                phone: form.phone.trim(),
                type: form.type,
                email: form.email.trim(),
                address: form.address.trim(),
                balance: Number(form.balance) || 0,
            });
            toast.success(`${form.type === 'customer' ? 'Customer' : 'Supplier'} "${form.name}" added!`);
            onSave({ id: ref.id, name: form.name.trim(), type: form.type, phone: form.phone.trim() });
        } catch (e) {
            toast.error('Failed to add party');
        }
        setSaving(false);
    };

    return (
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)', marginBottom: 10 }}>
                <UserPlus size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Quick Add New Party
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, overflow: 'visible' }}>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Party name" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Phone Number</label>
                    <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile number" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Email Address / GSTIN</label>
                    <input className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email or tax info" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Opening Balance (₹)</label>
                    <input type="number" className="form-control" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} min="0" step="0.01" style={{ fontSize: 12 }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Address</label>
                    <input className="form-control" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" style={{ fontSize: 12 }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Party Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['customer', 'supplier'].map(t => (
                            <button key={t} type="button"
                                onClick={() => setForm(f => ({ ...f, type: t }))}
                                style={{
                                    padding: '5px 14px', border: '1px solid', borderRadius: 'var(--radius-sm)',
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                                    background: form.type === t ? (t === 'customer' ? 'rgba(46,204,113,0.15)' : 'rgba(243,156,18,0.15)') : 'transparent',
                                    color: form.type === t ? (t === 'customer' ? '#2ECC71' : '#F39C12') : 'var(--text-muted)',
                                    borderColor: form.type === t ? (t === 'customer' ? '#2ECC71' : '#F39C12') : 'var(--border)',
                                }}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ fontSize: 12 }}>
                    {saving ? 'Saving...' : 'Add Party'}
                </button>
            </div>
        </div>
    );
}

// ─── Quick Add Item Modal ─────────────────────────────────────────────────────
function QuickAddItem({ name, onSave, onCancel }) {
    const [form, setForm] = useState({ name: name || '', category: '', purchasePrice: 0, sellingPrice: 0, mrp: 0, stock: 0, unit: 'Pcs', gst: 0, hsn: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [showCompanyDrop, setShowCompanyDrop] = useState(false);
    const companyRef = useRef(null);

    useEffect(() => {
        companiesService.getAll().then(setCompanies).catch(() => {});
    }, []);

    // Close company dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (companyRef.current && !companyRef.current.contains(e.target)) {
                setShowCompanyDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredCompanies = companies.filter(c =>
        c.toLowerCase().includes(form.category.toLowerCase())
    );

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Item name is required'); return; }
        setSaving(true);
        try {
            // If a company name was typed, auto-save it to the companies database
            if (form.category.trim()) {
                await companiesService.add(form.category.trim());
            }
            const ref = await itemsService.add({
                item_name: form.name.trim(),
                category: form.category.trim(),
                purchase_price: Number(form.purchasePrice),
                selling_price: Number(form.sellingPrice),
                mrp: Number(form.mrp),
                stock: Number(form.stock),
                unit: form.unit,
                gst: Number(form.gst),
                hsn: form.hsn.trim(),
                description: form.description.trim(),
            });
            toast.success(`Item "${form.name}" added!`);
            onSave({
                id: ref.id,
                item_name: form.name.trim(),
                purchase_price: Number(form.purchasePrice),
                selling_price: Number(form.sellingPrice),
                mrp: Number(form.mrp),
                stock: Number(form.stock),
                unit: form.unit,
                gst: Number(form.gst),
            });
        } catch (e) {
            toast.error('Failed to add item');
        }
        setSaving(false);
    };

    return (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, marginTop: 4, minWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'visible' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)', marginBottom: 10 }}>
                <PackagePlus size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Quick Add New Item
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Item Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or item name" style={{ fontSize: 12 }} />
                </div>
                <div style={{ gridColumn: '1/-1', position: 'relative', overflow: 'visible' }} ref={companyRef}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Company Name</label>
                    <input
                        className="form-control"
                        value={form.category}
                        onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setShowCompanyDrop(true); }}
                        onFocus={() => setShowCompanyDrop(true)}
                        placeholder="Type or select company name"
                        style={{ fontSize: 12 }}
                        autoComplete="off"
                    />
                    {showCompanyDrop && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                            background: 'var(--bg-card2)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', marginTop: 2,
                            maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                        }}>
                            {filteredCompanies.length === 0 ? (
                                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                                    {form.category.trim() ? `"${form.category}" will be added as new company` : 'No companies yet — type a name to add'}
                                </div>
                            ) : (
                                filteredCompanies.map(c => (
                                    <div
                                        key={c}
                                        onMouseDown={() => { setForm(f => ({ ...f, category: c })); setShowCompanyDrop(false); }}
                                        style={{
                                            padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                                            color: 'var(--text-primary)',
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                    >
                                        {c}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>MRP (₹)</label>
                    <input type="number" className="form-control" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} min="0" step="0.01" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Sale Price (₹)</label>
                    <input type="number" className="form-control" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} min="0" step="0.01" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Purchase Price (₹)</label>
                    <input type="number" className="form-control" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} min="0" step="0.01" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Opening Stock</label>
                    <input type="number" className="form-control" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min="0" style={{ fontSize: 12 }} />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Unit</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ fontSize: 12 }}>
                        {['Pcs', 'Box', 'Strip', 'Bottle', 'Pack', 'Kg', 'Ltr', 'Dozen', 'Set'].map(u => <option key={u}>{u}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>GST Rate (%)</label>
                    <select className="form-control" value={form.gst} onChange={e => setForm(f => ({ ...f, gst: e.target.value }))} style={{ fontSize: 12 }}>
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>HSN Code</label>
                    <input className="form-control" value={form.hsn} onChange={e => setForm(f => ({ ...f, hsn: e.target.value }))} placeholder="e.g. 3004" style={{ fontSize: 12 }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Description</label>
                    <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." style={{ fontSize: 12, resize: 'vertical' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ fontSize: 12 }}>
                    {saving ? 'Saving...' : 'Add Item'}
                </button>
            </div>
        </div>
    );
}

// ─── Main TransactionForm ─────────────────────────────────────────────────────
export default function TransactionForm({ type, onClose, onSave, title, editData }) {
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const refreshParties = () => partiesService.getAll().then(data => setCustomers(data)).catch(console.error);
    const refreshItems  = () => itemsService.getAll().then(data => setProducts(data)).catch(console.error);

    useEffect(() => {
        refreshParties();
        refreshItems();
    }, []);

    const isExpense = type === 'expense';
    const isPayment = type === 'payment_in' || type === 'payment_out';
    const isP2P = type === 'p2p';

    // ── Draft auto-save (survives crashes / power cuts / accidental closes) ──
    // Each transaction type + editData.id gets its own slot, so editing invoice #12
    // never clobbers a half-filled "new sale" draft, and vice-versa.
    const draftKey = `mediglow_draft_${type}_${editData?.id || 'new'}`;
    const draftRestoredRef = useRef(false);

    const loadDraft = () => {
        try {
            const raw = localStorage.getItem(draftKey);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const [form, setForm] = useState(() => {
        const savedDraft = loadDraft();
        return {
            customerId: savedDraft?.customerId ?? editData?.customerId ?? '',
            customerName: savedDraft?.customerName ?? editData?.customerName ?? '',
            date: savedDraft?.date ?? editData?.date ?? new Date().toISOString().split('T')[0],
            items: savedDraft?.items ?? editData?.items ?? [],
            subtotal: savedDraft?.subtotal ?? editData?.subtotal ?? 0,
            discount: savedDraft?.discount ?? editData?.discount ?? 0,
            tax: savedDraft?.tax ?? editData?.tax ?? 0,
            total: savedDraft?.total ?? editData?.total ?? 0,
            paid: savedDraft?.paid ?? editData?.paid ?? 0,
            balance: savedDraft?.balance ?? editData?.balance ?? 0,
            notes: savedDraft?.notes ?? editData?.notes ?? '',
            paymentMode: savedDraft?.paymentMode ?? editData?.paymentMode ?? 'Cash',
            status: savedDraft?.status ?? editData?.status ?? 'completed',
            category: savedDraft?.category ?? editData?.category ?? 'Rent',
            amount: savedDraft?.amount ?? editData?.amount ?? 0,
            fromParty: savedDraft?.fromParty ?? editData?.fromParty ?? '',
            toParty: savedDraft?.toParty ?? editData?.toParty ?? '',
            transferAmount: savedDraft?.transferAmount ?? editData?.transferAmount ?? 0,
        };
    });

    // Let the user know their unsaved work came back, and give them the option to start clean
    useEffect(() => {
        const savedDraft = loadDraft();
        if (savedDraft && !draftRestoredRef.current) {
            draftRestoredRef.current = true;
            toast((t) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    Unsaved draft restored
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => {
                            localStorage.removeItem(draftKey);
                            toast.dismiss(t.id);
                            window.location.reload();
                        }}
                    >
                        Discard & start fresh
                    </button>
                </span>
            ), { duration: 6000, icon: '📝' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Autosave every change (debounced) so a crash/power-cut never loses data
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(form));
            } catch {
                // storage full or unavailable — silently skip, nothing critical is lost immediately
            }
        }, 500);
        return () => clearTimeout(t);
    }, [form, draftKey]);

    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showQuickAddItem, setShowQuickAddItem] = useState(false);
    const [custSearch, setCustSearch] = useState(() => loadDraft()?.customerName || editData?.customerName || '');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const [showQuickAddParty, setShowQuickAddParty] = useState(false);
    const [selectedPartyType, setSelectedPartyType] = useState('');

    const itemDropRef = useRef(null);
    const quickAddItemRef = useRef(null);

    // Close item dropdown on outside click, but NOT when interacting with quickAdd panel
    useEffect(() => {
        const handler = (e) => {
            if (quickAddItemRef.current && quickAddItemRef.current.contains(e.target)) return;
            if (itemDropRef.current && !itemDropRef.current.contains(e.target)) {
                setShowItemDropdown(false);
                setShowQuickAddItem(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredProds = products.filter(p =>
        (p.item_name || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
        (p.id?.toString() || '').includes(itemSearch.toLowerCase())
    );
    const filteredCusts = customers.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase())
    );

    // Check if typed party name has no match
    const noPartyMatch = custSearch.trim() && filteredCusts.length === 0;
    // Show "add item" option whenever typed name doesn't exactly match any existing item
    const noItemMatch = itemSearch.trim() && !filteredProds.some(p => (p.item_name || '').toLowerCase() === itemSearch.trim().toLowerCase());

    const selectParty = (c) => {
        setForm(f => ({ ...f, customerId: c.id, customerName: c.name }));
        setCustSearch(c.name);
        setSelectedPartyType(c.type || '');
        setShowCustDropdown(false);
        setShowQuickAddParty(false);
    };

    const addItem = (product) => {
        const existing = form.items.find(i => i.productId === product.id);
        if (existing) {
            updateItemQty(product.id, existing.qty + 1);
        } else {
            const newItem = {
                productId: product.id,
                name: product.item_name,
                qty: 0,
                unit: product.unit || 'Pcs',
                mrp: product.mrp || 0,
                price: type === 'purchase' || type === 'purchase_return' ? product.purchase_price : product.selling_price,
                discount: 0,
                gst: product.gst || 0,
                amount: 0,
            };
            setForm(f => ({ ...f, items: [newItem, ...f.items] }));
        }
        setItemSearch('');
        setShowItemDropdown(false);
        setShowQuickAddItem(false);
    };

    const updateItem = (productId, field, value) => {
        setForm(f => {
            const items = f.items.map(item => {
                if (item.productId !== productId) return item;
                const updated = { ...item, [field]: value };
                const base = updated.qty * updated.price;
                const disc = base * (updated.discount / 100);
                const gstAmt = (base - disc) * (updated.gst / 100);
                updated.amount = Math.round((base - disc + gstAmt) * 100) / 100;
                return updated;
            });
            return { ...f, items };
        });
    };

    const updateItemQty = (productId, qty) => updateItem(productId, 'qty', Math.max(1, qty));
    const removeItem = (productId) => setForm(f => ({ ...f, items: f.items.filter(i => i.productId !== productId) }));

    useEffect(() => {
        if (isExpense || isPayment || isP2P) return;
        const subtotal = form.items.reduce((s, i) => {
            const base = i.qty * i.price;
            return s + base - base * (i.discount / 100);
        }, 0);
        const tax = form.items.reduce((s, i) => {
            const base = i.qty * i.price;
            const after_disc = base - base * (i.discount / 100);
            return s + after_disc * (i.gst / 100);
        }, 0);
        const discountAmt = subtotal * (form.discount / 100);
        const total = Math.round((subtotal - discountAmt + tax) * 100) / 100;
        const balance = Math.max(0, total - (Number(form.paid) || 0));
        setForm(f => ({ ...f, subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total, balance }));
    }, [form.items, form.discount, form.paid]);

    const handlePaidChange = (val) => {
        const paid = Math.min(Number(val) || 0, form.total);
        setForm(f => ({ ...f, paid, balance: Math.max(0, f.total - paid) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isExpense && !isPayment && !isP2P && form.items.length === 0) { toast.error('Please add at least one item'); return; }
        if (!isExpense && !isPayment && !isP2P && !form.customerName) { toast.error('Please select a party'); return; }
        localStorage.removeItem(draftKey); // only clear once they actually hit Save/Update
        onSave(form);
    };

    const EXPENSE_CATS = ['Rent', 'Salary', 'Electricity', 'Transport', 'Maintenance', 'Marketing', 'Miscellaneous', 'Stationery', 'Telephone', 'Insurance'];

    // Color coding for party type
    const partyColor = selectedPartyType === 'customer' ? '#2ECC71' : selectedPartyType === 'supplier' ? '#F39C12' : 'var(--green)';
    const partyBg   = selectedPartyType === 'customer' ? 'rgba(46,204,113,0.1)' : selectedPartyType === 'supplier' ? 'rgba(243,156,18,0.1)' : 'transparent';

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-xl">
                <div className="modal-header">
                    <h2 className="modal-title">{editData ? 'Edit' : 'New'} {title}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">

                        {/* ── Expense Form ── */}
                        {isExpense && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Expense Category</label>
                                    <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value), paid: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Description / remarks..."></textarea>
                                </div>
                            </div>
                        )}

                        {/* ── P2P Transfer Form ── */}
                        {isP2P && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">From Party</label>
                                    <select className="form-control" value={form.fromParty} onChange={e => setForm(f => ({ ...f, fromParty: e.target.value }))} required>
                                        <option value="">Select Party</option>
                                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Party</label>
                                    <select className="form-control" value={form.toParty} onChange={e => setForm(f => ({ ...f, toParty: e.target.value }))} required>
                                        <option value="">Select Party</option>
                                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Transfer Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.transferAmount} onChange={e => setForm(f => ({ ...f, transferAmount: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <input type="text" className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarks..." />
                                </div>
                            </div>
                        )}

                        {/* ── Payment Form ── */}
                        {isPayment && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">Party Name</label>
                                    <input className="form-control" value={custSearch}
                                        onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); setShowQuickAddParty(false); }}
                                        placeholder="Search party..." autoComplete="off" required />
                                    {showCustDropdown && custSearch && filteredCusts.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 200, overflowY: 'auto' }}>
                                            {filteredCusts.map(c => (
                                                <div key={c.id}
                                                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                                                    onMouseDown={(e) => { e.preventDefault(); selectParty(c); }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: c.type === 'customer' ? 'rgba(46,204,113,0.15)' : 'rgba(243,156,18,0.15)', color: c.type === 'customer' ? '#2ECC71' : '#F39C12', textTransform: 'uppercase' }}>{c.type || 'party'}</span>
                                                    <span style={{ fontSize: 13 }}>{c.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {noPartyMatch && showCustDropdown && !showQuickAddParty && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20 }}>
                                            <div onMouseDown={(e) => { e.preventDefault(); setShowQuickAddParty(true); setShowCustDropdown(false); }}
                                                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                                <UserPlus size={14} /> Add "{custSearch}" as new party
                                            </div>
                                        </div>
                                    )}
                                    {showQuickAddParty && (
                                        <QuickAddParty name={custSearch} onSave={(party) => { refreshParties(); selectParty(party); setShowQuickAddParty(false); }} onCancel={() => setShowQuickAddParty(false)} />
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Notes / Reference</label>
                                    <input type="text" className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reference number, remarks..." />
                                </div>
                            </div>
                        )}

                        {/* ── Main Transaction Form (Sale / Purchase / Returns etc.) ── */}
                        {!isExpense && !isPayment && !isP2P && (
                            <>
                                <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>

                                    {/* ── Party selector ── */}
                                    <div className="form-group" style={{ position: 'relative', gridColumn: '1/3' }}>
                                        <label className="form-label">Party / Customer</label>
                                        <div className="search-bar" style={{ padding: '8px 12px' }}>
                                            <Search size={14} color="var(--text-muted)" />
                                            <input value={custSearch}
                                                onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); setShowQuickAddParty(false); setSelectedPartyType(''); setForm(f => ({ ...f, customerId: '', customerName: '' })); }}
                                                onFocus={() => setShowCustDropdown(true)}
                                                placeholder="Search party name..." autoComplete="off" />
                                        </div>

                                        {/* Party dropdown list */}
                                        {showCustDropdown && custSearch && filteredCusts.length > 0 && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 200, overflowY: 'auto' }}>
                                                {filteredCusts.map(c => (
                                                    <div key={c.id}
                                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                                                        onMouseDown={(e) => { e.preventDefault(); selectParty(c); }}>
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase',
                                                            background: c.type === 'customer' ? 'rgba(46,204,113,0.15)' : 'rgba(243,156,18,0.15)',
                                                            color: c.type === 'customer' ? '#2ECC71' : '#F39C12',
                                                        }}>{c.type || 'party'}</span>
                                                        {c.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* No match — offer to add */}
                                        {noPartyMatch && showCustDropdown && !showQuickAddParty && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20 }}>
                                                <div onMouseDown={(e) => { e.preventDefault(); setShowQuickAddParty(true); setShowCustDropdown(false); }}
                                                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                                    <UserPlus size={14} /> Add "{custSearch}" as new party
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick add party inline form */}
                                        {showQuickAddParty && (
                                            <QuickAddParty name={custSearch}
                                                onSave={(party) => { refreshParties(); selectParty(party); setShowQuickAddParty(false); }}
                                                onCancel={() => setShowQuickAddParty(false)} />
                                        )}

                                        {/* Selected party indicator with color */}
                                        {form.customerName && !showQuickAddParty && (
                                            <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, display: 'inline-block', background: partyBg, color: partyColor }}>
                                                ✓ {form.customerName}
                                                {selectedPartyType && <span style={{ marginLeft: 5, opacity: 0.75, textTransform: 'uppercase', fontSize: 9 }}>({selectedPartyType})</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Date</label>
                                        <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                    </div>
                                </div>

                                {/* ── Items section ── */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Items / Products</label>
                                        <div style={{ position: 'relative' }} ref={itemDropRef}>
                                            <div className="search-bar" style={{ padding: '6px 12px', minWidth: 280 }}>
                                                <Search size={14} color="var(--text-muted)" />
                                                <input value={itemSearch}
                                                    onChange={e => { setItemSearch(e.target.value); setShowItemDropdown(true); setShowQuickAddItem(false); }}
                                                    onFocus={() => setShowItemDropdown(true)}
                                                    placeholder="Search & add item..." />
                                            </div>

                                            {/* Item dropdown */}
                                            {showItemDropdown && !showQuickAddItem && (
                                                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 240, overflowY: 'auto', minWidth: 320, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                                                    {filteredProds.slice(0, 10).map(p => (
                                                        <div key={p.id}
                                                            onMouseDown={(e) => { e.preventDefault(); addItem(p); }}
                                                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                            className="nav-item">
                                                            <div>
                                                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.item_name}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {p.stock} {p.unit || 'Pcs'}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: 12 }}>
                                                                <div style={{ color: 'var(--accent2)' }}>₹{p.selling_price}</div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>GST: {p.gst || 0}%</div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* No match — offer to add new item */}
                                                    {noItemMatch && (
                                                        <div
                                                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickAddItem(true); setShowItemDropdown(false); }}
                                                            style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, borderTop: filteredProds.length ? '1px solid var(--border)' : 'none' }}>
                                                            <PackagePlus size={14} /> Add "{itemSearch}" as new item
                                                        </div>
                                                    )}

                                                    {filteredProds.length === 0 && !noItemMatch && (
                                                        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>No items found</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Quick add item inline form */}
                                            {showQuickAddItem && (
                                                <div ref={quickAddItemRef}>
                                                    <QuickAddItem name={itemSearch}
                                                        onSave={(item) => { refreshItems(); addItem(item); setShowQuickAddItem(false); }}
                                                        onCancel={() => { setShowQuickAddItem(false); setShowItemDropdown(true); }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items table */}
                                    <div className="items-table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>#</th><th>Item</th><th>Qty</th><th>Unit</th>
                                                    <th>Rate (₹)</th><th>Disc%</th><th>GST%</th><th>Amount</th><th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {form.items.length === 0 && (
                                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items added yet. Search and add products above.</td></tr>
                                                )}
                                                {form.items.map((item, i) => (
                                                    <tr key={item.productId}>
                                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                        <td><div style={{ fontWeight: 500 }}>{item.name}</div></td>
                                                        <td><input type="number" className="form-control" value={item.qty} onChange={e => updateItem(item.productId, 'qty', Math.max(1, Number(e.target.value)))} min="1" style={{ width: 70 }} /></td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                                                        <td><input type="number" className="form-control" value={item.price} onChange={e => updateItem(item.productId, 'price', Number(e.target.value))} min="0" step="0.01" style={{ width: 90 }} /></td>
                                                        <td><input type="number" className="form-control" value={item.discount} onChange={e => updateItem(item.productId, 'discount', Math.min(100, Number(e.target.value)))} min="0" max="100" style={{ width: 70 }} /></td>
                                                        <td><input type="number" className="form-control" value={item.gst} onChange={e => updateItem(item.productId, 'gst', Number(e.target.value))} min="0" max="28" style={{ width: 70 }} /></td>
                                                        <td><strong>₹{item.amount?.toFixed(2)}</strong></td>
                                                        <td><button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.productId)}><Trash2 size={14} /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* ── Totals ── */}
                                <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div className="form-group">
                                            <label className="form-label">Notes / Remarks</label>
                                            <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional remarks..."></textarea>
                                        </div>
                                        <div className="form-group" style={{ marginTop: 12 }}>
                                            <label className="form-label">Payment Mode</label>
                                            <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ minWidth: 280 }}>
                                        <div className="card-sm">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                                <span>Subtotal</span><span>{formatCurrency(form.subtotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', fontSize: 13 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Discount%</span>
                                                <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Math.min(100, Number(e.target.value)) }))} min="0" max="100" className="form-control" style={{ width: 80, textAlign: 'right' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                                <span>Tax/GST</span><span>{formatCurrency(form.tax)}</span>
                                            </div>
                                            <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700, fontSize: 16, color: 'var(--accent2)' }}>
                                                <span>Total</span><span>{formatCurrency(form.total)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', fontSize: 13 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Paid (₹)</span>
                                                <input type="number" value={form.paid} onChange={e => handlePaidChange(e.target.value)} min="0" max={form.total} className="form-control" style={{ width: 100, textAlign: 'right' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, color: form.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                                                <span>Balance Due</span><span>{formatCurrency(form.balance)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} />
                            {editData ? 'Update' : 'Save'} {title}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}