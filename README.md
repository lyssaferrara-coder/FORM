# FORM — deployable web MVP

A real, deployable **starter application**, not a finished commercial bodybuilding platform. It supports Supabase email sign-in, saved profiles, user-entered meal/workout/check-in logs, and a Gemini-powered coach with approval of proposed plan *ideas*. It does **not** yet generate validated 7-day meal plans, verified ingredient nutrition, advanced exercise programming, subscriptions, or automatic edits to existing logs. Do not market it as a fully finished coaching product.

## Step 1 — Supabase database

1. Open your Supabase project > **SQL Editor** > **New query**.
2. Open `supabase/schema.sql` in this package, copy its contents into SQL Editor, and click **Run**.
3. Open **Project Settings** > **API Keys** (the menu label may vary). Copy your **Project URL** and **publishable key** (or legacy `anon` key). **Never use the service_role or secret key in the browser.**
4. Open `config.js` in a plain text editor and replace the two `PASTE_...` values with your project URL and publishable/anon key. These two values are intended to be public; they are protected by RLS policies.
5. In Supabase **Authentication > Providers > Email**, check whether email confirmation is enabled. If enabled, new users must confirm their email. In **Authentication > URL Configuration**, add your eventual `https://<project>.pages.dev` domain as a redirect URL; set the Site URL appropriately. You can do this after Cloudflare assigns your URL.

## Step 2 — Upload to GitHub

1. Open your private `form-ai-coach` repository on GitHub.
2. Choose **Add file > Upload files** and upload the **contents** of this folder, preserving the folder structure: `functions/api/coach.js` and `supabase/schema.sql` must be in their respective directories. GitHub web upload may not preserve empty folders; these folders have files.
3. Commit the upload to the `main` branch.

**Mac tip:** The simplest way to preserve folders is to unzip the package, select all files/folders inside `FORM-deployable`, and drag them together into GitHub's upload area. Verify the paths in GitHub afterward.

## Step 3 — Cloudflare Pages

1. Open Cloudflare Dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**. Select `form-ai-coach`.
2. Framework preset: **None**. Production branch: `main`. Build command: **leave blank**. Build output directory: **`/`** (repository root; some interfaces accept `.`). There is no build step.
3. Before deploying, or under Pages project **Settings > Variables and Secrets**, set these environment variables for **Production**:
   - `GEMINI_API_KEY` = your private Google AI Studio API key. Set as **Secret / Encrypt**.
   - `SUPABASE_URL` = the same Supabase Project URL used in `config.js`.
   - `SUPABASE_ANON_KEY` = the Supabase publishable/anon key used in `config.js`.
   - Optional `GEMINI_MODEL` = `gemini-2.5-flash` (the code uses this by default).
4. If you add or change secrets after the initial deployment, **redeploy** from Cloudflare Deployments so the functions see the new values.
5. Visit your assigned `https://...pages.dev` URL. Sign up, confirm email if prompted, sign in, complete your profile, and ask the AI Coach a question.

**IMPORTANT:** The Gemini API key belongs ONLY in Cloudflare secrets, not in `config.js`, the browser, or GitHub. Google AI Studio free-tier eligibility, model availability, and quotas can change. If the Gemini API responds with a model error, set `GEMINI_MODEL` to a currently available free-tier model and redeploy.

## Step 4 — Quick acceptance test

- Sign up and sign in; confirm your email if requested.
- Save your profile and refresh. It should persist.
- Log a meal, workout, and check-in; refresh and confirm each is still there.
- Ask the AI Coach a question. If you see `Server secrets are not configured`, revisit Cloudflare variables and redeploy.
- Ask the AI to suggest changing a workout. If a proposal appears, click **Approve & save idea** and verify it appears in Training. Approval saves a *new idea record*, not a modification to existing workouts.
- For multi-user security, test with two different accounts and verify neither can read the other's records. RLS is configured in `schema.sql`.

## Notes

- No payment is required by this code; hosting, database and Gemini free-tier usage have limits and may require account verification or billing depending on provider policies.
- Authentication is handled by Supabase; database rows use row-level security. The AI endpoint verifies the Supabase access token on each request.
- The AI receives profile and recent logs to personalize replies. **Do not upload sensitive medical information without reviewing Google and Supabase privacy/data-handling policies.**
- API responses and error states depend on external services. Live API connectivity cannot be verified without your credentials.
- 
