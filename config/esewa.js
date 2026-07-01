const crypto = require('crypto');

// Generate HMAC-SHA256 signature for eSewa payment request
function generateSignature(totalAmount, transactionUuid, productCode) {
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    const hash = crypto.createHmac('sha256', process.env.ESEWA_SECRET_KEY)
        .update(message)
        .digest('base64');
    return hash;
}

// Verify signature from eSewa's callback response
function verifySignature(data) {
    const fieldsToSign = data.signed_field_names.split(',');
    const message = fieldsToSign.map(field => `${field}=${data[field]}`).join(',');
    const hash = crypto.createHmac('sha256', process.env.ESEWA_SECRET_KEY)
        .update(message)
        .digest('base64');
    return hash === data.signature;
}

module.exports = { generateSignature, verifySignature };