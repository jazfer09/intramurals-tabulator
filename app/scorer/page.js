"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

function ScorerForm() {
  const { user, role, assignedEvents } = useAuth();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [recentScores, setRecentScores] = useState([]);

  const [eventId, setEventId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [points, setPoints] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubScores = onSnapshot(
      query(collection(db, "scores"), orderBy("timestamp", "desc"), limit(10)),
      (snap) => setRecentScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubEvents();
      unsubTeams();
      unsubScores();
    };
  }, []);

  // Admins can score any event; scorers only their assigned ones.
  const availableEvents =
    role === "admin"
      ? events
      : events.filter((ev) => assignedEvents.includes(ev.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!eventId || !teamId || points === "") {
      setMessage("Kumpletuhin ang lahat ng fields.");
      return;
    }
    await addDoc(collection(db, "scores"), {
      eventId,
      teamId,
      points: Number(points),
      enteredBy: user.email,
      timestamp: serverTimestamp(),
    });
    setMessage("✅ Score submitted!");
    setPoints("");
  };

  const eventName = (id) => events.find((e) => e.id === id)?.name || id;
  const teamName = (id) => teams.find((t) => t.id === id)?.name || id;

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Input Score</h1>
        <div className="card">
          {availableEvents.length === 0 ? (
            <p>
              Walang events na assigned sa iyo. Kontakin ang admin para
              maitalaga ka sa isang event.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>Event</label>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">-- Pumili ng event --</option>
                {availableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.category})
                  </option>
                ))}
              </select>

              <label>Team</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">-- Pumili ng team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <label>Points</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 10"
              />

              <button className="primary" type="submit">
                Submit Score
              </button>
              {message && <p style={{ marginTop: "0.8rem" }}>{message}</p>}
            </form>
          )}
        </div>

        <div className="card">
          <h2>Recent Entries</h2>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Team</th>
                <th>Points</th>
                <th>Entered By</th>
              </tr>
            </thead>
            <tbody>
              {recentScores.map((s) => (
                <tr key={s.id}>
                  <td>{eventName(s.eventId)}</td>
                  <td>{teamName(s.teamId)}</td>
                  <td>{s.points}</td>
                  <td>{s.enteredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function ScorerPage() {
  return (
    <ProtectedRoute allowedRoles={["scorer", "admin"]}>
      <ScorerForm />
    </ProtectedRoute>
  );
}
