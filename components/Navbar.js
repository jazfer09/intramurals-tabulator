"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link href="/scoreboard">🏆 Intramurals Tabulator</Link>
      </div>
      <div className="navbar-links">
        <Link href="/scoreboard">Scoreboard</Link>
        {(role === "scorer" || role === "admin") && (
          <Link href="/scorer">Input Score</Link>
        )}
        {role === "admin" && <Link href="/admin">Admin</Link>}
        {user ? (
          <button onClick={handleLogout} className="link-button">
            Logout ({user.email})
          </button>
        ) : (
          <Link href="/login">Staff Login</Link>
        )}
      </div>
    </nav>
  );
}
