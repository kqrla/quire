---
title: supabaseport
tags: [meta, setup, supabase, database]
date: 2026-04-01
summary: how to replace Zite's file-based content system with Supabase for runtime data storage
---

by default, quire.wiki reads markdown from files in `/content` at build time using Vite's `import.meta.glob`. this is fast, zero-dependency, and totally portable — but it means adding or editing a note requires a redeploy.

migrating to Supabase lets you store notes in a database, edit them at runtime through a UI or API, and avoid rebuilding on every content change.

:::warning
this is an architectural migration, not a small config change. the entire content-loading layer (`src/lib/content.ts`) needs to be rewritten. read through fully before starting.
:::

---

## what changes

| layer | current | after supabase |
|---|---|---|
| content storage | `/content/*.md` flat files | supabase postgres table |
| content loading | `import.meta.glob` at build time | `supabase.from('notes').select()` at runtime |
| updates | requires redeploy | instant via supabase dashboard or your own editor |
| auth | none (static) | optional: supabase auth for private notes |
| offline | works fully offline | requires network |
| version history | git | supabase + postgres history or custom table |

---

## step 1 — create a supabase project

1. go to [supabase.com](https://supabase.com) and create an account
2. create a new project — name it `quire-wiki` or similar
3. choose a region close to your users
4. save your **project URL** and **anon public key** from Settings → API

---

## step 2 — create the notes table

in the Supabase SQL editor, run:

```sql
create table notes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  content     text not null default '',
  tags        text[] default '{}',
  date        text,
  summary     text,
  cover       text,
  password    text,
  draft       boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- index for fast slug lookups
create index notes_slug_idx on notes (slug);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();
```

---

## step 3 — migrate your existing content

export your current markdown files to supabase. you can do this manually or with a migration script.

**manual (small gardens):** paste each note's content into the supabase table editor.

**script (larger gardens):** create a `scripts/migrate.mjs` file:

```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

function walkContent(dir, base = dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...walkContent(full, base))
    } else if (entry.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, content: raw }
  const fm = {}
  for (const line of match[1].split('
')) {
    const kv = line.match(/^(\w+):\s*(.+)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (key === 'tags') fm.tags = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim())
    else if (key === 'draft') fm.draft = value === 'true'
    else fm[key] = value.trim().replace(/^["']|["']$/g, '')
  }
  return { frontmatter: fm, content: match[2] }
}

const files = walkContent('./content')

for (const file of files) {
  const raw = readFileSync(file, 'utf-8')
  const { frontmatter: fm, content } = parseFrontmatter(raw)
  const slug = relative('./content', file)
    .replace(/\.md$/, '')
    .replace(/\/index$/, '') || 'index'

  const { error } = await supabase.from('notes').upsert({
    slug,
    title: fm.title || slug.split('/').pop().replace(/-/g, ' '),
    content,
    tags: fm.tags || [],
    date: fm.date || null,
    summary: fm.summary || null,
    cover: fm.cover || null,
    password: fm.password || null,
    draft: fm.draft || false,
  })

  if (error) console.error(`failed: ${slug}`, error.message)
  else console.log(`migrated: ${slug}`)
}
```

run with: `node scripts/migrate.mjs`

---

## step 4 — install supabase client

```bash
npm install @supabase/supabase-js
```

create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

add to `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

:::warning
never put your Supabase **service role key** in frontend code. only the anon key. row-level security handles access control.
:::

---

## step 5 — rewrite content.ts

replace the entire `src/lib/content.ts` with an async version that fetches from Supabase. this is the largest change.

```typescript
import { supabase } from './supabase'

export interface Page {
  slug: string
  title: string
  content: string
  frontmatter: {
    title?: string
    tags?: string[]
    date?: string
    summary?: string
    cover?: string
    draft?: boolean
    password?: string
  }
  wikiLinks: string[]
}

function extractWikiLinks(content: string): string[] {
  const matches = [...content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)]
  return [...new Set(matches.map(m => m[1].trim()))]
}

export async function getPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('draft', false)

  if (error) throw error
  return data.map(row => ({
    slug: row.slug,
    title: row.title,
    content: row.content,
    frontmatter: {
      title: row.title,
      tags: row.tags,
      date: row.date,
      summary: row.summary,
      cover: row.cover,
      password: row.password,
      draft: row.draft,
    },
    wikiLinks: extractWikiLinks(row.content),
  }))
}

export async function getPage(slug: string): Promise<Page | undefined> {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!data) return undefined
  return {
    slug: data.slug,
    title: data.title,
    content: data.content,
    frontmatter: {
      title: data.title,
      tags: data.tags,
      date: data.date,
      summary: data.summary,
      cover: data.cover,
      password: data.password,
      draft: data.draft,
    },
    wikiLinks: extractWikiLinks(data.content),
  }
}
```

note: all functions become **async**. every component that calls `getPages()` or `getPage()` must be updated to use `await` or React's `use()` hook, and pages will need loading states.

---

## step 6 — row-level security

in Supabase SQL editor, enable RLS and add a policy so anonymous users can read non-draft notes:

```sql
alter table notes enable row level security;

create policy "public can read published notes"
  on notes for select
  using (draft = false);
```

this means your published notes are publicly readable. draft notes are hidden without authentication.

---

## what breaks when you copy files from zite

when you download source files from Zite and try to run them outside the platform, several things are immediately broken:

**1. `src/main.tsx` is missing**
Zite generates this file at build time. it does not appear in the file explorer and cannot be downloaded. you must recreate it manually (see [[port]]).

**2. zite-specific imports fail to resolve**

```
// these packages do not exist on npm
// [zite exporter] removed zite-auth-sdk import
// [zite exporter] removed zite-endpoints-sdk // [zite exporter] removed zite-integrations-backend-sdk import
```

`npm install` will fail or skip them. any component importing them will crash at runtime.

**3. environment variables are undefined**

```
process.env.ZITE_APP_URL    // undefined outside Zite
process.env.ZITE_*          // all undefined
```

replace with `import.meta.env.VITE_*` and define them in `.env.local`.

**4. `zite.config.json` references are invalid**
this file controls platform features (auth mode, database connections, access mode). outside Zite it does nothing and can be deleted.

**5. backend endpoints have no runtime**
files in `src/api/*.ts` are Zite backend endpoints. outside of Zite there is no server to run them. they need to be converted to standalone Express/Fastify/Hono routes or Vercel/Netlify serverless functions.

**6. shadcn/ui components may be missing**
on Zite, shadcn components are injected automatically. outside Zite, you must manually install and generate each component:

```bash
npx shadcn-ui@latest add button dialog hover-card popover ...
```

check your `components.json` for the full list of components in use.

---

## supabase vs flat files — decision guide

| you want | use |
|---|---|
| edit notes without redeploying | supabase |
| zero latency on first load | flat files |
| offline capability | flat files |
| collaborative editing | supabase |
| git history on every note | flat files |
| private notes with user accounts | supabase |
| dead-simple hosting | flat files |
| programmatic note creation | supabase |

most single-person gardens are better off with flat files. supabase makes sense when you have multiple contributors, want a live editing UI, or need per-user access control.

---

see [[port]] for the general self-hosting guide, including how to handle all the incomplete-file issues when copying source code out of Zite.
