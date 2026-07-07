import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { initDB, openDB } from './database.js';
import nodemailer from 'nodemailer';

// Configure your Email sending account here
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shivanishede69@gmail.com', // 👈 PLEASE REPLACE THIS WITH YOUR GMAIL ADDRESS
        pass: 'ktmjzgsvtzwcnsxr'
    }
});

const app = express();
const PORT = 5000;
const JWT_SECRET = 'mediglow_super_secret_key_123'; // Hardcoded for simplicity

// Middleware
app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Allow backend to read JSON from frontend

// Initialize database
let db;
initDB().then(database => {
    db = database;
}).catch(err => {
    console.error("Failed to initialize database:", err);
});

// Store OTPs temporarily in memory (for dev/demo: ideally use Redis)
const otpStore = new Map();

// === AUTHENTICATION ENDPOINTS ===

// Send OTP via Email
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email address is required' });

        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to store, clean up after 5 minutes
        otpStore.set(email, otp);
        setTimeout(() => otpStore.delete(email), 5 * 60 * 1000);

        console.log(`[EMAIL DEV MOCK] Generated OTP for ${email} is: ${otp}`);

        // Try to send real email
        try {
            await transporter.sendMail({
                from: '"MediGlow App" <mediglowapp@gmail.com>',
                to: email,
                subject: 'Your MediGlow OTP Code',
                text: `Hello!\n\nYour 6-digit verification code is: ${otp}\n\nThis code is valid for 5 minutes.\n\nThanks,\nMediGlow Team`
            });
            console.log("Real email sent successfully!");
        } catch (mailErr) {
            console.log('Could not send real email (needs credentials). OTP is in console.');
        }

        res.json({ success: true, message: 'OTP sent! (Check console if email fails)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, otp } = req.body;
        if (!username || !email || !password || !otp) {
            return res.status(400).json({ error: 'All fields (including email & OTP) are required' });
        }

        const validOtp = otpStore.get(email);
        if (!validOtp || validOtp !== otp) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Username or Email already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Insert with email
        const result = await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        // Cleanup OTP
        otpStore.delete(email);

        const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ success: true, token, user: { id: result.lastID, username, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Dashboard Metrics
app.get('/api/dashboard', async (req, res) => {
    try {
        // 1. Total Sales, Purchases, Expenses (Dynamic current month)
        const currentMonth = new Date().toISOString().slice(0, 7) + '-%';

        const sales = await db.get(`SELECT SUM(total_amount) as total FROM transactions WHERE type = 'SALE' AND date LIKE ?`, [currentMonth]);
        const purchases = await db.get(`SELECT SUM(total_amount) as total FROM transactions WHERE type = 'PURCHASE' AND date LIKE ?`, [currentMonth]);
        const expenses = await db.get(`SELECT SUM(total_amount) as total FROM transactions WHERE type = 'EXPENSE' AND date LIKE ?`, [currentMonth]);

        // 2. You'll Get (Receivables)
        const receivables = await db.get(`SELECT SUM(total_amount - amount_paid) as total FROM transactions WHERE type = 'SALE' AND total_amount > amount_paid`);

        // 3. You'll Give (Payables)
        const payables = await db.get(`SELECT SUM(total_amount - amount_paid) as total FROM transactions WHERE type = 'PURCHASE' AND total_amount > amount_paid`);

        // 4. Counts
        const partyCount = await db.get(`SELECT COUNT(*) as total FROM parties`);
        const itemCount = await db.get(`SELECT COUNT(*) as total FROM items`);
        const pendingSales = await db.get(`SELECT COUNT(*) as total FROM transactions WHERE type = 'SALE' AND payment_status != 'PAID'`);

        res.json({
            totalSales: sales.total || 0,
            totalPurchases: purchases.total || 0,
            totalExpenses: expenses.total || 0,
            netProfit: (sales.total || 0) - (purchases.total || 0) - (expenses.total || 0),
            youllGet: receivables.total || 0,
            youllGive: payables.total || 0,
            totalParties: partyCount.total || 0,
            totalItems: itemCount.total || 0,
            pendingSales: pendingSales.total || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Trend Line for Chart
app.get('/api/dashboard/trend', async (req, res) => {
    try {
        // This query groups by exactly year-month and gives totals
        // A more advanced query trims 'YYYY-MM-DD' to 'YYYY-MM'
        const salesTrend = await db.all(`
      SELECT substr(date, 1, 7) as month, SUM(total_amount) as total 
      FROM transactions WHERE type = 'SALE' GROUP BY month ORDER BY month
    `);

        const purchaseTrend = await db.all(`
      SELECT substr(date, 1, 7) as month, SUM(total_amount) as total 
      FROM transactions WHERE type = 'PURCHASE' GROUP BY month ORDER BY month
    `);

        res.json({
            sales: salesTrend,
            purchases: purchaseTrend
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Recent Transactions List
app.get('/api/dashboard/recent', async (req, res) => {
    try {
        const recent = await db.all(`
      SELECT t.id, t.type, t.date, t.total_amount, t.payment_status, p.name as party_name 
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      ORDER BY t.date DESC, t.id DESC
      LIMIT 5
    `);
        res.json(recent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === PARTY / CUSTOMER ENDPOINTS ===

// GET all parties
app.get('/api/parties', async (req, res) => {
    try {
        const parties = await db.all('SELECT * FROM parties ORDER BY created_at DESC');

        // Also fetch transaction balances for each party 
        for (let party of parties) {
            // For customers: Balance = Opening Balance + (Total Unpaid Sales)
            if (party.type === 'CUSTOMER') {
                const trRes = await db.get(
                    `SELECT SUM(total_amount - amount_paid) as pending
                     FROM transactions 
                     WHERE party_id = ? AND type = 'SALE'`,
                    [party.id]
                );
                party.balanceDue = (party.balance || 0) + (trRes.pending || 0);
            }
            // For Suppliers: Balance = Opening Balance - (Total Unpaid Purchases)
            else {
                const trRes = await db.get(
                    `SELECT SUM(total_amount - amount_paid) as pending 
                     FROM transactions 
                     WHERE party_id = ? AND type = 'PURCHASE'`,
                    [party.id]
                );
                // Can be negative if they owe us, positive if we owe them. 
                // We'll keep it absolute positive here for display as "Payable".
                party.balanceDue = (party.balance || 0) + (trRes.pending || 0);
            }
        }

        res.json(parties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new party
app.post('/api/parties', async (req, res) => {
    try {
        const { type, name, phone, email, address, gstin, balance } = req.body;
        const result = await db.run(
            'INSERT INTO parties (type, name, phone, email, address, gstin, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [type || 'CUSTOMER', name, phone, email, address, gstin, balance || 0]
        );
        res.status(201).json({ id: result.lastID, type, name, phone, email, address, gstin, balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT (Update) a party
app.put('/api/parties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, name, phone, email, address, gstin, balance } = req.body;
        await db.run(
            'UPDATE parties SET type = ?, name = ?, phone = ?, email = ?, address = ?, gstin = ?, balance = ? WHERE id = ?',
            [type, name, phone, email, address, gstin, balance, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a party
app.delete('/api/parties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM parties WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// QUICK PAY TRANSACTION (Mark as Paid)
app.put('/api/transactions/:id/pay', async (req, res) => {
    try {
        await db.run(
            `UPDATE transactions SET amount_paid = total_amount, payment_status = 'PAID' WHERE id = ?`,
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === INVENTORY / ITEMS ENDPOINTS ===

app.get('/api/items', async (req, res) => {
    try {
        const items = await db.all('SELECT * FROM items ORDER BY created_at DESC');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const { item_name, category, selling_price, purchase_price, stock, unit, hsn, gst, description } = req.body;
        const result = await db.run(
            'INSERT INTO items (item_name, category, selling_price, purchase_price, stock, unit, hsn, gst, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [item_name, category || 'General', selling_price || 0, purchase_price || 0, stock || 0, unit || 'Pcs', hsn || '', gst || 0, description || '']
        );
        res.status(201).json({ id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/items/:id', async (req, res) => {
    try {
        const { item_name, category, selling_price, purchase_price, stock, unit, hsn, gst, description } = req.body;
        await db.run(
            'UPDATE items SET item_name = ?, category = ?, selling_price = ?, purchase_price = ?, stock = ?, unit = ?, hsn = ?, gst = ?, description = ? WHERE id = ?',
            [item_name, category || 'General', selling_price || 0, purchase_price || 0, stock || 0, unit || 'Pcs', hsn || '', gst || 0, description || '', req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/items/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM items WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === TRANSACTIONS (SALES, PURCHASES, etc) ENDPOINTS ===

// GET transactions (with optional ?type= filter)
app.get('/api/transactions', async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT t.*, p.name as customerName 
            FROM transactions t
            LEFT JOIN parties p ON t.party_id = p.id
        `;
        const params = [];
        if (type) {
            query += ` WHERE t.type = ?`;
            params.push(type.toUpperCase());
        }
        query += ` ORDER BY t.date DESC, t.id DESC`;

        const transactions = await db.all(query, params);

        // Fetch items for each transaction
        for (let t of transactions) {
            // we attach a virtual 'balance' just for frontend styling compatibility
            t.balance = t.total_amount - t.amount_paid;
            // attach invoiceNo aliases
            t.invoiceNo = t.invoice_number;
            t.paid = t.amount_paid;
            t.total = t.total_amount;

            t.items = await db.all(`
                SELECT ti.*, i.item_name as name
                FROM transaction_items ti
                LEFT JOIN items i ON ti.item_id = i.id
                WHERE ti.transaction_id = ?
            `, [t.id]);
        }

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const {
            type, customerId, date, subtotal, discount, tax, total, paid, notes, paymentMode, items, fromParty, toParty
        } = req.body;

        // Generate an invoice number (e.g. SALE-1004)
        const upperType = type ? type.toString().toUpperCase() : 'UNKNOWN';
        const prefix = upperType.replace('_', '').substring(0, 4);
        const countRes = await db.get(`SELECT COUNT(*) as count FROM transactions WHERE type = ?`, [upperType]);
        const invoice_number = `${prefix}-${1000 + (countRes.count || 0) + 1}`;

        const status = paid >= total ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

        // Insert Transaction
        const tResult = await db.run(`
            INSERT INTO transactions 
            (type, invoice_number, party_id, date, subtotal, discount, tax_amount, total_amount, amount_paid, payment_status, payment_mode, notes, from_party, to_party)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            upperType, invoice_number, customerId || null, date, subtotal || 0, discount || 0, tax || 0, total || 0, paid || 0, status, paymentMode || 'Cash', notes || '', fromParty || null, toParty || null
        ]);

        const transactionId = tResult.lastID;

        // Insert Items & adjust stock
        if (items && items.length > 0) {
            for (let item of items) {
                await db.run(`
                    INSERT INTO transaction_items
                    (transaction_id, item_id, quantity, price_per_unit, discount_percent, gst_percent, amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    transactionId, item.productId, item.qty, item.price, item.discount || 0, item.gst || 0, item.amount || 0
                ]);

                // Live inventory updating!
                if (type === 'sale') {
                    await db.run(`UPDATE items SET stock = stock - ? WHERE id = ?`, [item.qty, item.productId]);
                } else if (type === 'purchase') {
                    await db.run(`UPDATE items SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
                } else if (type === 'sale_return') {
                    await db.run(`UPDATE items SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
                }
            }
        }

        res.status(201).json({ success: true, transactionId, invoiceNo: invoice_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT transaction (Update existing) 
app.put('/api/transactions/:id', async (req, res) => {
    try {
        const {
            date, total, paid, notes, paymentMode, fromParty, toParty
        } = req.body;

        const status = paid >= total ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

        await db.run(`
            UPDATE transactions 
            SET date = ?, total_amount = ?, amount_paid = ?, payment_status = ?, payment_mode = ?, notes = ?, from_party = ?, to_party = ?
            WHERE id = ?
        `, [
            date, total || 0, paid || 0, status, paymentMode || 'Cash', notes || '', fromParty || null, toParty || null, req.params.id
        ]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
        await db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
