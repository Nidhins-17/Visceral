# The Truth

A React and Vite journal connected to the Express API in `../backend`. Visitors can read published articles and send consultation messages. The owner signs in with Supabase Auth to create, edit, and delete articles and to read the private message inbox.

## Run locally

Requirements: Node.js and npm.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure:

- `VITE_API_BASE_URL=http://localhost:3001`
- `VITE_SUPABASE_URL` from the Supabase project settings
- `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase API keys page

The frontend uses only the publishable key. Never put the Supabase secret key in a `VITE_` variable.

Start the backend in another terminal (`cd ../backend`, configure its `.env`, then `npm install` and `npm run dev`), and start the frontend:

```sh
npm run dev
```

Create and preview a production build with:

```sh
npm run build
npm run preview
```

## Using the site

- Public articles load from `GET /truths`; the full article is fetched when a visitor opens it. Premium articles show their teaser and lock state.
- The contact form sends its message to `POST /contacts`. Messages are stored in Supabase and emailed to the configured owner address; the visitor's email app is not opened.
- Open `/write` and sign in with the single Supabase Auth owner account. Public sign-ups should be disabled in Supabase. The API checks the account against `ADMIN_USER_ID`; after signing in as that owner, you can publish/edit/delete articles and open the Messages inbox.
- Set `CORS_ORIGIN` on the backend to the exact frontend origin, including the Vercel production domain.

## Deploying to Vercel

Set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project environment. The Render API needs matching `CORS_ORIGIN` plus its Supabase server secret and configured owner UUID. The included `vercel.json` rewrites direct `/contact` and `/write` visits to the Vite app.
