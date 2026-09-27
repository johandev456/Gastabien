"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// Get list of supported Dominican banks and their configurations
router.get('/', (req, res) => {
    return res.json({
        supportedBanks: Object.values(config_1.SUPPORTED_BANKS)
    });
});
exports.default = router;
