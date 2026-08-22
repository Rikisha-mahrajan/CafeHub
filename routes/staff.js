const express = require('express');
const router = express.Router();
const db = require('../config/db');
const https = require('https');

function createNotification(userId, message) {
    db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, message],
        (err) => { if (err) console.error('Notification error:', err.message); }
    );
}

function sendEmail(toEmail, toName, subject, htmlContent) {
    const data = JSON.stringify({
        sender: { name: 'CafeHub', email: process.env.EMAIL_USER },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent
    });

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
        res.on('end', () => console.log('Email sent:', res.statusCode));
    });

    req.on('error', (err) => console.error('Email error:', err.message));
    req.write(data);
    req.end();
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
    db.query('SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON orders.user_id = users.id WHERE orders.id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });
        const order = results[0];

        db.query(
            'UPDATE orders SET status = ?, handled_by = ? WHERE id = ?',
            ['accepted', staffId, req.params.id],
            (err2) => {
                if (err2) return res.status(500).json({ message: 'Server error' });

                createNotification(order.user_id, `Your order #${order.id} has been accepted and is being processed! 🎉`);

                // Send email only for accepted
                sendEmail(
                    order.customer_email,
                    order.customer_name,
                    'Your CafeHub Order Has Been Accepted! 🎉',
                    `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 10px; border: 1px solid #eee;">
                        <h2 style="color: #ff6600;">🍽️ CafeHub</h2>
                        <p>Hi ${order.customer_name},</p>
                        <p>Great news! Your order <strong>#${order.id}</strong> has been <strong style="color: #0d6efd;">accepted</strong> by our cafeteria staff.</p>
                        <p>We are now processing your order. You will receive another email when your food is ready for pickup!</p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin:0;"><strong>Order ID:</strong> #${order.id}</p>
                            <p style="margin:0;"><strong>Total:</strong> Rs. ${order.total_amount}</p>
                            <p style="margin:0;"><strong>Status:</strong> Accepted ✅</p>
                        </div>
                        <p style="color: #999; font-size: 12px;">Thank you for using CafeHub!</p>
                    </div>`
                );

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

    db.query('SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON orders.user_id = users.id WHERE orders.id = ?', [req.params.id], (err, results) => {
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

                // Send email ONLY for ready status
                if (status === 'ready') {
                    sendEmail(
                        order.customer_email,
                        order.customer_name,
                        'Your CafeHub Order is Ready for Pickup! 🎉',
                        `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 10px; border: 1px solid #eee;">
                            <h2 style="color: #ff6600;">🍽️ CafeHub</h2>
                            <p>Hi ${order.customer_name},</p>
                            <p>Your order <strong>#${order.id}</strong> is <strong style="color: #198754;">ready for pickup!</strong> 🎉</p>
                            <p>Please come to the cafeteria counter to collect your order.</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin:0;"><strong>Order ID:</strong> #${order.id}</p>
                                <p style="margin:0;"><strong>Total:</strong> Rs. ${order.total_amount}</p>
                                <p style="margin:0;"><strong>Status:</strong> Ready for Pickup ✅</p>
                            </div>
                            <p style="color: #999; font-size: 12px;">Thank you for using CafeHub!</p>
                        </div>`
                    );
                }

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