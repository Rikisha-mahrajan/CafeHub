const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Submit feedback (student)
router.post('/', (req, res) => {
    const userId = req.session.user?.id;
    const { order_id, rating, comment } = req.body;

    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    db.query(
        'INSERT INTO feedback (user_id, order_id, rating, comment) VALUES (?, ?, ?, ?)',
        [userId, order_id || null, rating, comment],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Feedback submitted successfully' });
        }
    );
});

// Get logged-in user's own feedback history
router.get('/my-feedback', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query('SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(results);
    });
});

module.exports = router;