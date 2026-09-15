"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BRACKETS, bracketOf } from "@/lib/levels";
import Navbar from "@/components/Navbar";

function average(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function ScoreboardPage() {
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [scores, setScores] = useState([]);
  const [bracketFilter, setBracketFilter] = useState("All");

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) =>
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubScores = onSnapshot(collection(db, "scores"), (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubTeams();
      unsubEvents();
      unsubScores();
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (bracketFilter === "All") return events;
    return events.filter((ev) => bracketOf(ev.level) === bracketFilter);
  }, [events, bracketFilter]);

  // Per event+team: average the weighted scores across every judge
  // who scored that pairing (so a team isn't penalized/boosted just
  // because more or fewer judges scored them for one event). Falls
  // back to legacy "points" field for any older score records.
  const scoreFor = (eventId, teamId) => {
    const relevant = scores.filter((s) => s.eventId === eventId && s.teamId === teamId);
    const values = relevant.map((s) =>
      typeof s.weightedTotal === "number" ? s.weightedTotal : Number(s.points) || 0
    );
    return average(values);
  };

  const totals = teams
    .map((team) => {
      const total = filteredEvents.reduce((sum, ev) => sum + scoreFor(ev.id, team.id), 0);
      return { ...team, total };
    })
    .sort((a, b) => b.total - a.total);

  const breakdown = filteredEvents.map((ev) => ({
    ...ev,
    perTeam: teams.map((t) => ({
      teamName: t.name,
      points: scoreFor(ev.id, t.id),
    })),
  }));

  const exportCSV = () => {
    const rows = [["Rank", "Team", "Total Score"]];
    totals.forEach((t, idx) => rows.push([idx + 1, t.name, t.total.toFixed(2)]));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scoreboard-${bracketFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTallySheet = () => {
    window.print();
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Live Leaderboard</h1>

        <div className="filter-row no-print">
          {["All", ...BRACKETS].map((b) => (
            <button
              key={b}
              className={"filter-chip" + (bracketFilter === b ? " active" : "")}
              onClick={() => setBracketFilter(b)}
              type="button"
            >
              {b}
            </button>
          ))}
        </div>

        <div className="no-print" style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
          <button className="primary" onClick={exportCSV} type="button">
            Export CSV
          </button>
          <button className="primary" onClick={printTallySheet} type="button">
            Print Official Tally Sheet
          </button>
        </div>

        <div id="tally-sheet">
          <h2 className="print-only">
            Official Tally Sheet — {bracketFilter === "All" ? "All Levels" : bracketFilter}
          </h2>
          <p className="print-only">Generated: {new Date().toLocaleString()}</p>

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
                  <span className="leaderboard-points">{team.total.toFixed(2)} pts</span>
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
                    {ev.name} <span style={{ color: "#888" }}>({bracketOf(ev.level)})</span>
                  </strong>
                  <table>
                    <tbody>
                      {ev.perTeam.map((pt, i) => (
                        <tr key={i}>
                          <td>{pt.teamName}</td>
                          <td>{pt.points.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <div className="print-only" style={{ marginTop: "3rem" }}>
            <p>Certified correct by:</p>
            <br />
            <br />
            <p>_______________________________</p>
            <p>Tabulation Committee Head</p>
          </div>
        </div>
      </div>
    </>
  );
}
