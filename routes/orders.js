const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Place an order (student)
router.post('/', (req, res) => {
    const { items, total_amount } = req.body;
    const user_id = req.session.user?.id;
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
                .then(() => res.json({ message: 'Order placed successfully', order_id }))
                .catch(() => res.status(500).json({ message: 'Error saving order items' }));
        }
    );
});

// Get logged-in student's own orders (history)
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

// Get details (items) of a specific order
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

module.exports = router;