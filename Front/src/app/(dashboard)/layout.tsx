"use client";

import Sidebar from "@/components/Sidebar";
import type { SessionUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";

const TOKEN_KEY = "seal_token";
const USER_KEY = "seal_user";

function subscribeSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSessionSnapshot() {
  if (typeof window === "undefined") return "";
  return `${window.localStorage.getItem(TOKEN_KEY) || ""}\n${window.localStorage.getItem(USER_KEY) || ""}`;
}

function getServerSessionSnapshot() {
  return "";
}

function parseSession(snapshot: string) {
  const [token, rawUser = ""] = snapshot.split("\n");

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(rawUser) as SessionUser };
  } catch {
    return { token: null, user: null };
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const sessionSnapshot = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  const session = useMemo(() => parseSession(sessionSnapshot), [sessionSnapshot]);

  useEffect(() => {
    if (!session.token || !session.user) {
      router.replace("/login");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.replace("/cliente/dashboard");
    }
  }, [router, session]);

  if (!session.token || !session.user || session.user.role !== "ADMIN") return null;

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <div className="page">
          {children}
        </div>
      </main>
    </div>
  );
}
