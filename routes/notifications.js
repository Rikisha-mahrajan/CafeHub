const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all notifications for logged in user
router.get('/', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json(results);
        }
    );
});

// Get unread notification count
router.get('/unread-count', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ count: results[0].count });
        }
    );
});

// Mark all notifications as read
router.put('/mark-read', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [userId],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'All notifications marked as read' });
        }
    );
});

// Mark single notification as read
router.put('/:id/read', (req, res) => {
    db.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ?',
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ message: 'Notification marked as read' });
        }
    );
});

module.exports = router;