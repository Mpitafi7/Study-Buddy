# StudyBuddy AI

An AI-powered study companion app.

## Setup

```sh
npm install
cp .env.example .env   # then add your GEMINI_API_KEY
npm run dev
```

The Gemini API key is **only used on the server** (never sent to the browser). Set `GEMINI_API_KEY` in `.env`; the dev server and preview server proxy chat and verification through `/api/chat/stream` and `/api/verify`.

## Verify app and API

```sh
npm run verify        # build + run tests
npm run verify:api    # check API (run with dev server: npm run dev, then in another terminal)
```

The Chat page shows **API OK** when the server and Gemini key are working.

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Gemini API (via server proxy)
