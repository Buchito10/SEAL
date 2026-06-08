module.exports = function errorHandler(err, req, res, next) {
    console.error("❌", err);
    return res.status(500).json({ ok: false, message: "Internal server error" });
};
