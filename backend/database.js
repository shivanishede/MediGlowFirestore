import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open a connection to the SQLite database
export async function openDB() {
    return open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
}

// Initialize tables and add dummy data for the dashboard
export async function initDB() {
    const db = await openDB();

    // 1. Create Parties Table (Customers & Suppliers)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('CUSTOMER', 'SUPPLIER')),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Safely add missing columns if the user's database already exists from the first step
    try { await db.exec("ALTER TABLE parties ADD COLUMN email TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE parties ADD COLUMN address TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE parties ADD COLUMN gstin TEXT"); } catch (e) { }

    // 2. Create Items Table (Inventory)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT,
      selling_price REAL NOT NULL,
      purchase_price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    try { await db.exec("ALTER TABLE items ADD COLUMN unit TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE items ADD COLUMN hsn TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE items ADD COLUMN gst REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE items ADD COLUMN description TEXT"); } catch (e) { }

    // 3. Create Transactions Table (Sales, Purchases, Expenses)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      invoice_number TEXT,
      party_id INTEGER,
      date TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      amount_paid REAL NOT NULL,
      payment_status TEXT NOT NULL,
      payment_mode TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );
  `);

    try { await db.exec("ALTER TABLE transactions ADD COLUMN invoice_number TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN subtotal REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN tax_amount REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN discount REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN payment_mode TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN notes TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN from_party TEXT"); } catch (e) { }
    try { await db.exec("ALTER TABLE transactions ADD COLUMN to_party TEXT"); } catch (e) { }

    // 4. Create Transaction Items Table (Details of bills)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      item_id INTEGER,
      quantity INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      gst_percent REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
  `);

    try { await db.exec("ALTER TABLE transaction_items ADD COLUMN discount_percent REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE transaction_items ADD COLUMN gst_percent REAL DEFAULT 0"); } catch (e) { }
    try { await db.exec("ALTER TABLE transaction_items ADD COLUMN amount REAL DEFAULT 0"); } catch (e) { }

    // 5. Create Users Table (Authentication)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    try { await db.exec("ALTER TABLE users ADD COLUMN mobile TEXT"); } catch (e) { }
    try { await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)"); } catch (e) { }
    try { await db.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch (e) { }
    try { await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)"); } catch (e) { }

    // === SEEDING DATA FOR THE DASHBOARD ===
    // Check if we already have data so we don't insert duplicates every time we restart
    const partyCount = await db.get('SELECT COUNT(*) as count FROM parties');

    if (partyCount.count === 0) {
        console.log('Inserting dummy data for your Dashboard...');

        // Add Parties
        await db.exec(`
      INSERT INTO parties (type, name, phone, balance) VALUES 
      ('CUSTOMER', 'Dronagiri Medicine (Madhavnagar)', '9876543210', 89.60),
      ('CUSTOMER', 'Rahul Sharma', '9123456780', 1170.00),
      ('SUPPLIER', 'Pharma Distributors Ltd', '9988776655', 0.00);
    `);

        // Add Items
        await db.exec(`
      INSERT INTO items (item_name, category, selling_price, purchase_price, stock) VALUES 
      ('Paracetamol 500mg', 'Pharma', 50.00, 30.00, 100),
      ('Cough Syrup', 'Pharma', 120.00, 80.00, 50),
      ('Face Wash (Glow)', 'Cosmetic', 250.00, 180.00, 30);
    `);

        // Add Transactions to draw the "Sales & Purchase Trend" Graph (matching your image roughly)
        // We use dates from Oct 2025 to Mar 2026 to fit the 6-month graph
        const transactions = [
            // Older months (mostly zero/low to show the spike in Feb/Mar)
            { type: 'SALE', date: '2025-10-15', amount: 0, paid: 0 },
            { type: 'SALE', date: '2025-11-20', amount: 0, paid: 0 },
            { type: 'SALE', date: '2025-12-10', amount: 0, paid: 0 },
            { type: 'SALE', date: '2026-01-05', amount: 0, paid: 0 },

            // February 2026 data
            { type: 'SALE', date: '2026-02-15', amount: 200, paid: 200 },
            { type: 'PURCHASE', date: '2026-02-20', amount: 1500, paid: 1500 },

            // March 2026 data (Matching your current dashboard numbers)
            // Total Sales: 2718.60, Total Purchases: 1960.00, Expenses: 5000.00
            { type: 'SALE', date: '2026-03-01', amount: 1000.00, paid: 1000.00 },
            { type: 'SALE', date: '2026-03-03', amount: 1629.00, paid: 459.00 }, // Creates ~1170 receivable
            { type: 'SALE', date: '2026-03-04', amount: 89.60, paid: 0.00, party: 1 }, // Matches recent transaction!
            { type: 'PURCHASE', date: '2026-03-02', amount: 1960.00, paid: 1960.00 },
            { type: 'EXPENSE', date: '2026-03-08', amount: 5000.00, paid: 5000.00 }
        ];

        for (const t of transactions) {
            const status = t.paid === 0 ? 'PENDING' : (t.paid < t.amount ? 'PARTIAL' : 'PAID');
            const partyId = t.party || (t.type === 'SALE' ? 2 : 3);
            await db.run(
                'INSERT INTO transactions (type, party_id, date, total_amount, amount_paid, payment_status) VALUES (?, ?, ?, ?, ?, ?)',
                [t.type, partyId, t.date, t.amount, t.paid, status]
            );
        }
        console.log('Dummy data inserted successfully! ✅');
    }

    console.log('Database initialized successfully! 🚀');
    return db;
}
