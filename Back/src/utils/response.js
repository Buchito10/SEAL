function isValidHttpStatus(code) {
    const n = Number(code);
    return Number.isInteger(n) && n >= 100 && n <= 999;
}

function ok(res, data, status = 200) {
    const s = isValidHttpStatus(status) ? status : 200;
    return res.status(s).json({ ok: true, data });
}

function fail(res, message, status = 400, details) {
    const s = isValidHttpStatus(status) ? status : 500;
    const payload = { ok: false, message: message || "Error" };
    if (details !== undefined) payload.details = details;
    return res.status(s).json(payload);
}

module.exports = { ok, fail };