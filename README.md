# The Truth

A dark, light-blue-accented writing journal built with React and Vite. Visitors can browse articles, write and manage posts in their browser, and contact the site owner through their email app.

## Run locally

Requirements: Node.js and npm.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and set `VITE_CONTACT_EMAIL` to the inbox that should receive contact messages. In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Then start the development server:

```sh
npm run dev
```

Create and preview a production build with:

```sh
npm run build
npm run preview
```

## Notes

- Contact messages open in the visitor's email app with the recipient and message filled in. The visitor sends the email from that app; the site does not send or store messages on a server.
- `VITE_CONTACT_EMAIL` is included in the client-side build, so it is a public contact address, not a secret.
- Posts are saved in the current browser's local storage. They are not shared between devices or visitors.
- When deploying, set `VITE_CONTACT_EMAIL` in the hosting provider's build environment. Configure the host to serve `index.html` for the `/contact` and `/write` routes.
