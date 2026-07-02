const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    const allowedRoles = ['student', 'staff', 'admin'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        db.query(
            'INSERT INTO users (name, email, password, phone, role, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, finalRole, verificationToken, false],
            async (err, result) => {
                if (err) return res.status(500).json({ message: 'Email already exists' });

                const verifyUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

                try {
                    await transporter.sendMail({
                        from: '"CafeHub" <' + process.env.EMAIL_USER + '>',
                        to: email,
                        subject: 'Verify your CafeHub account',
                        html: '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 10px; border: 1px solid #eee;"><h2 style="color: #ff6600;">Welcome to CafeHub!</h2><p>Hi ' + name + ',</p><p>Please verify your email by clicking the button below:</p><a href="' + verifyUrl + '" style="display: inline-block; background-color: #ff6600; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify Email</a><p style="margin-top: 20px; color: #999; font-size: 12px;">If you did not register, ignore this email.</p></div>'
                    });
                } catch (mailErr) {
                    console.error('Email send error:', mailErr.message);
                }

                res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
            }
        );
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    db.query('SELECT * FROM users WHERE verification_token = ?', [token], (err, results) => {
        if (err || results.length === 0) {
            return res.send('<div style="font-family: Arial; text-align: center; margin-top: 100px;"><h2 style="color: red;">Invalid or expired verification link</h2><a href="/">Go to Login</a></div>');
        }

        db.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
            [results[0].id], (err2) => {
                if (err2) return res.send('Error verifying email');
                res.send('<div style="font-family: Arial; text-align: center; margin-top: 100px;"><h2 style="color: #ff6600;">Email Verified Successfully!</h2><p>Your account has been verified. You can now login.</p><a href="/" style="background: #ff6600; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Login Now</a></div>');
            }
        );
    });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0)
            return res.status(401).json({ message: 'Invalid email or password' });

        const user = results[0];

        if (!user.is_verified) {
            return res.status(401).json({ message: 'Please verify your email before logging in.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid email or password' });

        req.session.user = { id: user.id, name: user.name, role: user.role };
        res.json({ message: 'Login successful', role: user.role });
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

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

router.get('/profile', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    db.query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: 'Server error' });
        res.json(results[0]);
    });
});

module.exports = router;