const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register
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

                await transporter.sendMail({
                    from: