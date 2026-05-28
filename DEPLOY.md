# Deploying to Vercel (Frontend)

Quick steps

- Project Root: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Recommended Project Name: `hamlearning-lms` (lowercase, alphanumeric, `-`, `_`, `.`)

Environment variables (set these in Vercel dashboard or `vercel env add`):

- `VITE_API_URL` — e.g. `https://<your-backend-url>` (no trailing slash)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend / Supabase (required for full functionality):

- `SUPABASE_URL` — your Supabase project URL (e.g. https://abcd.supabase.co)
- `SUPABASE_ANON_KEY` — anon/public API key
- `SUPABASE_SERVICE_ROLE_KEY` — (recommended) service role key for server-side storage operations (keep secret)
- `SUPABASE_STORAGE_BUCKET` — the bucket name to store uploaded files (create in Supabase Storage UI; default: `uploads`)
- `JWT_SECRET` — secret key used by backend JWT (optional, but recommended to set)
- `EMAIL_USER` and `EMAIL_PASSWORD` — if you want password-reset emails to function (see `backend/.env.example`)

Important notes

- This project is a single-page app (SPA). The repository includes `frontend/vercel.json` which rewrites all paths to `/index.html` so client-side routes (like `/signup`) work correctly on Vercel.
- Do NOT commit secrets like `.env` files. Use Vercel env vars for production secrets.
- Ensure Supabase CORS allows requests from your Vercel domain.
- File uploads are stored in Supabase Storage. Create a bucket (default `uploads`) in the Supabase dashboard and set `SUPABASE_STORAGE_BUCKET` in Vercel to that name.
- For secure server-side operations (delete/upload), set `SUPABASE_SERVICE_ROLE_KEY` in Vercel — treat this as a secret and do NOT expose it to frontend code.

CLI deploy example

```bash
cd frontend
npx vercel --prod --name hamlearning-lms
```

If you want, I can add a GitHub integration in the Vercel dashboard so every push to `main` deploys automatically.
