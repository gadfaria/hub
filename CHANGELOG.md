# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- App icon (white vault on black), favicon and a web app manifest.
- Installable PWA: standalone display, iOS meta tags and a hand-written service worker that keeps the app shell (page, bundles, fonts, icons) available offline. Drive data is never cached; an offline banner explains why data doesn't load.
- Redirect sign-in for the installed app (the Google popup is unreliable in standalone mode): full-page OAuth implicit flow with `state` verification, token removed from the URL, previous route restored, errors shown on the sign-in screen.
- Global search (⌘K / Ctrl+K, a "Buscar" button in the sidebar and a header button on phones) across every module: documents with their number, accounts, investments, bills, subscriptions, vehicles, services (including part names), insurance policies and health records. Accent- and case-insensitive, all words must match; picking a document opens it directly (`#/documents/<id>`).
- Investments inside Finance: applications (CDB, LCI, LCA, Tesouro, funds, stocks, crypto…) with institution, amount, rate, investment date and maturity; "Investimentos" and "Resgatados" tabs; a summary of the active amount, what matures within 30 days and the realized return; and a redemption dialog that shows the return in money, for the period and annualized. They don't add to net worth, since balances already include them.
- Investment maturities on the Início page: in the agenda within 30 days, and in "Precisa de atenção" within a week or once matured without a redemption.
- **Início** landing page: greeting, net worth, fixed monthly spending, amount left to pay this month, a "Precisa de atenção" list gathered from every module (overdue and soon-due bills, expired or expiring documents, insurance to renew, health follow-ups within a week, balances not updated for 30 days) and a 30-day agenda including subscription charges. Each item links to its module.
- **Bills** module for monthly bills with varying amounts: name, category, due day (clamped to short months), payment method, estimate, first/last month and notes. Each month gets an entry with the real amount, due date, payment date, notes and attached boleto/statement.
- Month view with a month selector, totals (month, paid, to pay, next due), a paid / pending / overdue status per bill, "Marcar como paga", undo, and a per-bill history dialog with a 12-month bar chart, average and highest amount. Bills can be ended (kept as history) or deleted.
- Car insurance inside each vehicle: insurer, policy number, broker, coverage period, premium and installments, deductible, coverages, 24h assistance phone (tap to call), notes and attached files. A renewal reminder shows two months before the end, "Renovar" prefills the next policy, and past policies stay listed as history.
- Backup: a sidebar entry opens a dialog that copies every collection file into `backup-db-vault/<YYYY-MM-DD HHhMM>/` on Drive (server-side copy), lists recent backups with links, and downloads a single JSON export of all data.
- Restore from a Drive backup or a downloaded `.json` export. It overwrites the modules present in the backup, takes an automatic backup of the current state first, and reloads the app.
- **Subscriptions** module: recurring charges with category, amount, billing cycle (monthly, quarterly, semiannual, yearly), first charge date, payment method, management link and notes. The next charge is computed from the first charge date (month-end dates clamp to shorter months).
- Subscription summary: monthly and yearly totals, next charge, charges due in the next 30 days, spending by category and an upcoming-charges list. Cancelled subscriptions leave the totals but stay in a "Canceladas" tab and can be reactivated.
- **Health** module, organized by person: emergency profile (birth date, blood type, allergies, conditions, health insurance with card number, emergency contact), medications in use (dosage, frequency, start/end, "stop today"), and a history of appointments, exams, vaccines and procedures with provider, specialty, cost, notes, attached files and a follow-up / next-dose date.
- Health summary cards: appointments and exams this year, next scheduled follow-up and medications in use.
- **Documents** module: personal documents (ID, CPF, driver's license, passport, voter ID, certificates, insurance, other) per person, with number, issuer, issue and expiry dates, notes and attached files.
- Expiry tracking: expired documents and those expiring within 90 days are flagged in the table and summary cards.
- Owner tabs to filter documents by person, and one-click copy of the document number.
- File attachments stored in the Drive `attachments/` folder: upload (images and PDFs, up to 20 MB), thumbnails, open in a new tab, and removal to the Drive trash. Reusable by any module through `useAttachments`, `AttachmentGrid` and `AttachmentPicker`.
- This changelog.

### Removed
- Unused Vite template assets (`icons.svg`, Vite favicon).

### Changed
- Subscriptions no longer offer the "Casa (luz, água, gás)" category; those bills belong in Contas. Existing entries with it show as "Outros".
- README rewritten in English, with the Google Cloud setup matching the current configuration (Testing mode with test users).
- Shared `Field` form component moved to `src/components/form-field.tsx`.
- Expiry status and badge shared in `src/lib/expiry.ts` and `src/components/expiry-badge.tsx`; pending-upload file list shared as `PendingFileList`.

## [0.2.0] - 2026-10-24

### Added
- **Vehicles** module: vehicle registry (brand, model, year, plate, color, renavam, chassis, notes) and a page per vehicle at `#/vehicles/<id>`.
- Maintenance history per vehicle: date, odometer, type (service, part replacement, repair, other), description, workshop, labor cost, parts with quantity and unit price, and notes. Totals are computed automatically.
- Standalone odometer readings. The current odometer is the highest value from services or readings.
- Vehicle summary cards: current odometer, total spent, spent this year and last service.
- Hash routing with sub-routes, passed to module screens as `path`.
- Breadcrumbs in the page header.

### Changed
- Code structure renamed to English: `finance` and `vehicles` modules (hooks, screens, types), route slugs (`#/finance`, `#/vehicles`), data files (`data/finance.json`, `data/vehicles.json`) and stored enum values (e.g. `checking`, `investment`, `car`, `service`).
- Shared money, date and odometer formatting helpers moved to `src/lib/format.ts`.
- The Drive attachments folder is created as `attachments` instead of `anexos`.

## [0.1.1] - 2026-10-24

### Changed
- The Drive root folder is created as `db-vault` instead of `Vault`.

## [0.1.0] - 2026-10-24

### Added
- Personal vault single-page app with no backend (React, Vite, TypeScript, Tailwind CSS v4, shadcn/ui).
- Google sign-in with Google Identity Services, `drive.file` scope and a reconnect flow when the 1-hour token expires.
- Google Drive as the database: a root folder with one JSON file per module, found through `appProperties`.
- Read-merge-write sync per item (`id`, `updatedAt`, `deleted`), so edits from different devices don't overwrite each other.
- Code-defined modules with hash routing and a dashboard layout (sidebar, header) based on shadcn `dashboard-01`.
- **Finance** module: accounts by institution, dated balance history, summary cards (net worth, 30-day and month-to-date change, largest institution, account count), net worth chart and accounts table.

