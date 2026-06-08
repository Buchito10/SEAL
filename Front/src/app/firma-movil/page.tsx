"use client";

import {
  signMobileAssignment,
  verifyMobileSignatureToken,
  type MobileSignatureInfo,
} from "@/lib/api";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MobileSignatureContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [info, setInfo] = useState<MobileSignatureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!token) throw new Error("Token no encontrado.");
        const data = await verifyMobileSignatureToken(token);
        setInfo(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  useEffect(() => {
    if (!info || notice) return;
    const frame = requestAnimationFrame(() => setupCanvas());
    return () => cancelAnimationFrame(frame);
  }, [info, notice]);

  function setupCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.floor(240 * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, 240);
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }

  function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function beginSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;

    const point = pointerPosition(event);
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();

    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;

    const point = pointerPosition(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setDirty(true);
  }

  function endSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearSignature() {
    setupCanvas();
    setDirty(false);
  }

  async function onSign() {
    if (!canvasRef.current || !token) return;
    if (!dirty) {
      setError("Dibuja tu firma antes de confirmar.");
      return;
    }

    setSigning(true);
    setError("");
    setNotice("");

    try {
      await signMobileAssignment(token, {
        signature_png_base64: canvasRef.current.toDataURL("image/png"),
        signature_bbox: {
          x: 80,
          y: 650,
          width: 220,
          height: 90,
          page: 1,
        },
      });
      setNotice("Firma enviada correctamente. Puedes cerrar esta pantalla.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSigning(false);
    }
  }

  return (
    <main className="login login--auth signature-mobile">
      <div className="login__light login__light--one" />
      <div className="login__light login__light--two" />

      <section className="login__wrap login__wrap--wide signature-mobile__wrap">
        <div className="login__card signature-mobile__card" style={{ maxWidth: 720 }}>
          <div className="login__header">
            <div className="login__brand">
              <div className="login__logo">S</div>
              <div>
                <div className="login__brandName">Seal</div>
                <div className="login__brandSub">Firma móvil</div>
              </div>
            </div>

            <h1 className="login__title">Firmar contrato</h1>
            <p className="login__subtitle">
              Dibuja tu firma en la pantalla y confirma para enviarla de forma segura.
            </p>
          </div>

          {loading ? (
            <div className="note">
              <div className="note__text">Validando enlace...</div>
            </div>
          ) : error ? (
            <div className="note">
              <div className="note__title text-danger">No se puede firmar</div>
              <div className="note__text">{error}</div>
            </div>
          ) : notice ? (
            <div className="note">
              <div className="note__title">Firma recibida</div>
              <div className="note__text">{notice}</div>
            </div>
          ) : (
            <div className="login__form">
              <div className="note" style={{ marginTop: 0 }}>
                <div className="note__title">{info?.contract_title || "Contrato"}</div>
                <div className="note__text">
                  Cliente: {info?.client_name || "Cliente"} · Expira: {formatDate(info?.expires_at)}
                </div>
              </div>

              <canvas
                className="signature-canvas signature-canvas--mobile"
                ref={canvasRef}
                onPointerDown={beginSignature}
                onPointerMove={drawSignature}
                onPointerUp={endSignature}
                onPointerCancel={endSignature}
                style={{
                  width: "100%",
                  height: 240,
                  display: "block",
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid var(--stroke2)",
                  touchAction: "none",
                }}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="btn btn--ghost" onClick={clearSignature} disabled={signing}>
                  Limpiar
                </button>
                <button className="btn btn--primary" onClick={() => void onSign()} disabled={signing || !dirty}>
                  {signing ? "Enviando..." : "Confirmar firma"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function MobileSignaturePage() {
  return (
    <Suspense fallback={null}>
      <MobileSignatureContent />
    </Suspense>
  );
}
