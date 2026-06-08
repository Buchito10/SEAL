function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(401).json({ ok: false, message: "Unauthorized" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ ok: false, message: "Forbidden" });
        }
        return next();
    };
}

module.exports = requireRole;
