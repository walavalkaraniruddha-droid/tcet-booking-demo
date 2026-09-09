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

// Setup Route: Wipes old data and creates 80 fresh seats
app.get('/setup', async (req, res) => {
    await pool.query(`DROP TABLE IF EXISTS seats`);
    await pool.query(`CREATE TABLE seats (id INT PRIMARY KEY, status VARCHAR(20), booked_by VARCHAR(50))`);
    
    // Insert all 80 seats
    for(let i = 1; i <= 80; i++) {
        await pool.query(`INSERT INTO seats (id, status, booked_by) VALUES (?, 'AVAILABLE', NULL)`, [i]);
    }
    
    // Randomly book seats for a realistic presentation demo
    const bookedSeats = [3, 4, 12, 15, 25, 26, 27, 45, 46, 68, 79];
    await pool.query(`UPDATE seats SET status = 'BOOKED', booked_by = 'Admin' WHERE id IN (?)`, [bookedSeats]);
    
    res.send('Database Reset! 80 seats created. Go to the main page.');
});

// Admin Route: To view raw MySQL Database in the browser
app.get('/admin', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seats');
        res.json({ total_seats: rows.length, database_data: rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
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

// 1. Hold seat (Pessimistic Lock)
app.post('/hold-seat', async (req, res) => {
    const { seatId } = req.body;
    try {
        const [result] = await pool.query(`UPDATE seats SET status = 'PENDING' WHERE id = ? AND status = 'AVAILABLE'`, [seatId]);
        if (result.affectedRows === 1) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Seat is currently held by someone else!' });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 2. Finalize booking
app.post('/book-seat', async (req, res) => {
    const { seatId, name } = req.body;
    try {
        const [result] = await pool.query(`UPDATE seats SET status = 'BOOKED', booked_by = ? WHERE id = ? AND status = 'PENDING'`, [name, seatId]);
        if (result.affectedRows === 1) {
            res.json({ success: true, message: `Seat ${seatId} booked!` });
        } else {
            res.json({ success: false, message: `Booking Failed.` });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 3. Release seat (If timer expires)
app.post('/release-seat', async (req, res) => {
    const { seatId } = req.body;
    await pool.query(`UPDATE seats SET status = 'AVAILABLE' WHERE id = ? AND status = 'PENDING'`, [seatId]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
