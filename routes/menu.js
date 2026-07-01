const express = require('express');
const router = express.Router();
const db = require('../config/db');
const upload = require('../config/upload');

// Get all menu items (students see only available ones, staff/admin see all)
router.get('/', (req, res) => {
    const role = req.session.user?.role;
    const query = (role === 'staff' || role === 'admin')
        ? 'SELECT * FROM menu_items ORDER BY category'
        : 'SELECT * FROM menu_items WHERE availability = 1 ORDER BY category';

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

// Add new menu item (staff/admin only) - with image upload
router.post('/', upload.single('image'), (req, res) => {
    const { name, description, price, category } = req.body;
    const userId = req.session.user?.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.query(
        'INSERT INTO menu_items (name, description, price, category, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, price, category, imageUrl, userId],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Menu item added' });
        }
    );
});

// Update menu item (price, details, with optional new image)
router.put('/:id', upload.single('image'), (req, res) => {
    const { name, description, price, category, availability } = req.body;
    const itemId = req.params.id;

    if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        db.query(
            'UPDATE menu_items SET name=?, description=?, price=?, category=?, availability=?, image_url=? WHERE id=?',
            [name, description, price, category, availability, imageUrl, itemId],
            (err) => {
                if (err) return res.status(500).json({ message: 'Server error' });
                res.json({ message: 'Menu item updated' });
            }
        );
    } else {
        db.query(
            'UPDATE menu_items SET name=?, description=?, price=?, category=?, availability=? WHERE id=?',
            [name, description, price, category, availability, itemId],
            (err) => {
                if (err) return res.status(500).json({ message: 'Server error' });
                res.json({ message: 'Menu item updated' });
            }
        );
    }
});

// Toggle availability quickly
router.patch('/:id/availability', (req, res) => {
    const { availability } = req.body;
    db.query('UPDATE menu_items SET availability = ? WHERE id = ?',
        [availability, req.params.id], (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Availability updated' });
        });
});

// Delete menu item
router.delete('/:id', (req, res) => {
    db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Menu item deleted' });
    });
});

module.exports = router;