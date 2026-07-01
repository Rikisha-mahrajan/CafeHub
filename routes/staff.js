const express = require('express');
const router = express.Router();
const db = require('../config/db');

// View all incoming/active orders
router.get('/orders', (req, res) => {
    db.query(
        `SELECT orders.*, users.name AS customer_name, users.phone 
         FROM orders JOIN users ON orders.user_id = users.id 
         WHERE orders.status != 'completed' AND orders.status != 'cancelled'
         ORDER BY orders.created_at ASC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// View today's orders (daily orders)
router.get('/orders/today', (req, res) => {
    db.query(
        `SELECT orders.*, users.name AS customer_name 
         FROM orders JOIN users ON orders.user_id = users.id 
         WHERE DATE(orders.created_at) = CURDATE()
         ORDER BY orders.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// Accept order
router.put('/orders/:id/accept', (req, res) => {
    const staffId = req.session.user.id;
    db.query(
        'UPDATE orders SET status = ?, handled_by = ? WHERE id = ?',
        ['accepted', staffId, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Order accepted' });
        }
    );
});

// Update order status (preparing, ready, completed, cancelled)
router.put('/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    db.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: `Order marked as ${status}` });
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

module.exports = router;