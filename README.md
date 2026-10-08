# Practical Chinese

A small PWA for studying Chinese with your own **词典 (cídiǎn)** Notion database.
First release: **Flashcards** end to end (home, study settings, rounds, spaced repetition saved to Notion).

## How it works

```
phone (PWA, React)  ──►  /api/* on Vercel (keeps your Notion key secret)  ──►  Notion 词典 database
```

- `src/` — the app (screens follow the Claude Design canvas: Home, Study settings, Flashcards + loading/empty/error/sync states).
- `api/` — three serverless functions:
  - `GET /api/words` — picks words for a round (Easy = studied, Hard = new, Medium = half/half) or today's review.
  - `POST /api/review` — saves one Flashcards answer (Box, Status, Next review, Last reviewed, counters).
  - `GET /api/stats` — numbers for the Today card.
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
   In Notion, open the **词典 (cídiǎn)** database → `•••` → *Connections* → add the integration.
2. **Vercel** — sign in at <https://vercel.com> with GitHub → *Add New… → Project* → import this repository.
3. In the project's **Settings → Environment Variables** add:
   - `NOTION_TOKEN` — the integration secret
   - `APP_KEY` — any long passphrase (the app asks for it once; it keeps strangers out of your dictionary)
   - `NOTION_WORDS_DATA_SOURCE` — optional, defaults to `3de10ad0-4071-8097-b653-000bbec9ec4a`
4. Deploy. Open the URL on your phone → Share → **Add to Home Screen**.

## Develop

```bash
npm install
npm run demo     # sample words, no Notion needed
npm test         # SRS rule + API handlers against a fake Notion
npx vercel dev   # full app + API locally (needs the env vars in .env.local)
```

## Next

Dictionary and Progress tabs, then Match the Pairs, Build the Sentence and Ask the Question (they log practice but don't change a word's box), then Bookshelf.
