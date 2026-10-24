const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Staff Queue Actions
router.post('/call-next', staffController.callNext);
router.post('/call-batch', staffController.callBatch);
router.post('/snooze', staffController.snooze);
router.post('/complete', staffController.complete);
router.post('/skip', staffController.skip);
router.get('/counter/:counterId', staffController.getCounterDetails);

module.exports = router;
