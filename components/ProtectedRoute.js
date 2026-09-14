"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Wrap any page with this to restrict access to specific roles.
// Example: <ProtectedRoute allowedRoles={["admin"]}>...</ProtectedRoute>
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace("/scoreboard");
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(role))) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  return children;
}
