const { z } = require("zod");

const createUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(["ADMIN", "CLIENT"]),
    position: z.string().optional(),
});

const patchUserSchema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(["ADMIN", "CLIENT"]).optional(),
    position: z.string().nullable().optional(),

    // Perfil extendido del cliente
    rfc: z.string().min(10).max(13).optional(),
    curp: z.string().min(18).max(18).optional(),
    phone: z.string().min(10).max(20).optional(),

    address_line1: z.string().min(1).optional(),
    address_line2: z.string().min(1).optional(),
    address_city: z.string().min(1).optional(),
    address_state: z.string().min(1).optional(),
    address_zip: z.string().min(1).optional(),
    address_country: z.string().min(1).optional(),

    profile_completed: z.boolean().optional(),
});

module.exports = { createUserSchema, patchUserSchema };
