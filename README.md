# IMAX Cinema Concurrency & Transaction Management System

A full-stack DBMS project built to demonstrate **Database Concurrency Control**, **Pessimistic Locking**, and **ACID Compliance** in a high-contention movie ticket booking environment.

## 🚀 Tech Stack
* **Backend:** Node.js, Express.js
* **Database:** MySQL (Hosted on Aiven Cloud)
* **Frontend:** Vanilla HTML5, CSS3 (Midnight IMAX Theme), JavaScript (ES6)

## 💡 DBMS Core Concepts Implemented
1. **Pessimistic Concurrency Control:** Prevents race conditions and double-booking using atomic conditional updates (`WHERE id = ? AND status = 'AVAILABLE'`).
2. **Transaction States:** Manages strict state transitions (`AVAILABLE` → `PENDING` → `BOOKED`).
3. **Session Timeout & Rollback:** Features an automated 5-minute countdown timer that triggers a server-side rollback (`/release-seat`) if a transaction is abandoned, preventing locked deadlocks.
4. **ACID Compliance:** Guaranteed atomicity and isolation through MySQL InnoDB row-level locking.

## 📂 Project Structure
* `server.js` — Core Express server handling API routing, connection pooling, and atomic SQL transactions.
* `public/index.html` — Cinematic UI handling real-time grid synchronization, state rendering, and the countdown timer session manager.
