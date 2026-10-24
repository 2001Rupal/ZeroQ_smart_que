const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/register', customerController.registerCustomer);
router.post('/otp/send', customerController.sendOtp);
router.post('/otp/verify', customerController.verifyOtp);
router.get('/status/:tokenUuid', customerController.getCustomerStatus);
router.post('/hold', customerController.customerHold);
router.post('/done', customerController.customerDone);
router.post('/cancel', customerController.cancelCustomerToken);

module.exports = router;
