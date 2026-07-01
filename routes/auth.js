const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    const allowedRoles = ['student', 'staff', 'admin'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, finalRole],
            (err, result) => {
                if (err) return res.status(500).json({ message: 'Email already exists' });
                res.status(201).json({ message: 'Registration successful' });
            }
        );
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0)
            return res.status(401).json({ message: 'Invalid email or password' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid email or password' });

        req.session.user = { id: user.id, name: user.name, role: user.role };
        res.json({ message: 'Login successful', role: user.role });
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Update profile
router.put('/profile', async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    const { name, phone, password } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query('UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?',
                [name, phone, hashedPassword, userId], (err) => {
                    if (err) return res.status(500).json({ message: 'Server error' });
                    req.session.user.name = name;
                    res.json({ message: 'Profile updated' });
                });
        } else {
            db.query('UPDATE users SET name = ?, phone = ? WHERE id = ?',
                [name, phone, userId], (err) => {
                    if (err) return res.status(500).json({ message: 'Server error' });
                    req.session.user.name = name;
                    res.json({ message: 'Profile updated' });
                });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get current profile
router.get('/profile', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: 'Server error' });
        res.json(results[0]);
    });
});

module.exports = router;