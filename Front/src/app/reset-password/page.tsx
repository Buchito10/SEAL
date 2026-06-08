"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPasswordReset, verifyResetToken } from "@/lib/api";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function verifyToken() {
      const params = new URLSearchParams(window.location.search);
      const rawToken = params.get("token") || "";

      if (!rawToken) {
        setError("El enlace no contiene token.");
        setChecking(false);
        return;
      }

      setToken(rawToken);

      try {
        await verifyResetToken(rawToken);
      } catch (err) {
        setToken("");
        setError(getErrorMessage(err));
      } finally {
        setChecking(false);
      }
    }

    void verifyToken();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset({
        token,
        newPassword: form.newPassword,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login login--auth reset-access" style={{ overflow: "auto", padding: "32px 0" }}>
      <div className="login__light login__light--one" />
      <div className="login__light login__light--two" />

      <section className="login__wrap login__wrap--wide reset-access__wrap">
        <div className="login__card reset-access__card">
          <div className="login__header">
            <div className="login__brand">
              <div className="login__logo">S</div>
              <div>
                <div className="login__brandName">Seal</div>
                <div className="login__brandSub">Acceso de cliente</div>
              </div>
            </div>

            <h1 className="login__title">Restablecer contraseña</h1>
            <p className="login__subtitle">Define una nueva contraseña segura para tu cuenta.</p>
          </div>

          {checking ? (
            <div className="muted small">Verificando enlace...</div>
          ) : done ? (
            <div className="form-grid">
              <div className="note">
                <div className="note__title">Contraseña actualizada</div>
                <div className="note__text">Ya puedes iniciar sesión con tu correo y tu nueva contraseña.</div>
              </div>
              <button className="btn btn--primary w-full" onClick={() => router.push("/login")}>
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleSubmit}>
              {error && <div className="muted small text-danger">{error}</div>}

              <label className="field">
                <span className="field__label">Nueva contraseña *</span>
                <input
                  className="control"
                  type="password"
                  minLength={8}
                  value={form.newPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                  disabled={!token}
                />
              </label>

              <label className="field">
                <span className="field__label">Confirmar contraseña *</span>
                <input
                  className="control"
                  type="password"
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={!token}
                />
              </label>

              <button className="btn btn--primary btn--xl w-full" type="submit" disabled={submitting || !token}>
                {submitting ? "Guardando..." : "Actualizar contraseña"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}