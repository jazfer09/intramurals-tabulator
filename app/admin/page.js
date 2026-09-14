"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);

  const [newEventName, setNewEventName] = useState("");
  const [newEventCategory, setNewEventCategory] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#2b50aa");

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, "events"), orderBy("name")),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTeams = onSnapshot(
      query(collection(db, "teams"), orderBy("name")),
      (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubEvents();
      unsubTeams();
      unsubUsers();
    };
  }, []);

  const addEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    await addDoc(collection(db, "events"), {
      name: newEventName.trim(),
      category: newEventCategory.trim() || "General",
    });
    setNewEventName("");
    setNewEventCategory("");
  };

  const addTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await addDoc(collection(db, "teams"), {
      name: newTeamName.trim(),
      color: newTeamColor,
    });
    setNewTeamName("");
  };

  const deleteEvent = async (id) => {
    if (confirm("Delete this event?")) await deleteDoc(doc(db, "events", id));
  };

  const deleteTeam = async (id) => {
    if (confirm("Delete this team?")) await deleteDoc(doc(db, "teams", id));
  };

  const changeUserRole = async (userId, role) => {
    await updateDoc(doc(db, "users", userId), { role });
  };

  const toggleAssignedEvent = async (user, eventId) => {
    const current = user.assignedEvents || [];
    const updated = current.includes(eventId)
      ? current.filter((id) => id !== eventId)
      : [...current, eventId];
    await updateDoc(doc(db, "users", user.id), { assignedEvents: updated });
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Admin Dashboard</h1>

        {/* EVENTS */}
        <div className="card">
          <h2>Events</h2>
          <form onSubmit={addEvent} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label>Event Name</label>
              <input
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g. 100m Dash"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Category</label>
              <input
                value={newEventCategory}
                onChange={(e) => setNewEventCategory(e.target.value)}
                placeholder="e.g. Track & Field"
              />
            </div>
            <button className="primary" type="submit" style={{ marginBottom: "0.8rem" }}>
              Add
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.name}</td>
                  <td>{ev.category}</td>
                  <td>
                    <button className="link-button" onClick={() => deleteEvent(ev.id)}>
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TEAMS */}
        <div className="card">
          <h2>Teams / Houses</h2>
          <form onSubmit={addTeam} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label>Team Name</label>
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Blue Team"
              />
            </div>
            <div>
              <label>Color</label>
              <input
                type="color"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                style={{ width: 60, padding: 2 }}
              />
            </div>
            <button className="primary" type="submit" style={{ marginBottom: "0.8rem" }}>
              Add
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Color</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: t.color,
                        verticalAlign: "middle",
                      }}
                    />{" "}
                    {t.color}
                  </td>
                  <td>
                    <button className="link-button" onClick={() => deleteTeam(t.id)}>
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* USERS / ROLES */}
        <div className="card">
          <h2>Staff Accounts & Roles</h2>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Kapag may bagong sign up, "viewer" muna sila. I-promote as "scorer"
            tapos i-check kung anong events pwede nilang scorean.
          </p>
          {users.map((u) => (
            <div key={u.id} className="card" style={{ background: "#fafbff" }}>
              <strong>{u.displayName || u.email}</strong> — {u.email}
              <div style={{ margin: "0.6rem 0" }}>
                <label>Role</label>
                <select
                  value={u.role || "viewer"}
                  onChange={(e) => changeUserRole(u.id, e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="scorer">Scorer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {(u.role === "scorer" || u.role === "admin") && (
                <div>
                  <label>Assigned Events</label>
                  {events.map((ev) => (
                    <div className="checkbox-row" key={ev.id}>
                      <input
                        type="checkbox"
                        checked={(u.assignedEvents || []).includes(ev.id)}
                        onChange={() => toggleAssignedEvent(u, ev.id)}
                      />
                      <span>{ev.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
