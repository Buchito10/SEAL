jest.mock("../../src/services/users.service", () => ({
  getByEmail: jest.fn(),
  getById: jest.fn(),
  patch: jest.fn(),
}));
jest.mock("../../src/utils/password", () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));
jest.mock("../../src/utils/token", () => ({ signToken: jest.fn(() => "jwt-seguro") }));
jest.mock("../../src/utils/sessionCookie", () => ({
  setSessionCookie: jest.fn(),
  clearSessionCookie: jest.fn(),
}));

const usersService = require("../../src/services/users.service");
const password = require("../../src/utils/password");
const sessionCookie = require("../../src/utils/sessionCookie");
const controller = require("../../src/controllers/auth.controller");

function response() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const activeUser = {
  id: "user-1",
  name: "Usuario QA",
  email: "qa@seal.test",
  role: "ADMIN",
  status: "ACTIVE",
  password_hash: "hash",
  must_change_password: true,
  profile_completed: true,
};

describe("Controlador de autenticación", () => {
  beforeEach(() => jest.clearAllMocks());

  test("inicia sesión con cookie HttpOnly y no devuelve el JWT en el JSON", async () => {
    usersService.getByEmail.mockResolvedValue(activeUser);
    usersService.patch.mockResolvedValue(activeUser);
    password.verifyPassword.mockResolvedValue(true);
    const res = response();

    await controller.login({ body: { email: activeUser.email, password: "Temporal123!" } }, res);

    expect(sessionCookie.setSessionCookie).toHaveBeenCalledWith(res, "jwt-seguro");
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.ok).toBe(true);
    expect(payload.data.token).toBeUndefined();
    expect(payload.data.user.must_change_password).toBe(true);
  });

  test("rechaza credenciales incorrectas con mensaje en español", async () => {
    usersService.getByEmail.mockResolvedValue(activeUser);
    password.verifyPassword.mockResolvedValue(false);
    const res = response();

    await controller.login({ body: { email: activeUser.email, password: "Incorrecta123!" } }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, message: "Credenciales inválidas" });
  });

  test("cambia la contraseña obligatoria y devuelve el usuario actualizado", async () => {
    usersService.getById.mockResolvedValue(activeUser);
    usersService.patch.mockResolvedValue({ ...activeUser, must_change_password: false });
    password.verifyPassword.mockResolvedValue(true);
    password.hashPassword.mockResolvedValue("nuevo-hash");
    const res = response();

    await controller.changePassword({
      body: { currentPassword: "Temporal123!", newPassword: "Definitiva123!" },
      user: { userId: activeUser.id },
    }, res);

    expect(usersService.patch).toHaveBeenCalledWith(activeUser.id, {
      password_hash: "nuevo-hash",
      must_change_password: false,
    });
    expect(res.json.mock.calls[0][0].data.user.must_change_password).toBe(false);
  });
});
