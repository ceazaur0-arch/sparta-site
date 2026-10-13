# SPARTA site

## Deploy (all online)
1. Create a GitHub repo and upload everything in this folder (drag and drop works).
2. On vercel.com choose **Add New → Project**, pick the repo. Framework: Vite.
3. In Vercel **Settings → Environment Variables** add `VITE_RPC_URL` and `VITE_API_URL` (see `.env.example`). Redeploy.

## Before it can trade
Open `src/idl.json` and replace `{}` with your program IDL (`target/idl/safe_launch.json`, created by `anchor build`).
The program id is in `src/config.js`. The IDL needs Anchor 0.30 or newer.

## What your backend must return
- `GET /launches` → `[{ "mint", "name", "symbol", "progress" }]` (progress 0–100)
- `GET /launches/:mint/candles?range=1H|24H|7D` → `[{ "t": unixSeconds, "close": priceInSol }]`
- `GET /leaderboard?type=traders|launches|creators` → `[{ "id", "label"?, "volumeSol", "trades" }]` sorted best first

Turn on CORS for your site's domain on the backend.

## Included
Claiming locked tokens (`claim_locked`), the bond (`claim_bond`) and creator fees (`claim_creator_fees`) are in the Claims panel. Pause, withdraw fees, flag/unflag wallet and slash bond are in the Control Room, shown only to the admin wallet.

## Not included yet
Updating the config (fees, limits, lock times) and the admin handover (propose/accept admin).
