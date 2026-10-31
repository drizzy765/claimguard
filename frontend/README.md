# ClaimGuard frontend

React + Vite dashboard: upload a bill → live agent steps → audit report.

```bash
npm install
npm run dev
```

The frontend defaults to the deployed API at `https://claimguard-sfxx.onrender.com`.
Set `VITE_API_URL` (see `.env.development`) to override the API host. Paste the
backend's `FACTORY_MASTER_KEY` into the UI as `X-Factory-API-Key` when auditing.

## Deploy to Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Select **Vite** as the framework. Use `npm run build` for the build command
   and `dist` as the output directory.
3. Add the environment variable `VITE_API_URL` with the value
   `https://claimguard-sfxx.onrender.com`, then deploy.
4. Open the deployed site. The API host should already be filled in; enter the
   backend's `FACTORY_MASTER_KEY` in the `X-Factory-API-Key` field before
   submitting a bill.

`VITE_*` values are included in the public frontend bundle. Do not put
`FACTORY_MASTER_KEY` in a Vercel `VITE_*` variable; the app asks for it in the
browser instead.
