"use client";

import BrandLogo from "@/components/BrandLogo";
import AssistantDock from "@/components/AssistantDock";
import Sidebar from "@/components/Sidebar";
import { getCurrentSession } from "@/lib/api";
import { getUser, saveSession, subscribeSession, type SessionUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(() => getUser());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeSession(() => {
      const current = getUser();
      setUser(current);
      if (!current) router.replace("/login");
    });
    void getCurrentSession()
      .then(({ user: currentUser }) => {
        saveSession(currentUser);
        setUser(currentUser);
        if (currentUser.must_change_password) router.replace("/cambiar-password");
        else if (currentUser.role !== "ADMIN") router.replace("/cliente/dashboard");
      })
      .catch(() => router.replace("/login"))
      .finally(() => setChecking(false));
    return unsubscribe;
  }, [router]);

  if (checking || !user || user.must_change_password || user.role !== "ADMIN") return <div className="seal-session-loading" role="status"><BrandLogo size="large" alt="SEAL" /><p>Preparando tu espacio de trabajo…</p></div>;

  return (
    <div className="app">
      <Sidebar />

      <main className="main" id="contenido" tabIndex={-1}>
        <div className="page">
          {children}
        </div>
      </main>
      <AssistantDock />
    </div>
  );
}
