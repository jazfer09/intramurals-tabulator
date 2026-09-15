"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // New accounts start as "viewer" — admin promotes to "scorer" later
      // from the Admin page. This keeps signup safe/self-serve.
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: name,
        email,
        role: "viewer",
        assignedEvents: [],
      });
      router.push("/scoreboard");
    } catch (err) {
      setError(
        "Hindi na-create ang account. Baka ginagamit na ang email, o mahina ang password (min. 6 characters)."
      );
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
          <h1>Create Account</h1>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Bagong account = "viewer" muna. I-promote ka ng admin bilang
            "scorer" kapag inassign ka na sa isang event.
          </p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
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
              minLength={6}
              required
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Sign Up"}
            </button>
          </form>
          <p style={{ marginTop: "1rem" }}>
            May account na? <Link href="/login">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
