# 🏆 Intramurals Tabulator

Role-based, real-time scoring system para sa school intramurals.
Built with **Next.js** + **Firebase (Auth + Firestore)**, deploy-ready sa **Vercel**.

## Roles

| Role   | Kaya gawin |
|--------|------------|
| `admin`  | Mag-manage ng events, teams, at mag-assign ng roles/events sa staff |
| `scorer` | Mag-input ng score, pero lang sa events na naka-assign sa kanya |
| `viewer` | Default role ng bagong sign up — pwede lang tumingin sa scoreboard |

Public (walang login) na makikita: `/scoreboard` — live leaderboard, real-time.

## 1. Setup ng Firebase Project

1. Pumunta sa [Firebase Console](https://console.firebase.google.com) → **Add Project**.
2. Sa Project Settings → **Your apps** → i-add ang **Web app** (</> icon). Kopyahin ang config values.
3. I-enable ang **Authentication** → Sign-in method → **Email/Password**.
4. I-enable ang **Firestore Database** → Create database → Start in **production mode**.
5. Sa Firestore → **Rules** tab, i-paste ang content ng `firestore.rules` (kasama dito sa project) → Publish.

## 2. Gawin ang unang Admin account

Dahil default na "viewer" ang bagong sign up, kailangan mong manually i-set ang unang
admin sa Firestore Console:

1. Mag-**Sign Up** muna gamit ang app (`/signup`) — normal na account lang.
2. Pumunta sa **Firestore Console** → `users` collection → hanapin ang document mo
   (base sa UID — makikita mo sa Authentication tab kung alin UID mo).
3. I-edit ang field na `role` → palitan mula `"viewer"` papuntang `"admin"`.
4. Mag-logout at login ulit sa app — dapat makapasok ka na sa `/admin`.

Mula dito, ikaw na ang gagamit ng Admin page para i-promote ang ibang staff bilang
`scorer` at i-assign sa kanila ang mga events.

## 3. Local Development

```bash
npm install
cp .env.local.example .env.local
# i-fill up ang .env.local gamit ang Firebase config mo (step 1)
npm run dev
```

Buksan ang http://localhost:3000

## 4. Deploy sa Vercel (libre)

1. I-push ang project na ito sa isang **GitHub repository**.
2. Pumunta sa [vercel.com](https://vercel.com) → **New Project** → i-import ang repo.
3. Sa **Environment Variables** section ng Vercel, ilagay lahat ng variables na
   nasa `.env.local.example` (kasama ang totoong values mula sa Firebase config mo).
4. Click **Deploy**. Automatic na mag-build at mabibigyan ka ng live URL
   (halimbawa `intramurals-tabulator.vercel.app`).
5. Sa susunod na push sa GitHub, automatic na mag re-deploy — walang downtime,
   walang cold-start delay dahil serverless + CDN ang Vercel.

## 5. Paggamit sa Araw ng Intramurals

1. Admin: i-setup muna ang mga **Events** (halimbawa "100m Dash", "Basketball Finals")
   at **Teams/Houses** sa `/admin`.
2. I-assign ang mga scorer/judge sa kani-kanilang events (checkbox sa Admin page).
3. Scorer: pumunta sa `/scorer`, pumili ng event + team, ilagay ang points, submit.
4. I-project or ipa-open sa lahat ang `/scoreboard` — automatic itong mag-a-update
   real-time sa tuwing may bagong score na isusubmit, walang refresh na kailangan.

## Firestore Data Structure

```
/events/{eventId}   → { name, category }
/teams/{teamId}      → { name, color }
/users/{uid}         → { displayName, email, role, assignedEvents: [eventId,...] }
/scores/{scoreId}    → { eventId, teamId, points, enteredBy, timestamp }
```

## Notes

- Ang score corrections (edit/delete) ay admin-only sa Firestore rules — pinoprotektahan
  ito para hindi mabago ng regular scorer ang na-submit na score.
- Firestore free tier (Spark plan) ay sapat na para sa karamihan ng school intramurals
  (50K reads/day, 20K writes/day) — walang downtime, walang spin-down.
