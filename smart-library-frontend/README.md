# Smart-Library-Frontend

A Vite + React (TypeScript) frontend for Smart Library. This guide mirrors the backend README and is optimized for a fresh run.

## Prerequisites

- Node.js (v18+ recommended)
- npm (comes with Node.js)
- Backend API running (see `../smart-library-backend/README.md`)
  - Default backend URL: `http://localhost:4001`

## 1. Install dependencies

```
cd Smart-Library-Platform/smart-library-frontend
npm install
```

## 2. Configure API base URL (optional)

The app uses `VITE_API_URL` for the backend base URL. If not set, it defaults to `http://localhost:4001`.

- Windows PowerShell (create `.env.local`):

```powershell
"VITE_API_URL=http://localhost:4001" | Out-File -FilePath .env.local -Encoding ascii
```

- macOS/Linux (optional reference):

```bash
echo "VITE_API_URL=http://localhost:4001" > .env.local
```

You can also define environment-specific files (e.g., `.env.production`) before building.

## 3. Start the frontend (development)

```powershell
npm run dev
```

Vite will print the local dev URL (typically `http://localhost:5173`). Ensure the backend is running and accessible at `VITE_API_URL`.

## 4. Build and preview (production-like)

```powershell
# Build static assets
npm run build

# Preview the production build locally
npm run preview
```

## 5. Test credentials (seeded by backend)

Use these accounts after the backend has been reset + seeded:

| Name          | Role   | Email             | Password |
|---------------|--------|-------------------|----------|
| Alice Nguyen  | reader | alice@example.com | alice123 |
| Bob Tran      | staff  | bob@example.com   | bob123   |
| Chi Le        | reader | chi@example.com   | chi123   |

## Notes & Troubleshooting

- API URL: If frontend requests 404/401 or CORS errors, confirm `VITE_API_URL` matches the backend URL and that the backend is up.
- Auth: Tokens are stored in `localStorage` and attached as Bearer headers. Use the app's Logout to clear.
- Swagger: Backend API docs are at `http://localhost:4001/api-docs` (default).
- Ports: Frontend (Vite) default is `5173`; Backend default is `4001`.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — build for production
- `npm run preview` — preview the production build
