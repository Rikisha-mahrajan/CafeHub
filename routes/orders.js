const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper to create notification
function createNotification(userId, message) {
    db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, message],
        (err) => { if (err) console.error('Notification error:', err.message); }
    );
}

// Place an order (student)
router.post('/', (req, res) => {
    const { items, total_amount } = req.body;
    const user_id = req.session.user?.id;
    const user_name = req.session.user?.name;
    if (!user_id) return res.status(401).json({ message: 'Not logged in' });

    db.query(
        'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
        [user_id, total_amount],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            const order_id = result.insertId;

            const itemInserts = items.map(item => new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [order_id, item.id, item.quantity, item.price],
                    (err) => err ? reject(err) : resolve()
                );
            }));

            Promise.all(itemInserts)
                .then(() => {
                    // Notify all staff about new order
                    db.query('SELECT id FROM users WHERE role = ? OR role = ?', ['staff', 'admin'], (err, staffUsers) => {
                        if (!err) {
                            staffUsers.forEach(staff => {
                                createNotification(staff.id, `New order #${order_id} placed by ${user_name}`);
                            });
                        }
                    });
                    res.json({ message: 'Order placed successfully', order_id });
                })
                .catch(() => res.status(500).json({ message: 'Error saving order items' }));
        }
    );
});

// Get logged-in student's own orders
router.get('/my-orders', (req, res) => {
    const user_id = req.session.user?.id;
    if (!user_id) return res.status(401).json({ message: 'Not logged in' });

    db.query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [user_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// Get details of a specific order
router.get('/:id/items', (req, res) => {
    db.query(
        `SELECT order_items.*, menu_items.name FROM order_items 
         JOIN menu_items ON order_items.menu_item_id = menu_items.id 
         WHERE order_id = ?`,
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// Cancel order (student) - only if pending
router.put('/:id/cancel', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, userId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });

        const order = results[0];
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Order cannot be cancelled after it has been accepted.' });
        }

        db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id], (err2) => {
            if (err2) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Order cancelled successfully' });
        });
    });
});

module.exports = router;