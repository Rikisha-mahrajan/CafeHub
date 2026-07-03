const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const https = require('https');
const db = require('../config/db');

async function sendVerificationEmail(toEmail, toName, verifyUrl) {
    const data = JSON.stringify({
        sender: { name: 'CafeHub', email: 'rikisham552@gmail.com' },
        to: [{ email: toEmail, name: toName }],
        subject: 'Verify your CafeHub account',
        htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 10px; border: 1px solid #eee;"><h2 style="color: #ff6600;">Welcome to CafeHub!</h2><p>Hi ' + toName + ',</p><p>Please verify your email by clicking the button below:</p><a href="' + verifyUrl + '" style="display: inline-block; background-color: #ff6600; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify Email</a><p style="margin-top: 20px; color: #999; font-size: 12px;">If you did not register, ignore this email.</p></div>'
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) resolve(body);
                else reject(new Error('Brevo error: ' + body));
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

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
                    await sendVerificationEmail(email, name, verifyUrl);
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

router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    const allowedRoles = ['student', 'staff', 'admin'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    try {
        // Check if email already exists first
        db.query('SELECT id FROM users WHERE email = ?', [email], async (err, existing) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            if (existing.length > 0) return res.status(500).json({ message: 'Email already exists' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verifyUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

            // Send email FIRST before inserting
            try {
                await sendVerificationEmail(email, name, verifyUrl);
            } catch (mailErr) {
                console.error('Email send error:', mailErr.message);
                return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
            }

            // Only insert user if email sent successfully
            db.query(
                'INSERT INTO users (name, email, password, phone, role, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone, finalRole, verificationToken, false],
                (err2) => {
                    if (err2) return res.status(500).json({ message: 'Email already exists' });
                    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
                }
            );
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
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