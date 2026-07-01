const express = require('express');
const router = express.Router();
const db = require('../config/db');

// View all users
router.get('/users', (req, res) => {
    db.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

// Update a user's role
router.put('/users/:id/role', (req, res) => {
    const { role } = req.body;
    const validRoles = ['student', 'staff', 'admin'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'User role updated' });
    });
});

// Delete a user
router.delete('/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'User deleted' });
    });
});

// View all payments
router.get('/payments', (req, res) => {
    db.query(
        `SELECT payments.*, orders.user_id, users.name AS customer_name 
         FROM payments 
         JOIN orders ON payments.order_id = orders.id 
         JOIN users ON orders.user_id = users.id 
         ORDER BY payments.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// View full order history (all orders, all statuses)
router.get('/orders', (req, res) => {
    db.query(
        `SELECT orders.*, users.name AS customer_name 
         FROM orders JOIN users ON orders.user_id = users.id 
         ORDER BY orders.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// View all feedback
router.get('/feedback', (req, res) => {
    db.query(
        `SELECT feedback.*, users.name AS customer_name 
         FROM feedback JOIN users ON feedback.user_id = users.id 
         ORDER BY feedback.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// Dashboard stats
router.get('/stats', (req, res) => {
    db.query(
        `SELECT 
            (SELECT COUNT(*) FROM orders) AS total_orders,
            (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'success') AS total_revenue,
            (SELECT COUNT(*) FROM feedback) AS total_feedback`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results[0]);
        }
    );
});

module.exports = router;