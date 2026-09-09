const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Aiven Cloud Database Connection
const pool = mysql.createPool({
    host: 'mysql-2bd3bf6d-walavalkaraniruddha-33a2.k.aivencloud.com',
    port: 12841,
    user: 'avnadmin',
    password: 'AVNS_42hd-tsXmy99xTXwl3w',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

// Setup Route: Creates 16 seats dynamically
app.get('/setup', async (req, res) => {
    await pool.query(`CREATE TABLE IF NOT EXISTS seats (id INT PRIMARY KEY, status VARCHAR(20), booked_by VARCHAR(50))`);
    
    // Insert 16 seats
    for(let i = 1; i <= 16; i++) {
        await pool.query(`INSERT IGNORE INTO seats (id, status, booked_by) VALUES (?, 'AVAILABLE', NULL)`, [i]);
    }
    
    // Reset all to AVAILABLE, then randomly BOOK a few for the presentation demo
    await pool.query(`UPDATE seats SET status = 'AVAILABLE', booked_by = NULL`);
    await pool.query(`UPDATE seats SET status = 'BOOKED', booked_by = 'Admin' WHERE id IN (2, 3, 8, 14)`);
    
    res.send('Database Ready! 16 Dynamic seats created. Go to the main page.');
});

// Fetch all seats dynamically for the UI
app.get('/api/seats', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, status FROM seats ORDER BY id');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Hold the specific seat BEFORE payment
app.post('/hold-seat', async (req, res) => {
    const { seatId } = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE seats SET status = 'PENDING' WHERE id = ? AND status = 'AVAILABLE'`,
            [seatId]
        );
        if (result.affectedRows === 1) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Seat is currently being booked by someone else!' });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Finalize the specific booking AFTER payment
app.post('/book-seat', async (req, res) => {
    const { seatId, name } = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE seats SET status = 'BOOKED', booked_by = ? WHERE id = ? AND status = 'PENDING'`,
            [name, seatId]
        );
        if (result.affectedRows === 1) {
            res.json({ success: true, message: `Payment Verified! Seat ${seatId} booked for ${name}.` });
        } else {
            res.json({ success: false, message: `Booking Failed.` });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Release specific seat if timer runs out
app.post('/release-seat', async (req, res) => {
    const { seatId } = req.body;
    await pool.query(`UPDATE seats SET status = 'AVAILABLE' WHERE id = ? AND status = 'PENDING'`, [seatId]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
