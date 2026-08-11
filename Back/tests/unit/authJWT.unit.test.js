jest.mock("../../src/utils/token", () => ({ verifyToken: jest.fn() }));
jest.mock("../../src/services/users.service", () => ({ getById: jest.fn() }));
jest.mock("../../src/utils/sessionCookie", () => ({ readCookie: jest.fn() }));

const { verifyToken } = require("../../src/utils/token");
const usersService = require("../../src/services/users.service");
const { readCookie } = require("../../src/utils/sessionCookie");
const authJWT = require("../../src/middlewares/authJWT");

function response() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const user = {
  id: "user-1",
  role: "ADMIN",
  status: "ACTIVE",
  name: "QA",
  email: "qa@seal.test",
  must_change_password: false,
};

describe("Middleware de sesión", () => {
  beforeEach(() => jest.clearAllMocks());

  test("acepta el JWT desde la cookie segura", async () => {
    readCookie.mockReturnValue("jwt-cookie");
    verifyToken.mockReturnValue({ userId: user.id });
    usersService.getById.mockResolvedValue(user);
    const next = jest.fn();
    const req = { headers: { cookie: "seal_session=jwt-cookie" }, originalUrl: "/admin/users" };

    await authJWT(req, response(), next);

    expect(verifyToken).toHaveBeenCalledWith("jwt-cookie");
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe("ADMIN");
  });

  test("conserva compatibilidad con Authorization Bearer", async () => {
    readCookie.mockReturnValue("");
    verifyToken.mockReturnValue({ userId: user.id });
    usersService.getById.mockResolvedValue(user);
    const next = jest.fn();

    await authJWT({ headers: { authorization: "Bearer jwt-legacy" }, originalUrl: "/admin/users" }, response(), next);

    expect(verifyToken).toHaveBeenCalledWith("jwt-legacy");
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("bloquea funciones hasta completar el cambio obligatorio", async () => {
    readCookie.mockReturnValue("jwt-cookie");
    verifyToken.mockReturnValue({ userId: user.id });
    usersService.getById.mockResolvedValue({ ...user, must_change_password: true });
    const res = response();
    const next = jest.fn();

    await authJWT({ headers: {}, originalUrl: "/admin/contracts" }, res, next);

    expect(res.status).toHaveBeenCalledWith(428);
    expect(res.json.mock.calls[0][0].code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(next).not.toHaveBeenCalled();
  });
});
