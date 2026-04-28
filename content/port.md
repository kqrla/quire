---
title: self-hosting quire.wiki
tags: [meta, setup, self-host]
date: 2026-04-01
summary: how to fully extract quire.wiki from Zite and run it on your own infrastructure
---

this document covers two things: getting the source code off Zite entirely, and deploying it yourself. this is not about your `/content` folder — that's always been yours. this is about running the *entire service* — the React app, the renderer, the routing — outside of Zite's platform.

:::warning
some files imported during the Zite build contain platform-specific SDKs (`zite-auth-sdk`, `zite-endpoints-sdk`, `zite-integrations-backend-sdk`). when you copy source files out, any import referencing these packages will break immediately. see the section below on incomplete files.
:::

---

## what zite wraps

when you run quire.wiki on Zite, the platform provides:

- **hosting** — your app is served at a `*.zite.so` subdomain or custom domain
- **build pipeline** — Vite builds your app automatically on every change
- **authentication** (if enabled) — `zite-auth-sdk` handles login, sessions, tokens
- **backend endpoints** (if any) — `zite-endpoints-sdk` connects frontend to your API endpoints
- **environment variables** — secrets and platform vars like `ZITE_APP_URL` are injected at runtime
- **CDN / static delivery** — the `/dist` output is served globally

quire.wiki as currently configured uses *none* of the auth or endpoint SDKs — it is a fully static site. this makes porting straightforward compared to most Zite apps.

---

## step 1 — get the source code

use Zite's export or download feature to get the full source tree. you want every file listed in the sidebar file explorer, including:

```
src/
  App.tsx
  index.css
  components/
  lib/
  pages/
  stash/
content/
  index.md
  notes/
  journal/
  projects/
tailwind.config.ts
index.html
vite.config.ts
package.json
tsconfig.app.json
tsconfig.json
postcss.config.js
components.json
```

**do not include:**
- `zite.config.json` — Zite platform config, irrelevant outside
- `zite.lock` — Zite internal lock file
- `src/main.tsx` — Zite auto-generates this; you need to write your own (see below)

---

## step 2 — write your own main.tsx

Zite auto-generates `src/main.tsx` and you cannot edit it on the platform. outside of Zite, you need to create it yourself:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## step 3 — identify and fix incomplete files

:::warning
this is the most important step. every file that imports from a Zite-specific package will fail silently or loudly when run outside the platform.
:::

**packages that only exist inside Zite:**

| package | what it does | status in quire.wiki |
|---|---|---|
| `zite-auth-sdk` | login, user sessions, tokens | not used |
| `zite-endpoints-sdk` | call backend endpoints from frontend | not used |
| `zite-integrations-backend-sdk` | backend SDK for databases, email, etc. | not used |

**even if unused now**, grep your entire `src/` tree for these before building:

```bash
grep -r "zite-auth-sdk\|zite-endpoints-sdk\|zite-integrations-backend-sdk" src/
```

any file that imports them needs to be rewritten or removed.

**platform environment variables that won't exist outside Zite:**

```
ZITE_APP_URL        — the public URL of your app
ZITE_*              — any other secrets you set in the Zite secrets panel
```

if you have API endpoints that use `process.env.ZITE_APP_URL`, replace them with your own domain or a `.env` variable:

```bash
# .env.local
VITE_APP_URL=https://yourdomain.com
```

then in code: `import.meta.env.VITE_APP_URL` instead of `process.env.ZITE_APP_URL`.

---

## step 4 — install dependencies

```bash
npm install
```

your `package.json` lists all dependencies. they're all standard npm packages — nothing Zite-specific.

verify these are present:

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "tailwindcss": "^3",
    "lucide-react": "latest",
    "framer-motion": "latest"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "latest",
    "typescript": "^5"
  }
}
```

---

## step 5 — configure vite

your `vite.config.ts` may reference Zite plugins. a clean standalone config:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## step 6 — run locally

```bash
npm run dev
```

your garden opens at `http://localhost:5173`. the `/content` folder hot-reloads automatically via `import.meta.glob`.

---

## step 7 — build for production

```bash
npm run build
```

output goes to `/dist`. deploy this folder anywhere static files are served.

---

## deployment options

:::branch deploy to vercel (recommended)
1. push your repo to GitHub
2. connect to [vercel.com](https://vercel.com)
3. import the repo — Vite is auto-detected
4. set any environment variables in the Vercel dashboard
5. deploy — all future pushes auto-deploy
:::

:::branch deploy to github pages
1. add to `vite.config.ts`: `base: '/your-repo-name/'`
2. `npm run build`
3. push `/dist` contents to the `gh-pages` branch
4. enable GitHub Pages on that branch
:::

:::branch deploy to cloudflare pages
1. connect repo to [pages.cloudflare.com](https://pages.cloudflare.com)
2. build command: `npm run build`
3. output directory: `dist`
4. works globally with edge caching
:::

:::branch deploy as a docker container
create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t quire-wiki .
docker run -p 8080:80 quire-wiki
```
:::

---

## what is and isn't portable

| thing | portable? | notes |
|---|---|---|
| `/content/**/*.md` | ✅ fully | just files, no platform dependency |
| `src/lib/content.ts` | ✅ fully | uses `import.meta.glob` — standard Vite |
| `src/lib/markdown.tsx` | ✅ fully | pure React |
| `src/components/**` | ✅ fully | standard shadcn/ui + React |
| `src/pages/**` | ✅ fully | standard react-router-dom |
| `src/index.css` | ✅ fully | standard CSS |
| `src/main.tsx` | ⚠️ missing | auto-generated by Zite — write your own (step 2) |
| `zite.config.json` | ❌ discard | Zite platform only |
| `zite.lock` | ❌ discard | Zite internal |
| any `zite-*` imports | ❌ breaks | must remove or replace |
| `process.env.ZITE_*` | ❌ breaks | replace with `import.meta.env.VITE_*` |

---

## summary

quire.wiki ports cleanly because it has no backend, no auth, and no database — it's a Vite React app that reads static markdown files. the main friction points are:

1. `src/main.tsx` — you have to recreate it
2. any stray `zite-*` SDK imports you may add later
3. `ZITE_APP_URL` references in any endpoint code

your content folder is always 100% portable — plain markdown files that work anywhere.

see [[supabaseport]] if you want to move your notes to a database instead of flat files.
