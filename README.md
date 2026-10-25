# Vault

A personal vault organized into modules (Finance, Bills, Subscriptions, Vehicles, Documents, Health, …), with all data stored as JSON in a folder of your own Google Drive. There is no backend: the app runs in the browser and talks directly to the Drive API.

Live at <https://vault.gadfaria.com>.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui (layout based on the `dashboard-01` block), charts with Recharts
- Google Identity Services (sign-in) + Drive API v3 (storage), `drive.file` scope

## Modules

Modules are fixed and defined in code. Currently:

- **Início** — the landing page. Greets you, sums up net worth, fixed monthly spending (bills + subscriptions) and what's left to pay this month, lists what needs attention across every module (overdue bills, expired or expiring documents, insurance to renew, upcoming follow-ups, stale balances) and an agenda of the next 30 days.
- **Finance** — accounts by institution (bank, brokerage, crypto…), each with a history of dated balances. Net worth is the sum of every account's latest balance; the chart shows how it evolved over time. An "Investimentos" tab tracks each application (CDB, LCI, LCA, Tesouro…) with amount, rate, dates and maturity, warns before it matures and computes the return (total and annualized) on redemption. Investments are a detail of the balances and never add to net worth.
- **Bills** — monthly bills with varying amounts (rent, condo, electricity, water, gas, credit card statement, taxes…): due day, payment method and an estimate per bill, then each month's real amount, payment date and boleto/statement file. A month selector shows what's paid, pending or overdue, and each bill has a 12-month chart and average.
- **Subscriptions** — recurring charges (streaming, internet, insurance, gym, utilities…) with amount, billing cycle (monthly, quarterly, semiannual, yearly), first charge date and payment method. Shows the next charge of each one, monthly and yearly totals, a breakdown by category, and keeps cancelled ones for history.
- **Vehicles** — vehicle registry (plate, renavam, chassis…) and maintenance history: services, repairs and part replacements, with odometer, workshop, labor, parts and an optional invoice (nota fiscal) file. The current odometer is the highest reading recorded, from a service or a standalone reading. Each vehicle also keeps its insurance policies (insurer, policy number, period, premium and installments, deductible, coverages, 24h assistance phone, PDF), with a renewal reminder two months before the end and past policies kept as history.
- **Documents** — ID cards, driver's license, passport, certificates, insurance… per person, with number, issuer, issue and expiry dates, and photos/PDFs stored in the Drive `attachments/` folder. Expired documents and those expiring within 90 days are highlighted.
- **Health** — per person: an emergency profile (blood type, allergies, conditions, health insurance, emergency contact), medications in use with dosage and schedule, and a history of appointments, exams, vaccines and procedures with attached results and follow-up / next-dose dates.

To add a module:

1. Create `src/modules/<id>/` with an `index.ts` exporting a `VaultModule` (`id`, `name`, `icon`, `Screen`).
2. Register it in `src/modules/index.ts`. It shows up in the sidebar and at `#/<id>`; sub-routes (`#/<id>/...`) reach the screen through the `path` prop.
3. In the screen, call `useCollection('<id>', EMPTY)` to read and write `data/<id>.json`. `EMPTY` defines the module's lists (e.g. `{ accounts: [], balances: [] }`); lists added later need no migration. For files, `useAttachments('<id>')` uploads to and trashes from `attachments/`, and `<AttachmentGrid>` / `<AttachmentPicker>` render them.

**Search** — ⌘K / Ctrl+K (or "Buscar" in the sidebar, the magnifier in the header on phones) searches every module at once: documents (showing their number), accounts, investments, bills, subscriptions, vehicles and their services and insurance (plate, chassis, policy number, part names), and health records. Matching ignores case and accents, and every typed word must match.

Code, file names, routes and stored values are in English; UI text is in Brazilian Portuguese.

## Drive layout

```
db-vault/
  data/
    finance.json    ← one file per module
    bills.json
    subscriptions.json
    vehicles.json
    documents.json
    health.json
  attachments/      ← uploaded files (images, PDFs), tagged with the owning module

backup-db-vault/
  2026-10-24 14h30/ ← one folder per backup
    finance.json
    …
```

