"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { bracketOf } from "@/lib/levels";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

function ScorerForm() {
  const { user, role, assignedEvents } = useAuth();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);

  const [eventId, setEventId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [criteriaScores, setCriteriaScores] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubScores = onSnapshot(collection(db, "scores"), (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubEvents();
      unsubTeams();
      unsubScores();
    };
  }, []);

  // Admins can see/score any active event; scorers only their
  // assigned ones — and only once the admin has flipped it Active.
  const scoreableEvents = useMemo(() => {
    const base = role === "admin" ? events : events.filter((ev) => assignedEvents.includes(ev.id));
    return base
      .filter((ev) => ev.active)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [events, role, assignedEvents]);

  const lineup = useMemo(() => {
    const base = role === "admin" ? events : events.filter((ev) => assignedEvents.includes(ev.id));
    return base.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [events, role, assignedEvents]);

  const selectedEvent = events.find((ev) => ev.id === eventId);
  const criteria = selectedEvent?.criteria || [];

  useEffect(() => {
    // Reset the score inputs whenever a different event is chosen.
    const initial = {};
    criteria.forEach((c) => (initial[c.name] = ""));
    setCriteriaScores(initial);
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const weightedTotal = useMemo(() => {
    if (!criteria.length) return 0;
    return criteria.reduce((sum, c) => {
      const raw = Number(criteriaScores[c.name]) || 0;
      return sum + (raw * (Number(c.weight) || 0)) / 100;
    }, 0);
  }, [criteria, criteriaScores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!eventId || !teamId) {
      setMessage("Pumili muna ng event at team.");
      return;
    }
    if (criteria.some((c) => criteriaScores[c.name] === "" || criteriaScores[c.name] === undefined)) {
      setMessage("Punan lahat ng criteria scores.");
      return;
    }
    setSubmitting(true);
    try {
      const scoreId = `${eventId}_${teamId}_${user.uid}`;
      await setDoc(doc(db, "scores", scoreId), {
        eventId,
        teamId,
        judgeId: user.uid,
        judgeEmail: user.email,
        criteriaScores: Object.fromEntries(
          Object.entries(criteriaScores).map(([k, v]) => [k, Number(v)])
        ),
        weightedTotal,
        timestamp: serverTimestamp(),
      });
      setMessage("Score submitted!");
      setTeamId("");
    } catch (err) {
      setMessage("May error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const myScoresForEvent = (evId) => scores.filter((s) => s.eventId === evId && s.judgeId === user.uid);

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Judges — Input Score</h1>

        <div className="card">
          <h2>Today's Lineup</h2>
          {lineup.length === 0 ? (
            <p>Wala pang na-assign na event sa iyo. Kontakin ang admin.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Event</th>
                    <th>Level</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lineup.map((ev) => (
                    <tr key={ev.id} style={eventId === ev.id ? { background: "#eef2ff" } : {}}>
                      <td>{ev.order ?? "—"}</td>
                      <td>{ev.name}</td>
                      <td>{bracketOf(ev.level)}</td>
                      <td>{ev.time || "—"}</td>
                      <td>
                        <span className={"status-badge " + (ev.active ? "status-on" : "status-off")}>
                          {ev.active ? "Active" : "Not yet active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Submit a Score</h2>
          {scoreableEvents.length === 0 ? (
            <p>
              Walang aktibong event ngayon na pwede mong scorean. Maghintay hanggang i-activate ito ng
              admin sa harapan ninyo.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>Event</label>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">-- Pumili ng event --</option>
                {scoreableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({bracketOf(ev.level)})
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

              {criteria.length > 0 && (
                <div style={{ margin: "1rem 0" }}>
                  <label>Criteria Scores (0-100 bawat isa)</label>
                  {criteria.map((c) => (
                    <div key={c.name} style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ flex: 1 }}>
                        {c.name} <span style={{ color: "#888" }}>({c.weight}%)</span>
                      </span>
                      <input
                        style={{ flex: 1, marginBottom: 0 }}
                        type="number"
                        min={0}
                        max={100}
                        value={criteriaScores[c.name] ?? ""}
                        onChange={(e) =>
                          setCriteriaScores({ ...criteriaScores, [c.name]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <p style={{ fontWeight: 700 }}>Weighted Total: {weightedTotal.toFixed(2)} / 100</p>
                </div>
              )}

              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Score"}
              </button>
              {message && <p style={{ marginTop: "0.8rem" }}>{message}</p>}
            </form>
          )}
        </div>

        {eventId && (
          <div className="card">
            <h2>Aking Naisumite na sa Event na Ito</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Weighted Total</th>
                  </tr>
                </thead>
                <tbody>
                  {myScoresForEvent(eventId).map((s) => (
                    <tr key={s.id}>
                      <td>{teams.find((t) => t.id === s.teamId)?.name || s.teamId}</td>
                      <td>{Number(s.weightedTotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
