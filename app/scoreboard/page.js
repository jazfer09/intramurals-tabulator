"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";

export default function ScoreboardPage() {
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    // Real-time listener: any new score submitted anywhere updates
    // this leaderboard instantly for everyone watching.
    const unsubScores = onSnapshot(collection(db, "scores"), (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubTeams();
      unsubEvents();
      unsubScores();
    };
  }, []);

  // Aggregate total points per team
  const totals = teams
    .map((team) => {
      const total = scores
        .filter((s) => s.teamId === team.id)
        .reduce((sum, s) => sum + (s.points || 0), 0);
      return { ...team, total };
    })
    .sort((a, b) => b.total - a.total);

  // Per-event breakdown table
  const breakdown = events.map((ev) => ({
    ...ev,
    perTeam: teams.map((t) => ({
      teamName: t.name,
      points: scores
        .filter((s) => s.eventId === ev.id && s.teamId === t.id)
        .reduce((sum, s) => sum + (s.points || 0), 0),
    })),
  }));

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>🏆 Live Leaderboard</h1>

        <div className="card">
          {totals.length === 0 ? (
            <p>Walang teams pa. Magdagdag muna sa Admin page.</p>
          ) : (
            totals.map((team, idx) => (
              <div
                key={team.id}
                className="leaderboard-row"
                style={{ background: team.color || "#2b50aa" }}
              >
                <span className="leaderboard-rank">#{idx + 1}</span>
                <span className="leaderboard-name">{team.name}</span>
                <span className="leaderboard-points">{team.total} pts</span>
              </div>
            ))
          )}
        </div>

        {breakdown.length > 0 && (
          <div className="card">
            <h2>Per-Event Breakdown</h2>
            {breakdown.map((ev) => (
              <div key={ev.id} style={{ marginBottom: "1.2rem" }}>
                <strong>
                  {ev.name} <span style={{ color: "#888" }}>({ev.category})</span>
                </strong>
                <table>
                  <tbody>
                    {ev.perTeam.map((pt, i) => (
                      <tr key={i}>
                        <td>{pt.teamName}</td>
                        <td>{pt.points} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
