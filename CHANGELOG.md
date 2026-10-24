# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- README rewritten in English, with the Google Cloud setup matching the current configuration (Testing mode with test users).

### Added
- This changelog.

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

