const os = require("os");

function isLoopbackHost(hostname) {
    return ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase());
}

function getLanIPv4() {
    const interfaces = os.networkInterfaces();

    for (const addresses of Object.values(interfaces)) {
        for (const address of addresses || []) {
            if (address.family !== "IPv4" || address.internal) continue;

            const value = address.address;
            if (
                value.startsWith("192.168.") ||
                value.startsWith("10.") ||
                /^172\.(1[6-9]|2\d|3[0-1])\./.test(value)
            ) {
                return value;
            }
        }
    }

    return null;
}

function exposeLocalhostOnLan(configuredUrl) {
    const raw = String(configuredUrl || "").trim();
    if (!raw) return raw;

    try {
        const url = new URL(raw);
        const lanIp = getLanIPv4();

        if (lanIp && isLoopbackHost(url.hostname)) {
            url.hostname = lanIp;
        }

        return url.toString();
    } catch {
        return raw;
    }
}

function buildPublicUrlWithToken(configuredUrl, token) {
    const publicUrl = exposeLocalhostOnLan(configuredUrl);
    const encodedToken = encodeURIComponent(token);

    try {
        const url = new URL(publicUrl);
        url.hash = `token=${encodedToken}`;
        return url.toString();
    } catch {
        return `${String(publicUrl).split("#", 1)[0]}#token=${encodedToken}`;
    }
}

module.exports = {
    buildPublicUrlWithToken,
    exposeLocalhostOnLan,
    getLanIPv4,
};
