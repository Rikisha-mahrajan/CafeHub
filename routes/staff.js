const express = require('express');
const router = express.Router();
const db = require('../config/db');

function createNotification(userId, message) {
    db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, message],
        (err) => { if (err) console.error('Notification error:', err.message); }
    );
}

router.get('/orders', (req, res) => {
    db.query(
        `SELECT orders.*, users.name AS customer_name, users.phone 
         FROM orders JOIN users ON orders.user_id = users.id 
         WHERE orders.status != 'completed' AND orders.status != 'cancelled'
         ORDER BY orders.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

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

router.put('/orders/:id/accept', (req, res) => {
    const staffId = req.session.user.id;
    db.query('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });
        const order = results[0];

        db.query(
            'UPDATE orders SET status = ?, handled_by = ? WHERE id = ?',
            ['accepted', staffId, req.params.id],
            (err2) => {
                if (err2) return res.status(500).json({ message: 'Server error' });
                createNotification(order.user_id, `Your order #${order.id} has been accepted and is being processed!`);
                res.json({ message: 'Order accepted' });
            }
        );
    });
});

router.put('/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    db.query('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });
        const order = results[0];

        db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id],
            (err2) => {
                if (err2) return res.status(500).json({ message: 'Server error' });

                const messages = {
                    preparing: `Your order #${order.id} is now being prepared! 🍳`,
                    ready: `Your order #${order.id} is ready for pickup! 🎉`,
                    completed: `Your order #${order.id} has been completed. Enjoy your meal! 😊`,
                    cancelled: `Your order #${order.id} has been cancelled.`
                };

                createNotification(order.user_id, messages[status]);
                res.json({ message: `Order marked as ${status}` });
            }
        );
    });
});

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