# WellAbroad — Frontend

**Healthcare, wherever life takes you.**

WellAbroad helps travellers, expats and students explain their symptoms, understand medical documents and find the right emergency numbers when they need care in a country where they don't speak the language. This repository is the web frontend.

> WellAbroad is a medical communication aid, **not** a diagnostic service.

## Features

- **Symptom intake** (`/symptoms`): a short guided consultation driven by the backend API. The person picks a country, answers adaptive questions, and gets a bilingual summary (English plus the local language) to show a doctor or pharmacist. Red flags raised by the API show an urgent alert with a tap-to-call button.
- **Document explainer** (`/documents`): upload a photo or PDF of a prescription, lab report or consultation note, get a translation and a plain-language explanation, then ask follow-up questions in a chat.
- **Emergency numbers**: per-country panel for Pakistan, the United States, the United Kingdom, Germany and France, with a "See more info" section for warning signs and other useful numbers.
- **Five languages**: English, French, German, Spanish and Urdu (right-to-left).
- **Print or save as PDF**, copy to clipboard, and mobile-first layouts.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) with TypeScript |
| Styling | Tailwind CSS v4 |
| Components | [shadcn/ui](https://ui.shadcn.com) (Base UI variant) |
| Internationalisation | [next-intl](https://next-intl.dev), cookie-based locale, no URL prefix |
| Notifications | [sonner](https://sonner.emilkowal.ski) toasts |
| Icons | [lucide-react](https://lucide.dev) |
| Fonts | Idiqlat (headings), Inter (body), Noto Naskh Arabic (Urdu) via `next/font` |

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm (or pnpm / yarn / bun)
- A running WellAbroad backend (see [Backend](#backend))

### Install and run

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local`:

```bash
# Base URL of the WellAbroad API. It is only used by the route handlers in app/api,
# so it is never exposed to the browser.
WELLABROAD_API_URL=https://well-abroad.vercel.app
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
app/
  layout.tsx            Root layout: fonts, <html lang dir>, navbar, footer, toaster
  page.tsx              Landing page
  symptoms/             Symptom intake page
  documents/            Document explainer page
  not-found.tsx         Themed 404
  api/                  Route handlers that proxy the backend (session, consult, docs)
  actions/              Server actions (language switch)
components/
  landing-page-section/ Hero, Problem, HowItWorks, UseCases, Privacy, FinalCTA, CTA buttons
  ui/                   shadcn/ui components
  Navbar.tsx  Footer.tsx  LanguageSwitcher.tsx  ServiceSection.tsx
  SymptomsExperience.tsx  DocumentTranslator.tsx
i18n/
  config.ts             Locale list, display names, RTL list
  request.ts            Resolves the locale per request and loads messages
messages/
  en.json  fr.json  de.json  es.json  ur.json
lib/
  consult.ts            Client for the consultation API
  translate-document.ts Client for the document API
  symptoms-data.ts      Countries, phone numbers, source links (not translated text)
  utils.ts              cn() helper and the Idiqlat font
public/                 background.svg, card-bg.svg, icon.svg
```

## Internationalisation

- The locale is stored in the `NEXT_LOCALE` cookie. On a first visit it falls back to the browser language, then to English. There are no `/fr` or `/de` URL prefixes, so routes are identical in every language.
- All user-facing text lives in `messages/<locale>.json`. Server components use `getTranslations`, client components use `useTranslations`.
- Line breaks inside headings are written as `\n` in the messages and rendered with `whitespace-pre-line`.
- Urdu sets `<html dir="rtl">`. Use logical Tailwind utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `border-s`) rather than left/right ones, and add `rtl:rotate-180` to directional icons.
- Idiqlat and Inter have no Urdu glyphs, so Urdu text switches to Noto Naskh Arabic through a rule in `globals.css`.

### Adding a language

1. Add the code to `locales` and `LOCALE_NAMES` in `i18n/config.ts` (and to `RTL_LOCALES` if it is right-to-left).
2. Copy `messages/en.json` to `messages/<code>.json` and translate it. Keep every key and every placeholder such as `{number}`.
3. Add the language to `LANG_NAME` and `Lang` in `lib/symptoms-data.ts`, to `LANG_EN` in `lib/consult.ts`, and to `TARGET_LANGS` in `lib/translate-document.ts`.
4. Check that the backend accepts the new language name.

## Design conventions

Headings use Idiqlat and everything else uses Inter.

| Element | Mobile | Desktop |
| --- | --- | --- |
| Hero title (H1) | 40 px | 64 px |
| Section title (H2) | 30 px | 40 px |
| Secondary title (H3) | 24 px | 28 px |
| Descriptive subtitle | 18 px | 20 px |
| Body | 16 px | 16 px |
| Card text | 14 px | 15 px |
| Captions | 12 px | 14 px |
| Buttons | 15 px | 16 px |

Gradient backgrounds are SVG assets in `public/`. Emergency UI uses the red palette, everything else uses the mint and black theme from the Figma file.

## Backend

The browser never talks to the backend directly. Route handlers in `app/api` forward requests to `WELLABROAD_API_URL`.

| Purpose | Endpoint |
| --- | --- |
| Create a session | `POST /session` |
| Start and answer the consultation | `POST /consult/{sid}/start`, `POST /consult/{sid}/answer` |
| Get the bilingual summary | `GET /consult/{sid}/summary` |
| Upload a document | `POST /docs` |
| Ask follow-up questions | `POST /docs/{doc_id}/chat` |

Session language and country fields are sent as English names (for example `"French"`, `"Germany"`). See `COUNTRY_EN` and `LANG_EN` in `lib/consult.ts`.

## Safety, privacy and content

- **Emergency numbers** are kept in `lib/symptoms-data.ts` with an official source link for each country. Re-check them before each release.
- **Translations** (all languages other than English) should be reviewed by native speakers, and medical wording by a qualified translator, before real-world use.
- **Privacy copy** (the upload note and the homepage privacy section) must match what the backend actually does with uploads. Update the `documents.upload.privacy` message and the landing-page copy whenever retention behaviour changes.
- The app gives translation and explanation only. It never diagnoses, and the result screens say so.

## Deployment

Any Next.js host works. On Vercel, set `WELLABROAD_API_URL` in the project settings. Note that request bodies sent through Vercel Functions are limited to about 4.5 MB, so if uploads up to 10 MB are needed, lower `MAX_MB` in `lib/translate-document.ts` or send uploads to the backend directly.

## Team

Fakhir Khan, Abdul Moazzim, Asiya Sohail and Ahlam Afrass.