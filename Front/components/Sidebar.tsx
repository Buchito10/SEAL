"use client";

import Link from "next/link";
import { logoutSession } from "@/lib/api";
import { getUser, logout, type SessionUser } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Contratos", href: "/contratos" },
  { label: "Plantillas", href: "/plantillas" },
  { label: "IA Plantillas", href: "/plantillas/ia" },
  { label: "Clientes", href: "/clientes" },
  { label: "Notificaciones", href: "/notificaciones" },
  { label: "Bitácora", href: "/bitacora" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useState<SessionUser | null>(() => getUser());

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/plantillas") return pathname === "/plantillas";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <aside className="sidebar">
      {/* 🔷 BRAND = DASHBOARD */}
      <Link href="/" className="brand brand--link" aria-label="Ir al Dashboard">
        <div className="brand__logo">S</div>
        <div className="brand__text">
          <div className="brand__name">Seal</div>
          <div className="brand__sub">Dashboard Admin</div>
        </div>
      </Link>

      {/* 🔹 NAV */}
      <nav className="nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav__item ${isActive(item.href) ? "is-active" : ""}`}
          >
            <span className="nav__dot"></span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 🔹 FOOTER */}
      <div className="sidebar__bottom">
        <div className="mini-card">
          <div className="mini-card__title">Seguridad</div>
          <div className="mini-card__text">
            HTTPS · Tokens expiran · Acceso por rol
          </div>
          <Link className="btn btn--ghost w-full" href="/politicas">Ver políticas</Link>
        </div>

        <div className="user">
          <div className="user__avatar">
            {(user?.name || "AD")
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="user__meta">
            <div className="user__name">{user?.name || "Administrador"}</div>
            <div className="user__role">{user?.email || "Sesión activa"}</div>
          </div>
          <button className="icon-btn" aria-label="Salir" onClick={() => void handleLogout()}>⎋</button>
        </div>
      </div>
    </aside>
  );
}
