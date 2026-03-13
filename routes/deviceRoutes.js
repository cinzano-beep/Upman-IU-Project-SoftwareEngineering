const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const { isAuthenticated } = require("../middleware/authMiddleware");

router.get("/devices", isAuthenticated, deviceController.listDevices);
router.get("/devices/add", isAuthenticated, deviceController.showAddForm);
router.post("/devices/add", isAuthenticated, deviceController.addDevice);

router.get("/devices/edit/:id", isAuthenticated, deviceController.showEditForm);
router.post("/devices/edit/:id", isAuthenticated, deviceController.updateDevice);

router.post("/devices/delete/:id", isAuthenticated, deviceController.deleteDevice);

module.exports = router;