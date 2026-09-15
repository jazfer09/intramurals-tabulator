"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { LEVELS, BRACKETS, bracketOf, DEFAULT_CRITERIA, totalWeight } from "@/lib/levels";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function createUserAsAdmin({ fullName, email, password, role }) {
  const secondaryApp = initializeApp(firebaseConfig, "secondary-" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: fullName,
      email,
      role: role || "viewer",
      assignedEvents: [],
    });
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

function emptyCriteria() {
  return DEFAULT_CRITERIA.map((c) => ({ ...c }));
}

function CriteriaEditor({ criteria, setCriteria }) {
  const sum = totalWeight(criteria);
  const update = (idx, field, value) => {
    const next = criteria.slice();
    next[idx] = { ...next[idx], [field]: field === "weight" ? Number(value) : value };
    setCriteria(next);
  };
  return (
    <div style={{ marginTop: "0.6rem" }}>
      <label>Criteria (dapat umabot sa 100%)</label>
      {criteria.map((c, idx) => (
        <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <input
            style={{ flex: 2, marginBottom: 0 }}
            value={c.name}
            onChange={(e) => update(idx, "name", e.target.value)}
            placeholder={`Criterion ${idx + 1}`}
          />
          <input
            style={{ flex: 1, marginBottom: 0 }}
            type="number"
            min={0}
            max={100}
            value={c.weight}
            onChange={(e) => update(idx, "weight", e.target.value)}
          />
          <span style={{ alignSelf: "center" }}>%</span>
        </div>
      ))}
      <p style={{ margin: 0, fontWeight: 600, color: sum === 100 ? "#166534" : "#b91c1c" }}>
        Total: {sum}% {sum !== 100 && "(dapat maging 100%)"}
      </p>
    </div>
  );
}

