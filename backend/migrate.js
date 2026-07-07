import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function migrate() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    console.log("Starting DB migration to remove CHECK constraint...");
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
        // 1. Rename existing table
        await db.run('ALTER TABLE transactions RENAME TO transactions_old');
        
        // 2. Create new table without the constraint
        await db.run(`
            CREATE TABLE transactions (
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
        
        // 3. Copy data explicitly
        await db.run(`
            INSERT INTO transactions (id, type, invoice_number, party_id, date, subtotal, tax_amount, discount, total_amount, amount_paid, payment_status, payment_mode, notes, created_at)
            SELECT id, type, invoice_number, party_id, date, subtotal, tax_amount, discount, total_amount, amount_paid, payment_status, payment_mode, notes, created_at 
            FROM transactions_old;
        `);
        
        // 4. Drop old table
        await db.run('DROP TABLE transactions_old');
        
        await db.run('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await db.run('ROLLBACK');
        console.error("Migration failed:", e);
    }
}

migrate();
