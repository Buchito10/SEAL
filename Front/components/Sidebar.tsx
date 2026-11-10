"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { logoutSession } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";

const NAV: { label: string; href: string; icon: IconName }[] = [
  { label: "Resumen", href: "/dashboard", icon: "home" },
  { label: "Contratos", href: "/contratos", icon: "document" },
  { label: "Plantillas", href: "/plantillas", icon: "templates" },
  { label: "Estudio IA", href: "/plantillas/ia", icon: "sparkles" },
  { label: "Clientes", href: "/clientes", icon: "users" },
  { label: "Notificaciones", href: "/notificaciones", icon: "bell" },
  { label: "Bitácora", href: "/bitacora", icon: "history" },
  { label: "Ajustes", href: "/ajustes", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useState(() => getUser());
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const drawer = useRef<HTMLDialogElement>(null);
  const current = NAV.find((item) => item.href === pathname);

  async function handleLogout() {
    setLeaving(true); setError("");
    try { await logoutSession(); logout(); router.replace("/login"); }
    catch { setError("No se pudo cerrar la sesión. Intenta de nuevo."); }
    finally { setLeaving(false); }
  }

  function content(mobile = false) {
    return <>
      <Link href="/dashboard" className="brand brand--link" aria-label="SEAL — Ir al resumen" onClick={() => drawer.current?.close()}>
        <BrandLogo size="small" /><div className="brand__text"><div className="brand__name">SEAL</div><div className="brand__sub">Contratos inteligentes</div></div>
      </Link>
      {mobile && <button className="seal-nav-close" aria-label="Cerrar menú" onClick={() => drawer.current?.close()}><Icon name="close" /></button>}
      <nav className="nav" aria-label={mobile ? "Navegación móvil" : "Navegación principal"}>
        {NAV.map((item) => <Link key={item.href} href={item.href} onClick={() => drawer.current?.close()} aria-current={pathname === item.href ? "page" : undefined} className={`nav__item ${pathname === item.href ? "is-active" : ""}`}><Icon name={item.icon} /><span>{item.label}</span>{item.icon === "sparkles" && <small className="seal-nav-ai">IA</small>}</Link>)}
      </nav>
      <div className="sidebar__bottom">
        <Link className="seal-privacy-link" href="/politicas" onClick={() => drawer.current?.close()}><Icon name="shield" /> Privacidad y seguridad</Link>
        {error && <p className="seal-error" role="alert">{error}</p>}
        <div className="user"><div className="user__avatar">{(user?.name || "AD").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="user__meta"><div className="user__name">{user?.name || "Administrador"}</div><div className="user__role">Administración</div></div><button className="icon-btn" aria-label="Cerrar sesión" disabled={leaving} onClick={() => void handleLogout()}><Icon name="logout" /></button></div>
      </div>
    </>;
  }

  return <>
    <a className="seal-skip" href="#contenido">Saltar al contenido</a>
    <aside className="sidebar seal-sidebar">{content()}</aside>
    <header className="seal-mobile-header"><Link href="/dashboard" className="seal-mobile-brand"><BrandLogo size="small" /> SEAL</Link><span>{current?.label || "Administración"}</span><button aria-label="Abrir menú" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><Icon name="menu" /></button></header>
    <dialog ref={drawer} className="seal-nav-drawer" aria-label="Menú de SEAL" onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}><div className="seal-nav-content">{content(true)}</div></dialog>
  </>;
}
