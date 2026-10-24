const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

router.get('/', storeController.getStores);
router.post('/', storeController.createStore);
router.post('/seed', storeController.seedDemoStore);
router.get('/:slug', storeController.getStoreBySlug);
router.post('/:slug/counters', storeController.addCounter);
router.patch('/:slug/counters/:counterId', storeController.updateCounter);
router.delete('/:slug/counters/:counterId', storeController.deleteCounter);
router.patch('/:slug/settings', storeController.updateStoreSettings);

module.exports = router;
