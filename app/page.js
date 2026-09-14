import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>🏆 Intramurals Tabulator</h1>
        <p>Live scoring system for school intramurals.</p>
        <p>
          <Link href="/scoreboard">
            <button className="primary">View Live Scoreboard</button>
          </Link>
        </p>
        <p>
          Staff/Scorer? <Link href="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
