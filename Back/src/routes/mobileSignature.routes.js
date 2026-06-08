const router = require("express").Router();
const c = require("../controllers/mobileSignature.controller");

router.get("/mobile/verify", c.verify);
router.post("/mobile/sign", c.sign);

module.exports = router;
