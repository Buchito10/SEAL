"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  confirmPasswordReset,
  verifyResetToken,
  type PasswordLinkInfo,
} from "@/lib/api";

type PasswordPurpose = PasswordLinkInfo["purpose"];

type PasswordAccessFormProps = {
  expectedPurpose: PasswordPurpose;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

export default function PasswordAccessForm({ expectedPurpose }: PasswordAccessFormProps) {
  const router = useRouter();
  const isActivation = expectedPurpose === "ACCOUNT_ACTIVATION";
  const [token, setToken] = useState("");
  const [linkInfo, setLinkInfo] = useState<PasswordLinkInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptsDataProtection, setAcceptsDataProtection] = useState(false);
  const [acceptsPrivacyNotice, setAcceptsPrivacyNotice] = useState(false);
  const capturedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      if (capturedTokenRef.current === null) {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        capturedTokenRef.current = hashParams.get("token") || url.searchParams.get("token") || "";

        // Conserva otros parametros, pero retira el secreto de la barra e historial visible.
        hashParams.delete("token");
        url.searchParams.delete("token");
        url.hash = hashParams.toString();
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }

      const rawToken = capturedTokenRef.current;

      if (!rawToken) {
        setError("El enlace no contiene un token de acceso.");
        setChecking(false);
        return;
      }

      try {
        const info = await verifyResetToken(rawToken);
        if (info.purpose !== expectedPurpose) {
          setError("Este enlace no corresponde a esta operación.");
          return;
        }
        setToken(rawToken);
        setLinkInfo(info);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setChecking(false);
      }
    }

    void verifyToken();
  }, [expectedPurpose]);

  const requiresConsent = Boolean(linkInfo?.requires_consent);
  const consentComplete = !requiresConsent || (acceptsDataProtection && acceptsPrivacyNotice);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!consentComplete) {
      setError("Debes leer y aceptar ambos documentos para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({
        token,
        newPassword,
        ...(requiresConsent && linkInfo
          ? {
              acceptsPrivacyNotice,
              acceptsDataProtection,
              privacyNoticeVersion: linkInfo.legal_versions.privacy_notice,
              dataProtectionVersion: linkInfo.legal_versions.data_protection,
            }
          : {}),
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const title = isActivation ? "Activa tu cuenta" : "Restablecer contraseña";
  const subtitle = isActivation
    ? "Tu administrador te dio acceso. Crea tu contraseña y revisa cómo protegemos tus datos."
    : "Define una nueva contraseña segura para tu cuenta.";

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
                <div className="login__brandSub">
                  {isActivation ? "Invitación de acceso" : "Recuperación segura"}
                </div>
              </div>
            </div>

            <h1 className="login__title">{title}</h1>
            <p className="login__subtitle">{subtitle}</p>
          </div>

          {checking ? (
            <div className="muted small">Verificando enlace...</div>
          ) : done ? (
            <div className="form-grid">
              <div className="note activation-success">
                <div className="note__title">
                  {isActivation ? "Cuenta activada" : "Contraseña actualizada"}
                </div>
                <div className="note__text">
                  Ya puedes iniciar sesión con tu correo y la contraseña que acabas de establecer.
                </div>
              </div>
              <button className="btn btn--primary w-full" onClick={() => router.push("/login")}>
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleSubmit}>
              {error && (
                <div className="note activation-error" role="alert">
                  <div className="note__title text-danger">No se pudo continuar</div>
                  <div className="note__text">{error}</div>
                </div>
              )}

              {isActivation && token && (
                <div className="note activation-invitation-note">
                  <div className="note__title">Acceso autorizado por tu administrador</div>
                  <div className="note__text">
                    La cuenta ya fue dada de alta con tu correo. Este paso confirma que controlas el correo, establece tu contraseña y registra tu consentimiento.
                  </div>
                </div>
              )}

              <label className="field">
                <span className="field__label">Nueva contraseña *</span>
                <input
                  className="control"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
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
                  maxLength={72}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={!token}
                />
              </label>

              {requiresConsent && linkInfo && (
                <fieldset className="activation-consent">
                  <legend>Consentimiento informado</legend>
                  <p>
                    Revisa cada documento en una pestaña nueva. Ninguna opción está seleccionada por defecto.
                  </p>

                  <label className="activation-check">
                    <input
                      type="checkbox"
                      checked={acceptsDataProtection}
                      onChange={(event) => setAcceptsDataProtection(event.target.checked)}
                      required
                    />
                    <span>
                      He leído y acepto el{" "}
                      <Link href="/proteccion-datos" target="_blank" rel="noreferrer">
                        documento de protección de datos personales
                      </Link>.
                      <small>Versión {linkInfo.legal_versions.data_protection}</small>
                    </span>
                  </label>

                  <label className="activation-check">
                    <input
                      type="checkbox"
                      checked={acceptsPrivacyNotice}
                      onChange={(event) => setAcceptsPrivacyNotice(event.target.checked)}
                      required
                    />
                    <span>
                      He leído y acepto la{" "}
                      <Link href="/politica-privacidad" target="_blank" rel="noreferrer">
                        política de privacidad
                      </Link>.
                      <small>Versión {linkInfo.legal_versions.privacy_notice}</small>
                    </span>
                  </label>
                </fieldset>
              )}

              <button
                className="btn btn--primary btn--xl w-full"
                type="submit"
                disabled={submitting || !token || !linkInfo || !consentComplete}
              >
                {submitting
                  ? "Guardando..."
                  : isActivation
                    ? "Aceptar y activar cuenta"
                    : "Actualizar contraseña"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
