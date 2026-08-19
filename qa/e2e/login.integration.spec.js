const { test, expect } = require("@playwright/test");

test.describe("Portada pública", () => {
  test("muestra la propuesta de SEAL y dirige al inicio de sesión", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Contratos claros/i })
    ).toBeVisible();

    const accessLink = page.getByRole("link", { name: /Entrar a SEAL/i });
    await expect(accessLink).toHaveAttribute("href", "/login");
    await accessLink.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  });
});

test.describe("Integración del inicio de sesión", () => {
  test("envía el formulario a la API, guarda la sesión y abre el panel", async ({ page }) => {
    let loginPayload;

    await page.route("**/api/auth/login", async (route) => {
      loginPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie": "seal_session=cookie-qa-firmada; Path=/; HttpOnly; SameSite=Lax",
        },
        body: JSON.stringify({
          ok: true,
          data: {
            user: {
              id: "qa-admin",
              name: "Administración QA",
              email: "qa@seal.test",
              role: "ADMIN",
              status: "ACTIVE",
              must_change_password: false,
            },
          },
        }),
      });
    });

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            user: {
              id: "qa-admin",
              name: "Administración QA",
              email: "qa@seal.test",
              role: "ADMIN",
              status: "ACTIVE",
              must_change_password: false,
            },
          },
        }),
      })
    );

    await page.route("**/api/admin/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: [] }),
      })
    );

    await page.goto("/login");
    const loginForm = page.locator("form.login__card--form");
    await loginForm.getByPlaceholder("nombre@empresa.com").fill("qa@seal.test");
    await loginForm.getByPlaceholder("Contraseña").fill("PruebaSegura123!");
    await loginForm.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    expect(loginPayload).toEqual({
      email: "qa@seal.test",
      password: "PruebaSegura123!",
    });

    const session = await page.evaluate(() => ({
      token: localStorage.getItem("seal_token"),
      user: JSON.parse(localStorage.getItem("seal_user") || "null"),
    }));

    expect(session.token).toBeNull();
    expect(session.user.role).toBe("ADMIN");

    const cookies = await page.context().cookies();
    const authCookie = cookies.find((cookie) => cookie.name === "seal_session");
    expect(authCookie).toBeTruthy();
    expect(authCookie.httpOnly).toBe(true);
  });

  test("muestra el error entregado por la API sin crear una sesión", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          message: "Credenciales inválidas",
        }),
      })
    );

    await page.goto("/login");
    const loginForm = page.locator("form.login__card--form");
    await loginForm.getByPlaceholder("nombre@empresa.com").fill("error@seal.test");
    await loginForm.getByPlaceholder("Contraseña").fill("Incorrecta123!");
    await loginForm.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("seal_token"))).toBeNull();
  });

  test("obliga a cambiar la contraseña antes de abrir el panel", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "set-cookie": "seal_session=cambio-obligatorio; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({
          ok: true,
          data: {
            user: {
              id: "qa-client",
              name: "Cliente QA",
              email: "cliente@seal.test",
              role: "CLIENT",
              status: "ACTIVE",
              must_change_password: true,
            },
          },
        }),
      })
    );

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            user: {
              id: "qa-client",
              name: "Cliente QA",
              email: "cliente@seal.test",
              role: "CLIENT",
              status: "ACTIVE",
              must_change_password: true,
            },
          },
        }),
      })
    );

    await page.goto("/login");
    await page.getByPlaceholder("nombre@empresa.com").fill("cliente@seal.test");
    await page.getByPlaceholder("Contraseña").fill("Temporal123!");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/cambiar-password$/);
    await expect(page.getByRole("heading", { name: "Cambia tu contraseña" })).toBeVisible();
  });

  test("el botón de recuperación tiene un nombre accesible independiente", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contraseña").fill("NoDebeAparecer123!");

    const recoveryButton = page.getByRole("button", { name: "Recuperar contraseña", exact: true });
    await expect(recoveryButton).toBeVisible();
    await expect(recoveryButton).toHaveAccessibleName("Recuperar contraseña");
  });
});
