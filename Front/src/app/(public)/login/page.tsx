"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, requestPasswordReset } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(email, password);
      saveSession(data.token, data.user);

      if (data.user.role === "ADMIN") {
        router.push("/");
      } else {
        router.push("/cliente/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }

    setLoading(false);
  }

  function openResetModal() {
    setResetEmail(email);
    setResetError("");
    setResetNotice("");
    setIsResetOpen(true);
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetNotice("");

    if (!resetEmail.trim()) {
      setResetError("Escribe tu correo.");
      return;
    }

    setResetLoading(true);

    try {
      const response = await requestPasswordReset(resetEmail);
      setResetNotice(
        response?.message || "Solicitud enviada. Revisa tu correo desde este equipo o tu teléfono."
      );
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "No se pudo solicitar la recuperación.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="login login--auth">
      <div className="login__light login__light--one" />
      <div className="login__light login__light--two" />

      <section className="login__wrap login__wrap--auth">
        <div className="login-shell">
          <aside className="login__aside" aria-label="Seguridad de Seal">
            <div className="login__brand login__brand--aside">
              <div className="login__logo">S</div>
              <div>
                <div className="login__brandName">Seal</div>
                <div className="login__brandSub">Contratos y firma digital</div>
              </div>
            </div>

            <div className="login__heroBlock">
              <p className="login__eyebrow">Acceso privado</p>
              <h1 className="login__heroTitle">Acceso seguro a tus contratos.</h1>
              <p className="login__heroText">
                Revisa documentos, conserva evidencia y firma con trazabilidad en un entorno privado.
              </p>
            </div>

            <div className="login__documentStack" aria-hidden="true">
              <div className="login__document login__document--one">
                <span />
                <span />
                <span />
              </div>
              <div className="login__document login__document--two">
                <span />
                <span />
                <span />
              </div>
              <div className="login__sealMark">S</div>
            </div>

            <div className="login__securityList" aria-label="Características de seguridad">
              <span>Cifrado de sesión</span>
              <span>Roles autorizados</span>
              <span>Bitácora auditable</span>
              <span>Firma con evidencia</span>
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="login__card login__card--form">
            <div className="login__header">
              <div className="login__brand login__brand--compact">
                <div className="login__logo">S</div>
                <div>
                  <div className="login__brandName">Seal</div>
                  <div className="login__brandSub">Acceso a la plataforma</div>
                </div>
              </div>

              <h1 className="login__title">Iniciar sesión</h1>
              <p className="login__subtitle">Ingresa con tu cuenta autorizada para continuar.</p>
            </div>

            <div className="login__form">
              {error && (
                <div className="note" style={{ marginBottom: 16 }}>
                  <div className="note__title text-danger">No se pudo iniciar sesión</div>
                  <div className="note__text">{error}</div>
                </div>
              )}

              <label className="field login__group">
                <span className="field__label">Correo institucional</span>
                <div className="login__inputWrap">
                  <span className="login__icon">@</span>
                  <input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="control control--lg"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="field login__group">
                <div className="login__between">
                  <span className="field__label">Contraseña</span>
                  <button className="login__link login__linkButton" type="button" onClick={openResetModal}>
                    Recuperar contraseña
                  </button>
                </div>
                <div className="login__inputWrap">
                  <span className="login__icon">#</span>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="control control--lg"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              <button type="submit" disabled={loading} className="btn btn--primary btn--xl w-full login__cta">
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="login__hint">
                <span className="login__hintDot" />
                <div className="muted small">Acceso protegido para usuarios autorizados. Las acciones quedan registradas en bitácora.</div>
              </div>
            </div>
          </form>
        </div>
      </section>

      <div
        className={`modal-overlay login-reset-overlay ${isResetOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !resetLoading) setIsResetOpen(false);
        }}
      >
        <form className="modal card login-reset-modal" onSubmit={handlePasswordReset} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div>
              <div className="eyebrow">Recuperación segura</div>
              <h2 className="card__title">Restablecer contraseña</h2>
            </div>
            <button
              className="icon-btn icon-btn--sm"
              type="button"
              onClick={() => setIsResetOpen(false)}
              disabled={resetLoading}
              aria-label="Cerrar"
            >
              X
            </button>
          </div>

          <div className="modal__body">
            <p className="login-reset-modal__copy">
              Ingresa el correo asociado a tu cuenta. Validaremos que exista y enviaremos un enlace temporal para configurar una nueva contraseña.
            </p>

            {resetError && (
              <div className="note">
                <div className="note__title text-danger">No se pudo enviar</div>
                <div className="note__text">{resetError}</div>
              </div>
            )}

            {resetNotice && (
              <div className="note login-reset-modal__success">
                <div className="note__title">Solicitud recibida</div>
                <div className="note__text">{resetNotice}</div>
              </div>
            )}

            <label className="field">
              <span className="field__label">Correo institucional</span>
              <input
                className="control control--lg"
                type="email"
                placeholder="nombre@empresa.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          </div>

          <div className="modal__footer">
            <button className="btn btn--ghost" type="button" onClick={() => setIsResetOpen(false)} disabled={resetLoading}>
              {resetNotice ? "Volver al inicio de sesión" : "Cancelar"}
            </button>
            <button className="btn btn--primary" type="submit" disabled={resetLoading || !resetEmail.trim()}>
              {resetLoading ? "Enviando..." : resetNotice ? "Enviar nuevamente" : "Enviar recuperación"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
