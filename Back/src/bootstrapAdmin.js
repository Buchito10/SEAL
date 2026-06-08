require("dotenv").config();
const usersService = require("./services/users.service");
const { initFirebase } = require("./config/firebase");
const { hashPassword } = require("./utils/password");

(async () => {
    initFirebase();

    const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const name = process.env.ADMIN_BOOTSTRAP_NAME || "Admin Seed";

    if (!email || !password) {
        console.error("Missing ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD in .env");
        process.exit(1);
    }

    const exists = await usersService.getByEmail(email);
    if (exists) {
        console.log("Admin ya existe:", exists.id);
        process.exit(0);
    }

    const password_hash = await hashPassword(password);

    const adminUser = await usersService.create({
        name,
        email,
        role: "ADMIN",
        position: "System",
        password_hash,
        must_change_password: false,
        status: "ACTIVE",
        last_login_at: null,
    });

    console.log("Admin creado:", adminUser.id);
    console.log("Email:", email);
    console.log("Password configurado desde ADMIN_BOOTSTRAP_PASSWORD.");
    process.exit(0);
})();
