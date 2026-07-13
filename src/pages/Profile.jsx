import React, { useState, useEffect } from 'react';
import {
    User, Building2, Phone, Mail, MapPin, Hash, Check,
    Upload, Trash2, Github, ShieldCheck, Palette, QrCode, Camera
} from 'lucide-react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

export default function Profile() {
    const { profile, updateProfile, loadProfile } = useStore();
    const [formData, setFormData] = useState({ ...profile });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Pull the latest saved profile from Firestore when this page opens,
    // so edits made on any device/browser show up here — not just whatever
    // was last cached in this browser's localStorage.
    useEffect(() => {
        (async () => {
            try {
                await loadProfile();
            } catch (err) {
                console.error(err);
                toast.error('Could not load latest profile from server, showing cached data');
            } finally {
                setIsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the form in sync once the freshly-loaded profile arrives
    useEffect(() => {
        setFormData({ ...profile });
    }, [profile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile(formData);
            toast.success('Business Profile updated successfully!');
        } catch (err) {
            console.error('Failed to save profile:', err);
            toast.error('Failed to save profile. Please check your connection and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQRUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result;
            setFormData(prev => ({ ...prev, paymentQR: base64 }));
            try {
                await updateProfile({ paymentQR: base64 });
                toast.success('Payment QR saved! It will now be sent on WhatsApp.');
            } catch (err) {
                console.error(err);
                toast.error('Failed to save QR code. Please try again.');
            }
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    };

    const handleQRRemove = async () => {
        setFormData(prev => ({ ...prev, paymentQR: null }));
        try {
            await updateProfile({ paymentQR: null });
            toast.success('Payment QR removed');
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove QR code. Please try again.');
        }
    };

    const handleProfilePicUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image too large. Please choose one under 3MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result;
            setFormData(prev => ({ ...prev, profilePic: base64 }));
            try {
                await updateProfile({ profilePic: base64 });
                toast.success('Profile picture updated!');
            } catch (err) {
                console.error(err);
                toast.error('Failed to save profile picture. Please try again.');
            }
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    };

    const handleProfilePicRemove = async () => {
        setFormData(prev => ({ ...prev, profilePic: null }));
        try {
            await updateProfile({ profilePic: null });
            toast.success('Profile picture removed');
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove profile picture. Please try again.');
        }
    };

    return (
        <div className="profile-container" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Business Profile</h1>
                    <p className="page-subtitle">
                        {isLoading ? 'Loading saved profile...' : 'Manage your company information and settings'}
                    </p>
                </div>
            </div>

            <div className="grid-profile" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24 }}>
                {/* Left side - Avatar & Quick Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
                            <label
                                htmlFor="profile-pic-input"
                                style={{
                                    width: 100, height: 100, borderRadius: '50%',
                                    background: formData.profilePic ? 'transparent' : 'var(--accent2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 32, fontWeight: 800, color: 'white',
                                    boxShadow: '0 8px 16px rgba(124,111,255,0.3)',
                                    cursor: 'pointer', overflow: 'hidden',
                                    position: 'relative',
                                }}
                                title="Click to change profile picture"
                            >
                                {formData.profilePic ? (
                                    <img
                                        src={formData.profilePic}
                                        alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    formData.name?.charAt(0) || 'M'
                                )}

                                {/* Hover overlay with camera icon */}
                                <div
                                    className="avatar-hover-overlay"
                                    style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.45)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                >
                                    <Camera size={22} color="white" />
                                </div>
                            </label>
                            <input
                                id="profile-pic-input"
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePicUpload}
                                style={{ display: 'none' }}
                            />

                            {formData.profilePic && (
                                <button
                                    type="button"
                                    onClick={handleProfilePicRemove}
                                    title="Remove profile picture"
                                    style={{
                                        position: 'absolute', bottom: -2, right: -2,
                                        width: 26, height: 26, borderRadius: '50%',
                                        background: 'var(--red, #E74C3C)', border: '2px solid var(--bg-card, #1A1929)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'white',
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>

                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{formData.name}</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{formData.email}</p>
                        <div className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} /> Verified Account
                        </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Palette size={16} color="var(--accent2)" /> UI Theme
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                            {['#7C6FFF', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6'].map(color => (
                                <div
                                    key={color}
                                    style={{
                                        width: '100%', paddingTop: '100%',
                                        borderRadius: 6, background: color,
                                        cursor: 'pointer', border: '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={async () => {
                                        const newTheme = { themeColor: color };
                                        setFormData(prev => ({ ...prev, ...newTheme }));
                                        try {
                                            await updateProfile(newTheme);
                                            toast.success('Theme color updated!');
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Failed to save theme color. Please try again.');
                                        }
                                    }}
                                />
                            ))}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                            Choose a color to personalize your interface.
                        </p>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <QrCode size={16} color="var(--accent2)" /> Payment QR / Scanner
                        </h3>
                        {formData.paymentQR ? (
                            <div>
                                <img
                                    src={formData.paymentQR}
                                    alt="Payment QR"
                                    style={{ width: '100%', borderRadius: 8, marginBottom: 10, border: '1px solid var(--border)' }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <label className="btn btn-ghost" style={{ flex: 1, cursor: 'pointer', fontSize: 12, justifyContent: 'center' }}>
                                        <Upload size={13} style={{ marginRight: 6 }} /> Replace
                                        <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display: 'none' }} />
                                    </label>
                                    <button type="button" className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleQRRemove}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="btn btn-ghost" style={{ width: '100%', cursor: 'pointer', fontSize: 12, justifyContent: 'center', padding: '14px 0' }}>
                                <Upload size={14} style={{ marginRight: 6 }} /> Upload QR Code
                                <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display: 'none' }} />
                            </label>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                            Upload your UPI/payment scanner. It'll be sent automatically when you tap the WhatsApp icon next to a party.
                        </p>
                    </div>
                </div>

                {/* Right side - Edit Form */}
                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                            <Building2 size={18} color="var(--accent2)" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Company Details</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Company Name</label>
                                <div className="input-group">
                                    <Building2 className="input-icon" size={16} />
                                    <input
                                        className="form-input"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. MediGlow Pharma"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">GSTIN</label>
                                <div className="input-group">
                                    <Hash className="input-icon" size={16} />
                                    <input
                                        className="form-input"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleChange}
                                        placeholder="27AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">Business Address</label>
                            <div className="input-group">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    className="form-input"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Full office/shop address"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="form-group">
                                <label className="form-label">Contact Phone</label>
                                <div className="input-group">
                                    <Phone className="input-icon" size={16} />
                                    <input
                                        className="form-input"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Contact number"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div className="input-group">
                                    <Mail className="input-icon" size={16} />
                                    <input
                                        className="form-input"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Business email"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginTop: 12 }}>
                            <User size={18} color="var(--accent2)" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Owner Details</h3>
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">Owner Name</label>
                            <div className="input-group">
                                <User className="input-icon" size={16} />
                                <input
                                    className="form-input"
                                    name="owner"
                                    value={formData.owner}
                                    onChange={handleChange}
                                    placeholder="Primary contact person"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setFormData({ ...profile })}>
                                Reset Changes
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : <><Check size={16} style={{ marginRight: 6 }} /> Save Profile</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}