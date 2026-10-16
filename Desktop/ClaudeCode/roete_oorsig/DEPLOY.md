# Deploying Roete Oorsig on Render (free)

Render runs the Flask app straight from GitHub and redeploys on every `git push`.
The repository is `RandomForestRanger/ToGithub`; the app lives in the folder
`Desktop/ClaudeCode/roete_oorsig` (the repository root is the home folder).

## One-time setup (~5 minutes)

1. On https://dashboard.render.com click **New → Web Service**.
2. Choose **Git Provider → RandomForestRanger/ToGithub** and click **Connect**.
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | `roete-oorsig` (becomes `roete-oorsig.onrender.com`; pick another if taken) |
   | Language | **Python 3** |
   | Branch | `add-RandomForestRanger` (or `master` once merged) |
   | Region | **Frankfurt (EU Central)** — closest to South Africa |
   | Root Directory | `Desktop/ClaudeCode/roete_oorsig` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app --workers 1 --threads 4 --timeout 300 --bind 0.0.0.0:$PORT` |
   | Instance Type | **Free** |

4. Under **Environment Variables** add:

   | Key | Value |
   |---|---|
   | `ORS_API_KEY` | the key from your local `.env` |
   | `PYTHON_VERSION` | `3.12.8` |
   | `SECRET_KEY` | click **Generate** |

5. Click **Deploy Web Service**.  The first build takes 2–3 minutes; the log ends
   with `Your service is live`.  Open the `.onrender.com` link at the top.

## Afterwards

- **Updates**: every `git push` to the branch that touches this folder redeploys
  automatically (changes elsewhere in the repository are ignored).
- **Sleeping**: after 15 minutes without visitors the app sleeps; the next visitor
  waits about a minute while it wakes.
- **Cache**: the free tier keeps no files, so each start unpacks the seed cache
  `saad/kas.db.gz` (Wikidata region, the 20 warmed-up routes).  Those routes are
  fast; any other route is fetched live (~2 min) and forgotten when the app sleeps.
- **Refreshing the seed** (after warming up more routes locally, and at least once a
  year — seeded rows are valid for a year from when the seed was made):

  ```
  flask --app app kas-saad
  git add saad/kas.db.gz && git commit -m "Roete Oorsig: refresh seed cache" && git push
  ```

## Why these settings

- `--workers 1`: one process keeps memory well inside the free 512 MB, and keeps
  the random `SECRET_KEY` fallback consistent (it is set anyway).
- `--threads 4`: the browser's stage requests and other visitors run side by side.
- `--timeout 300`: stage 3 (municipalities) can take ~80 s on an uncached route;
  gunicorn's default 30 s would kill it.
