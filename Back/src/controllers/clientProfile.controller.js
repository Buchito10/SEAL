const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const usersService = require("../services/users.service");

const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;
const curpRegex = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CH|CL|CM|CS|DF|DG|GT|GR|HG|JC|MC|MN|MS|NE|NL|NT|OC|PL|QR|QT|SL|SP|SR|TC|TL|TS|VZ|YN|ZS)[A-Z]{3}[A-Z0-9]\d$/i;
const phoneMxRegex = /^\d{10}$/;

const profileSchema = z.object({
    rfc: z.string().trim().min(10).max(13).regex(rfcRegex, "Invalid RFC"),
    curp: z.string().trim().length(18).regex(curpRegex, "Invalid CURP"),
    phone: z.string().trim().regex(phoneMxRegex, "Invalid phone (10 digits)"),
    address_line1: z.string().trim().min(3),
    address_line2: z.string().trim().optional(),
    address_city: z.string().trim().min(2),
    address_state: z.string().trim().min(2),
    address_zip: z.string().trim().min(4).max(10),
    address_country: z.string().trim().min(2).default("MX"),
});

function toPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position ?? null,
        must_change_password: user.must_change_password,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at ?? null,

        profile_completed: user.profile_completed ?? false,

        rfc: user.rfc ?? null,
        curp: user.curp ?? null,
        phone: user.phone ?? null,

        address_line1: user.address_line1 ?? null,
        address_line2: user.address_line2 ?? null,
        address_city: user.address_city ?? null,
        address_state: user.address_state ?? null,
        address_zip: user.address_zip ?? null,
        address_country: user.address_country ?? "MX",
    };
}

async function getProfile(req, res) {
    try {
        const user = await usersService.getById(req.user.userId);
        if (!user) return fail(res, "Not found", 404);
        return ok(res, toPublicUser(user));
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function updateProfile(req, res) {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const user = await usersService.getById(req.user.userId);
        if (!user) return fail(res, "Not found", 404);

        const updated = await usersService.patch(req.user.userId, {
            rfc: parsed.data.rfc.trim().toUpperCase(),
            curp: parsed.data.curp.trim().toUpperCase(),
            phone: parsed.data.phone.trim(),
            address_line1: parsed.data.address_line1.trim(),
            address_line2: parsed.data.address_line2 ? parsed.data.address_line2.trim() : null,
            address_city: parsed.data.address_city.trim(),
            address_state: parsed.data.address_state.trim(),
            address_zip: parsed.data.address_zip.trim(),
            address_country: parsed.data.address_country.trim().toUpperCase(),
            profile_completed: true,
        });

        return ok(res, toPublicUser(updated));
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

module.exports = {
    getProfile,
    updateProfile,
};
