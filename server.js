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

// Setup Table Route
app.get('/setup', async (req, res) => {
    await pool.query(`CREATE TABLE IF NOT EXISTS seats (id INT PRIMARY KEY, status VARCHAR(20), booked_by VARCHAR(50))`);
    await pool.query(`INSERT IGNORE INTO seats (id, status, booked_by) VALUES (1, 'AVAILABLE', NULL)`);
    await pool.query(`UPDATE seats SET status = 'AVAILABLE', booked_by = NULL WHERE id = 1`);
    res.send('Database Ready! Go to the main page.');
});

// STEP 1: Hold the seat BEFORE payment (Changes status to PENDING)
app.post('/hold-seat', async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE seats SET status = 'PENDING' WHERE id = 1 AND status = 'AVAILABLE'`
        );
        if (result.affectedRows === 1) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Someone else is currently paying for this seat!' });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// STEP 2: Finalize the booking AFTER payment (Changes PENDING to BOOKED)
app.post('/book-seat', async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE seats SET status = 'BOOKED', booked_by = ? WHERE id = 1 AND status = 'PENDING'`,
            [name]
        );
        if (result.affectedRows === 1) {
            res.json({ success: true, message: `Payment Verified! Seat allocated to ${name}.` });
        } else {
            res.json({ success: false, message: `Booking Failed.` });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// STEP 3: Release seat if timer runs out
app.post('/release-seat', async (req, res) => {
    await pool.query(`UPDATE seats SET status = 'AVAILABLE' WHERE id = 1 AND status = 'PENDING'`);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
