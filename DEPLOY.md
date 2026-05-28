# Deploying to Vercel (Frontend)

Quick steps

- Project Root: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Recommended Project Name: `hamlearning-lms` (lowercase, alphanumeric, `-`, `_`, `.`)

Environment variables (set these in Vercel dashboard or `vercel env add`):

- `VITE_API_URL` — e.g. `https://<your-supabase-project>.supabase.co` or your backend functions URL (no trailing slash)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Important notes

- This project is a single-page app (SPA). The repository includes `frontend/vercel.json` which rewrites all paths to `/index.html` so client-side routes (like `/signup`) work correctly on Vercel.
- Do NOT commit secrets like `.env` files. Use Vercel env vars for production secrets.
- Ensure Supabase CORS allows requests from your Vercel domain.

CLI deploy example

```bash
cd frontend
npx vercel --prod --name hamlearning-lms
```

If you want, I can add a GitHub integration in the Vercel dashboard so every push to `main` deploys automatically.
