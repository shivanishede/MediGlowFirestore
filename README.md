# MediGlow – Desktop App (Electron + Firestore)

A desktop billing & inventory app built with React + Electron.  
Data is stored in **Firebase Firestore** (cloud) — syncs across devices automatically.

---

## ⚙️ First-time Setup (one time only)

You need **Node.js 18+** installed. Then:

```bash
npm install
```

That's it. No backend setup needed — Firestore handles all data.

---

## 🚀 Run in Development Mode

```bash
npm run dev:electron
```

Opens the app as a real desktop window.

---

## 📦 Build a Windows Installer (.exe)

```bash
npm run dist
```

Produces a Windows NSIS installer in the `dist/` folder.  
Double-click the `.exe` to install MediGlow with a desktop shortcut.

---

## 📁 What changed from the web version

| | Web (localhost) | Desktop (Electron) |
|---|---|---|
| Window | Browser tab | Native desktop window |
| Data | Firebase Firestore | Firebase Firestore (same) |
| Auth | Firebase Auth | Firebase Auth (same) |
| Backend | Express + SQLite | Not needed |
| WhatsApp links | Open in same tab | Open in real browser |

---

## 💡 Notes

- Requires internet for Firestore sync (same as the web version)
- Your data lives in Firestore — accessible from any device
- To build `.dmg` for Mac, change `--win` to `--mac` in the `dist` script