Every file is tagged with `appProperties.vault` (`root`, `data`, `attachments`, `collection`), so the app finds them by query rather than by name: renaming or moving the folder doesn't break anything. With the `drive.file` scope the app only sees files it created itself.

## Backup

The **Backup** item at the bottom of the sidebar:

- **Fazer backup no Drive** copies every module's JSON file (server-side, nothing is downloaded) into a new `backup-db-vault/<date time>/` folder at the root of your Drive. Attachments aren't copied: the app never overwrites them, it only moves removed ones to the trash.
- **Baixar cópia (.json)** downloads a single JSON file with every module's data, for an offline copy that doesn't depend on your Google account.
- **Restore**, from any backup in the list or from a downloaded `.json`, replaces the data of the modules present in the backup (other modules are left untouched). A restore overwrites instead of merging, since merging keeps the newest version of each item and an older backup would never win. Before restoring, the app automatically backs up the current state, so a restore can always be undone. Records that point to attachments removed after the backup may need those files restored from the Drive trash.

Removing a file from a record moves it to the Drive trash (recoverable for 30 days); nothing is deleted outright.

Every write is **read → merge → write**: each item has an `id`, `updatedAt` and `deleted` flag, and the most recent `updatedAt` wins. Editing from two devices never overwrites the other's changes. Money is stored in cents (integers).

## Code

```
src/
  auth/            Google sign-in (1h access token), session context
  domain/          base types (Syncable) and merge
  storage/         DriveClient (REST), Vault (Drive layout), VaultProvider, useCollection
  modules/         one folder per module + registry (index.ts)
  components/      dashboard layout (sidebar, header) and shadcn components in ui/
  lib/             shared helpers (formatting money, dates, km)
  screens/         sign-in screen
```

## Google Cloud setup (once)

1. Go to <https://console.cloud.google.com/> and create a project (e.g. `vault`).
2. **APIs & Services → Library** → enable the **Google Drive API**.
3. **Google Auth Platform → Get started**: app name, support email, audience **External**, contact email.
4. **Audience → Test users**: add the Google accounts allowed to sign in.
   - The app stays in **Testing** mode, so Google itself blocks any account that isn't on this list.
   - Publishing to production would let any Google account sign in (each one only sees its own Drive). It also requires a home page and privacy policy on a verified domain.
5. **Clients → Create client** → type **Web application**:
   - **Authorized JavaScript origins**: `http://localhost:5180` and the production URL.
   - **Authorized redirect URIs**: the same URLs with a trailing slash (`http://localhost:5180/`, `https://<your-domain>/`), used by the installed app's sign-in. The client secret is not used.
6. Copy the **Client ID** into `.env.local`:

   ```
   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ```

The Client ID is public by design (it ships in the browser bundle); it grants nothing on its own.

## Running locally

```bash
npm install
npm run dev
```

The dev server runs on port 5180 (fixed, since it must match the OAuth origins).

## Installable app (PWA)

On the phone, open the site and use **Compartilhar → Adicionar à Tela de Início** (iPhone, Safari) or **⋮ → Instalar app** (Android, Chrome). It opens full screen like an app.

- **Offline app shell:** `public/sw.js` caches the page, bundles, fonts and icons, so the app opens without internet (pages network-first, hashed assets cache-first, old bundles pruned). Drive data is never cached: it needs a connection, and a banner says so when offline.
- **Sign-in in the installed app** uses a full-page redirect to Google instead of the popup (unreliable in standalone mode, especially on iOS). The OAuth client needs `<origin>/` as an **Authorized redirect URI** (e.g. `https://vault.gadfaria.com/` and `http://localhost:5180/`). The `state` parameter is checked on return and the token is removed from the address bar.
- The service worker only registers in production builds; test it with `npm run build && npm run preview`.

## Deploy

Static site (`npm run build` → `dist/`), deployed on Vercel. Set `VITE_GOOGLE_CLIENT_ID` as a **Config** (non-secret) environment variable and redeploy: Vite inlines it at build time. Add the production URL to the OAuth client's authorized origins.

See [CHANGELOG.md](CHANGELOG.md) for release history.
