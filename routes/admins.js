var express = require('express');
var router = express.Router();
const Controller = require('../controller/admins')
const { uploadImageSingle } = require('../lib/multer');



//admin signup and login routes
router.post('/',   uploadImageSingle,Controller.create)
router.get('/',Controller.getAll)
router.get('/:id',Controller.get)
router.put('/:id',  uploadImageSingle,Controller.update)
router.delete('/:id',Controller.delete)
router.delete('/',Controller.deleteAll)
router.post('/login',Controller.login)
router.post('/forgot-password',Controller.forgotPassword);
router.post('/reset-password',Controller.resetPassword);
router.put('/block/:id', Controller.toggleBlockAdmin);
router.put('/unblock/:id',Controller.unblockAdmin);
router.put('/change-password/:adminId', Controller.changePassword);
router.put("/assign-route/:adminId", Controller.assignRouteToAdmin); 
module.exports = router;
