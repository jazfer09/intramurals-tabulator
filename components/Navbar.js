"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABELS = {
  admin: "Admin",
  scorer: "Judge",
  viewer: "User",
};

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const roleLabel = ROLE_LABELS[role] || "User";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link href="/scoreboard">🏆 Intramurals Tabulator</Link>
      </div>
      <div className="navbar-links">
        <Link href="/scoreboard">Scoreboard</Link>
        {(role === "scorer" || role === "admin") && (
          <Link href="/scorer">Judges</Link>
        )}
        {role === "admin" && <Link href="/admin">Admin</Link>}
        {user ? (
          <>
            <span className="role-badge">{roleLabel}</span>
            <button onClick={handleLogout} className="link-button">
              Logout ({user.email})
            </button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
