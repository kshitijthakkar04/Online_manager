# Knowledge Diary

A daily learning diary. You write what you **understood** about a topic, in your own words. Gemini then:

1. **Reviews it.** It scores Understanding, Accuracy, Framing & Clarity, Depth, Examples & Application and Use of Sources. It pushes back on anything wrong by quoting your words and giving the correct version.
2. **Rewrites it in your voice.** It applies every correction and matches the writing style you taught it on the *My voice* page.
3. **Saves it to your knowledge.** You can later **Ask** questions and get answers drawn only from your notes, with numbered citations that open the source note.

Built with Next.js (App Router), Tailwind v4, Supabase (Postgres) and the Gemini API. It is designed to be deployed on Vercel.

## How Ask works (no vector DB)

Search runs on Postgres full-text search inside Supabase, so you don't need Pinecone or embeddings:

- Each note has a weighted `tsvector`. Title and tags are weighted highest, then the polished note, then your raw notes. A trigger keeps it updated.
- When you ask a question, Gemini first turns it into keywords plus synonyms, and a date range when you ask something like "what did I learn this week?".
- `search_notes()` ORs those keywords together and ranks the matches. The top notes go to Gemini, which answers with `[n]` citations.

If you later want semantic search, you can add `pgvector` to the same Supabase database. `answerFromNotes` stays as it is, and only the retrieval step in `src/app/api/ask/route.ts` changes.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in the whole of [`supabase/schema.sql`](supabase/schema.sql) and run it. The script is safe to run again.
3. Under **Project Settings → API**, copy the **Project URL** and the **service_role** key.

The app only talks to Supabase from the server, using the service-role key. Row Level Security is enabled with no policies, so the public anon key can't read anything.

### 2. Gemini

Create an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). The default model is `gemini-3.1-flash-lite`. To use a different one, set `GEMINI_MODEL`.

### 3. Run locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```

Then open http://localhost:3000.

### 4. Deploy to Vercel

1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new). The framework is detected as Next.js automatically.
2. Under **Environment Variables**, add everything from `.env.example`:

   | Variable | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | optional, default `gemini-3.1-flash-lite` |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `APP_PASSWORD` | the passcode that unlocks your diary |
   | `AUTH_SECRET` | a long random string (`openssl rand -hex 32`) |

3. Deploy. **Set `APP_PASSWORD` before you deploy.** Without it the site is open to anyone who has the URL. If you change any of these variables later, redeploy.

## Using it

| Page | What it's for |
| --- | --- |
| **Today** (✎) | Write today's entry: title, your understanding and optional sources. Then click **Review**, then **Write in my voice**, then **Save**. Shortcuts: `⌘↵` to review, `⌘S` to save. Drafts autosave in your browser. |
| **Library** | All your notes, with an activity heatmap, your streak, average score and tag filters. |
| **Ask** (✦) | Ask questions about what you've learned. Answers cite your notes, and you can click a citation to open the note. |
| **My voice** (🪶) | Paste samples of your writing, then click **Analyse** to create a style profile. Gemini uses both whenever it writes a note for you. |

The notch at the top shows which page you're on. It also expands to show live status, such as *reviewing…*, *saved* or an error.

## Project layout

```
src/
  app/(app)/          pages: Today (page.tsx), library, notes/[id], ask, style
  app/api/            review, compose (streams), notes, ask, style, login/logout
  app/login/          passcode screen
  components/         notch, sidebar, composer, review panel, library, note view
  lib/gemini.ts       all prompts: review, rewrite-in-your-voice, style analysis, search planning, answering
  lib/supabase.ts     data access + keyword search RPC
  proxy.ts            passcode lock (Next 16 "proxy", formerly middleware)
supabase/schema.sql   tables, search trigger, search_notes() function
```
