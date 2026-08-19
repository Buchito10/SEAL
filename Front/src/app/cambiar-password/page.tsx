"use client";

import { changePassword, getCurrentSession } from "@/lib/api";
import { getUser, saveSession, updateSessionUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo cambiar la contraseña.";
}

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getCurrentSession()
      .then(({ user }) => {
        saveSession(user);
        if (!user.must_change_password) {
          router.replace(user.role === "ADMIN" ? "/dashboard" : "/cliente/dashboard");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmation) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("La contraseña nueva debe ser diferente a la actual.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await changePassword(currentPassword, newPassword);
      updateSessionUser({ ...user, must_change_password: false });
      const currentUser = getUser() || user;
      router.replace(currentUser.role === "ADMIN" ? "/dashboard" : "/cliente/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login login--auth">
      <div className="login__light login__light--one" />
      <div className="login__light login__light--two" />
      <section className="login__wrap login__wrap--auth">
        <form className="login__card login__card--form form-grid" onSubmit={handleSubmit}>
          <div className="login__brand">
            <div className="login__logo">S</div>
            <div>
              <div className="login__brandName">Seal</div>
              <div className="login__brandSub">Protección de la cuenta</div>
            </div>
          </div>
          <div>
            <h1 className="login__title">Cambia tu contraseña</h1>
            <p className="login__subtitle">Debes completar este paso antes de utilizar el sistema.</p>
          </div>
          {error && <div className="note text-danger" role="alert">{error}</div>}
          <label className="field">
            <span className="field__label">Contraseña actual</span>
            <input className="control control--lg" type="password" autoComplete="current-password" minLength={6} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">Nueva contraseña</span>
            <input className="control control--lg" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">Confirmar nueva contraseña</span>
            <input className="control control--lg" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          </label>
          <button className="btn btn--primary btn--xl w-full" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contraseña y continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}
