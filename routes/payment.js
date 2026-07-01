const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { generateSignature, verifySignature } = require('../config/esewa');

// Step 1: Initiate payment - returns form data for frontend to auto-submit to eSewa
router.post('/initiate/:orderId', (req, res) => {
    const orderId = req.params.orderId;

    db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Order not found' });

        const order = results[0];
        const transactionUuid = `${orderId}-${uuidv4().slice(0, 8)}`;
        const amount = order.total_amount;
        const taxAmount = 0;
        const totalAmount = amount;

        const signature = generateSignature(totalAmount, transactionUuid, process.env.ESEWA_PRODUCT_CODE);

        // Save a pending payment record
        db.query(
            'INSERT INTO payments (order_id, transaction_uuid, amount, status) VALUES (?, ?, ?, ?)',
            [orderId, transactionUuid, amount, 'pending'],
            (err) => {
                if (err) return res.status(500).json({ message: 'Server error' });

                res.json({
                    gatewayUrl: process.env.ESEWA_GATEWAY_URL,
                    fields: {
                        amount: amount,
                        tax_amount: taxAmount,
                        total_amount: totalAmount,
                        transaction_uuid: transactionUuid,
                        product_code: process.env.ESEWA_PRODUCT_CODE,
                        product_service_charge: 0,
                        product_delivery_charge: 0,
                        success_url: `${process.env.BASE_URL}/payment/success`,
                        failure_url: `${process.env.BASE_URL}/payment/failure`,
                        signed_field_names: 'total_amount,transaction_uuid,product_code',
                        signature: signature
                    }
                });
            }
        );
    });
});

// Step 2: eSewa redirects here after payment - verify and update
router.get('/success', (req, res) => {
    const encodedData = req.query.data;
    if (!encodedData) return res.redirect('/views/payment-failed.html');

    try {
        const decodedData = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'));

        if (!verifySignature(decodedData)) {
            return res.redirect('/views/payment-failed.html');
        }

        if (decodedData.status === 'COMPLETE') {
            const transactionUuid = decodedData.transaction_uuid;

            db.query(
                'UPDATE payments SET status = ?, reference_id = ? WHERE transaction_uuid = ?',
                ['success', decodedData.transaction_code, transactionUuid],
                (err) => {
                    if (err) return res.redirect('/views/payment-failed.html');

                    const orderId = transactionUuid.split('-')[0];
                    db.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', orderId], (err2) => {
                        if (err2) return res.redirect('/views/payment-failed.html');
                        res.redirect(`/views/payment-success.html?order_id=${orderId}`);
                    });
                }
            );
        } else {
            res.redirect('/views/payment-failed.html');
        }
    } catch (e) {
        res.redirect('/views/payment-failed.html');
    }
});

// Step 3: eSewa redirects here if payment failed/cancelled
router.get('/failure', (req, res) => {
    res.redirect('/views/payment-failed.html');
});

// Optional: manually check status via eSewa's status API
router.get('/status/:transactionUuid', async (req, res) => {
    try {
        const response = await axios.get(process.env.ESEWA_STATUS_URL, {
            params: {
                product_code: process.env.ESEWA_PRODUCT_CODE,
                total_amount: req.query.amount,
                transaction_uuid: req.params.transactionUuid
            }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ message: 'Could not fetch status' });
    }
});

module.exports = router;