function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [scores, setScores] = useState([]);

  const [newEventName, setNewEventName] = useState("");
  const [newEventLevel, setNewEventLevel] = useState(LEVELS[0]);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventOrder, setNewEventOrder] = useState("");
  const [newEventCriteria, setNewEventCriteria] = useState(emptyCriteria());
  const [addEventError, setAddEventError] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editEventError, setEditEventError] = useState("");

  const [eventBracketFilter, setEventBracketFilter] = useState("All");

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#2b50aa");

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("scorer");
  const [addUserError, setAddUserError] = useState("");
  const [addUserBusy, setAddUserBusy] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserName, setEditUserName] = useState("");

  const [userRoleFilter, setUserRoleFilter] = useState("All");

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, "events"), orderBy("order")),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {
        onSnapshot(collection(db, "events"), (snap) =>
          setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        );
      }
    );
    const unsubTeams = onSnapshot(
      query(collection(db, "teams"), orderBy("name")),
      (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubScores = onSnapshot(collection(db, "scores"), (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubEvents();
      unsubTeams();
      unsubUsers();
      unsubScores();
    };
  }, []);

  const eventStatusLabel = (ev) => (ev.active ? "Active" : "Inactive");

  const addEvent = async (e) => {
    e.preventDefault();
    setAddEventError("");
    if (!newEventName.trim()) return;
    if (totalWeight(newEventCriteria) !== 100) {
      setAddEventError("Ang total ng criteria weights ay dapat 100%.");
      return;
    }
    await addDoc(collection(db, "events"), {
      name: newEventName.trim(),
      level: newEventLevel,
      date: newEventDate || null,
      time: newEventTime || null,
      order: newEventOrder === "" ? 0 : Number(newEventOrder),
      criteria: newEventCriteria,
      active: false,
    });
    setNewEventName("");
    setNewEventLevel(LEVELS[0]);
    setNewEventDate("");
    setNewEventTime("");
    setNewEventOrder("");
    setNewEventCriteria(emptyCriteria());
  };

  const startEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEditEvent({
      name: ev.name,
      level: ev.level || LEVELS[0],
      date: ev.date || "",
      time: ev.time || "",
      order: ev.order ?? 0,
      criteria: (ev.criteria && ev.criteria.length === 5 ? ev.criteria : emptyCriteria()).map((c) => ({ ...c })),
    });
    setEditEventError("");
  };

  const saveEditEvent = async (id) => {
    if (!editEvent.name.trim()) return;
    if (totalWeight(editEvent.criteria) !== 100) {
      setEditEventError("Ang total ng criteria weights ay dapat 100%.");
      return;
    }
    await updateDoc(doc(db, "events", id), {
      name: editEvent.name.trim(),
      level: editEvent.level,
      date: editEvent.date || null,
      time: editEvent.time || null,
      order: Number(editEvent.order) || 0,
      criteria: editEvent.criteria,
    });
    setEditingEventId(null);
  };

  const deleteEvent = async (id) => {
    if (confirm("Delete this event?")) await deleteDoc(doc(db, "events", id));
  };

  const toggleActive = async (ev) => {
    await updateDoc(doc(db, "events", ev.id), { active: !ev.active });
  };

  const filteredEvents = useMemo(() => {
    if (eventBracketFilter === "All") return events;
    return events.filter((ev) => bracketOf(ev.level) === eventBracketFilter);
  }, [events, eventBracketFilter]);

  const judgesForEvent = (eventId) =>
    users.filter(
      (u) => (u.role === "scorer" || u.role === "admin") && (u.assignedEvents || []).includes(eventId)
    );

  const submittedJudgeIdsForEvent = (eventId) => {
    const ids = new Set();
    scores.forEach((s) => {
      if (s.eventId === eventId) ids.add(s.judgeId);
    });
    return ids;
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

  const submitAddUser = async (e) => {
    e.preventDefault();
    setAddUserError("");
    if (!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 6) {
      setAddUserError("Kumpletuhin ang Full Name, Email, at Password (min. 6 characters).");
      return;
    }
    setAddUserBusy(true);
    try {
      await createUserAsAdmin({
        fullName: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("scorer");
    } catch (err) {
      setAddUserError(
        err.code === "auth/email-already-in-use"
          ? "Ginagamit na ang email na ito."
          : "Hindi na-create ang account: " + (err.message || err.code)
      );
    } finally {
      setAddUserBusy(false);
    }
  };

  const startEditUser = (u) => {
    setEditingUserId(u.id);
    setEditUserName(u.displayName || "");
  };

  const saveEditUser = async (id) => {
    await updateDoc(doc(db, "users", id), { displayName: editUserName.trim() });
    setEditingUserId(null);
  };

  const deleteUser = async (id) => {
    if (
      confirm(
        "Tanggalin ang staff account na ito sa app? (Mawawalan sila ng access, pero para permanenteng mabura ang kanilang login, tanggalin din sila sa Firebase Console > Authentication > Users.)"
      )
    ) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const filteredUsers = useMemo(() => {
    if (userRoleFilter === "All") return users;
    return users.filter((u) => (u.role || "viewer") === userRoleFilter);
  }, [users, userRoleFilter]);

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Admin Dashboard</h1>

        <div className="card">
          <h2>Events</h2>

          <form onSubmit={addEvent}>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label>Event Name</label>
                <input
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Hiphop Dance Competition"
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label>Level</label>
                <select value={newEventLevel} onChange={(e) => setNewEventLevel(e.target.value)}>
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 150 }}>
                <label>Date</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
              </div>
              <div style={{ minWidth: 120 }}>
                <label>Time</label>
                <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} />
              </div>
              <div style={{ minWidth: 110 }}>
                <label>Order (#)</label>
                <input
                  type="number"
                  value={newEventOrder}
                  onChange={(e) => setNewEventOrder(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <CriteriaEditor criteria={newEventCriteria} setCriteria={setNewEventCriteria} />
            {addEventError && <p className="error">{addEventError}</p>}

            <button className="primary" type="submit" style={{ marginTop: "0.6rem" }}>
              Add Event
            </button>
          </form>

          <div className="filter-row">
            {["All", ...BRACKETS].map((b) => (
              <button
                key={b}
                className={"filter-chip" + (eventBracketFilter === b ? " active" : "")}
                onClick={() => setEventBracketFilter(b)}
                type="button"
              >
                {b}
              </button>
            ))}
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Judges Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const isEditing = editingEventId === ev.id;
                  const assigned = judgesForEvent(ev.id);
                  const submittedIds = submittedJudgeIdsForEvent(ev.id);
                  const submittedCount = assigned.filter((u) => submittedIds.has(u.id)).length;

                  if (isEditing) {
                    return (
                      <tr key={ev.id}>
                        <td colSpan={8}>
                          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                            <div style={{ flex: 2, minWidth: 180 }}>
                              <label>Event Name</label>
                              <input
                                value={editEvent.name}
                                onChange={(e) => setEditEvent({ ...editEvent, name: e.target.value })}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <label>Level</label>
                              <select
                                value={editEvent.level}
                                onChange={(e) => setEditEvent({ ...editEvent, level: e.target.value })}
                              >
                                {LEVELS.map((lv) => (
                                  <option key={lv} value={lv}>
                                    {lv}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div style={{ minWidth: 150 }}>
                              <label>Date</label>
                              <input
                                type="date"
                                value={editEvent.date}
                                onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })}
                              />
                            </div>
                            <div style={{ minWidth: 120 }}>
                              <label>Time</label>
                              <input
                                type="time"
                                value={editEvent.time}
                                onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })}
                              />
                            </div>
                            <div style={{ minWidth: 110 }}>
                              <label>Order (#)</label>
                              <input
                                type="number"
                                value={editEvent.order}
                                onChange={(e) => setEditEvent({ ...editEvent, order: e.target.value })}
                              />
                            </div>
                          </div>
                          <CriteriaEditor
                            criteria={editEvent.criteria}
                            setCriteria={(c) => setEditEvent({ ...editEvent, criteria: c })}
                          />
                          {editEventError && <p className="error">{editEventError}</p>}
                          <button className="link-button" onClick={() => saveEditEvent(ev.id)}>
                            Save
                          </button>{" "}
                          <button className="link-button" onClick={() => setEditingEventId(null)}>
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={ev.id}>
                      <td>{ev.order ?? "—"}</td>
                      <td>{ev.name}</td>
                      <td>{ev.level || "—"}</td>
                      <td>{ev.date || "—"}</td>
                      <td>{ev.time || "—"}</td>
                      <td>
                        <span className={"status-badge " + (ev.active ? "status-on" : "status-off")}>
                          {eventStatusLabel(ev)}
                        </span>
                      </td>
                      <td>
                        {assigned.length === 0 ? "—" : `${submittedCount}/${assigned.length}`}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="link-button" onClick={() => toggleActive(ev)}>
                          {ev.active ? "Deactivate" : "Activate"}
                        </button>{" "}
                        <button className="link-button" onClick={() => startEditEvent(ev)}>
                          Edit
                        </button>{" "}
                        <button className="link-button" onClick={() => deleteEvent(ev.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Tip: "Activate" lang ang gagawin bilang available sa judges — kahit dumating na ang date,
            kung "Inactive" pa, hindi pa makaka-score ang mga judges. Ikaw ang bahalang mag-activate kapag
            oras na ng event sa harapan ng mga judges.
          </p>
        </div>

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
          <div className="table-scroll">
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
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Staff Accounts & Roles</h2>

          <h3 style={{ marginTop: 0 }}>Add Judge / Scorer</h3>
          <form
            onSubmit={submitAddUser}
            style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end", flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Full Name</label>
              <input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="judge@email.com"
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Password</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="min 6 characters"
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <label>Role</label>
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="scorer">Scorer / Judge</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              className="primary"
              type="submit"
              disabled={addUserBusy}
              style={{ marginBottom: "0.8rem" }}
            >
              {addUserBusy ? "Adding..." : "Add User"}
            </button>
          </form>
          {addUserError && <p className="error">{addUserError}</p>}

          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Kapag may bagong self sign up sa /signup, "viewer" muna sila. I-promote
            as "scorer" tapos i-check kung anong events pwede nilang scorean.
          </p>

          <div className="filter-row">
            {["All", "viewer", "scorer", "admin"].map((r) => (
              <button
                key={r}
                className={"filter-chip" + (userRoleFilter === r ? " active" : "")}
                onClick={() => setUserRoleFilter(r)}
                type="button"
              >
                {r === "All" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {filteredUsers.map((u) => {
            const isEditing = editingUserId === u.id;
            return (
              <div key={u.id} className="card" style={{ background: "#fafbff" }}>
                {isEditing ? (
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                    <input value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
                    <button className="link-button" onClick={() => saveEditUser(u.id)}>
                      Save
                    </button>
                    <button className="link-button" onClick={() => setEditingUserId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <strong>{u.displayName || u.email}</strong> — {u.email}{" "}
                    <button className="link-button" onClick={() => startEditUser(u)}>
                      Edit name
                    </button>{" "}
                    <button className="link-button" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  </>
                )}
                <div style={{ margin: "0.6rem 0" }}>
                  <label>Role</label>
                  <select
                    value={u.role || "viewer"}
                    onChange={(e) => changeUserRole(u.id, e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="scorer">Scorer / Judge</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {(u.role === "scorer" || u.role === "admin") && (
                  <div>
                    <label>Assigned Events</label>
                    {BRACKETS.map((bracket) => {
                      const bracketEvents = events.filter((ev) => bracketOf(ev.level) === bracket);
                      if (bracketEvents.length === 0) return null;
                      return (
                        <div key={bracket} style={{ marginBottom: "0.5rem" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#555" }}>
                            {bracket}
                          </div>
                          {bracketEvents.map((ev) => (
                            <div className="checkbox-row" key={ev.id}>
                              <input
                                type="checkbox"
                                checked={(u.assignedEvents || []).includes(ev.id)}
                                onChange={() => toggleAssignedEvent(u, ev.id)}
                              />
                              <span>
                                {ev.name} {!ev.active && "(inactive)"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
