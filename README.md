# Practical Chinese

A small PWA for studying Chinese with your own **词典 (cídiǎn)** Notion database.
Home, study settings, **Flashcards** (spaced repetition saved to Notion), **Match the Pairs**, **Build the Sentence**, **Ask the Question**, **Dictionary** and **Progress**.

## How it works

```
phone (PWA, React)  ──►  /api/* on Vercel (keeps your Notion key secret)  ──►  Notion 词典 database
```

- `src/` — the app (screens follow the Claude Design canvas: Home, Study settings, Flashcards + loading/empty/error/sync states).
- `api/` — serverless functions:
  - `GET /api/words` — words for a round (Easy = studied, Hard = new, Medium = half/half), today's review, or all (Dictionary).
  - `POST /api/review` — saves one Flashcards answer (Box, Status, Next review, Last reviewed, counters).
  - `GET /api/sentences` — sentences from 句子 for Build the Sentence, or questions + their answers for Ask the Question.
  - `POST /api/practice` — Match/Build/Ask log practice (Times known/forgot, Last reviewed) without changing a word's box.
  - `POST /api/status` — set a word's status by hand from the Dictionary.
  - `GET /api/stats` — numbers for Today and Progress.
  - `GET /api/health` — setup check (is the token set, can it read 词典 and 句子).
- `shared/srs.ts` — the spaced-repetition rule, used by both sides:

| Box | Status   | Comes back in |
|-----|----------|---------------|
| 0   | New      | —             |
| 1   | Learning | 1 day         |
| 2   | Learning | 3 days        |
| 3   | Learning | 7 days        |
| 4   | Known    | 14 days       |
| 5   | Known    | 30 days       |

*I know it* moves a due word up one box; *Forgot* sends it back to box 1 (tomorrow). Reviewing early is logged but doesn't move the box. Only Flashcards changes the box.

Answers are saved one at a time through a queue on the phone, so nothing is lost if you go offline — they sync when the connection returns.

## Set up (once)

1. **Notion integration** — at <https://www.notion.so/my-integrations> open your integration and copy its secret.
   In Notion, open the **词典 (cídiǎn)** and **句子 (jùzi)** pages → `•••` → *Connections* → add the integration.
2. **Vercel** — sign in at <https://vercel.com> with GitHub → *Add New… → Project* → import this repository.
3. In the project's **Settings → Environment Variables** add:
   - `NOTION_TOKEN` — the integration secret
   - `APP_KEY` — any long passphrase (the app asks for it once; it keeps strangers out of your dictionary)
   - `NOTION_WORDS_DATA_SOURCE` / `NOTION_SENTENCES_DATA_SOURCE` — optional, default to your 词典 and 句子 data sources
4. Deploy. Open the URL on your phone → Share → **Add to Home Screen**.

## Develop

```bash
npm install
npm run demo     # sample words, no Notion needed
npm test         # SRS rule + API handlers against a fake Notion
npx vercel dev   # full app + API locally (needs the env vars in .env.local)
```

## Next

Bookshelf, and the improvements from the first real use.
