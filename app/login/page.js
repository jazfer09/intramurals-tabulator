"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      // figure out role right away so we can redirect to the right page
      const uid = auth.currentUser?.uid;
      let role = "viewer";
      if (uid) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) role = snap.data().role || "viewer";
      }
      if (role === "admin") router.push("/admin");
      else if (role === "scorer") router.push("/scorer");
      else router.push("/scoreboard");
    } catch (err) {
      setError("Mali ang email o password. Pakisubukan ulit.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <h1>Staff Login</h1>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>
          <p style={{ marginTop: "1rem" }}>
            Walang account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
}
