# Sharvi Asset360 production build

## Goal
Build the uploaded specification as a commercial multi-tenant asset lifecycle platform, not a QR-only utility. The first usable release will cover the complete create → tag → assign → locate → scan → verify → transfer → maintain → audit → retire lifecycle, with ERP connectors kept optional.

## Product experience
- Apply the selected Frosted Glass direction across a responsive desktop workspace and mobile-first scan flow.
- Create a public sign-in and recovery experience, then a protected application shell with organization context, global search, notifications, user menu, and role-aware navigation.
- Build the executive dashboard with the requested KPIs, charts, attention queues, maintenance schedule, verification queue, and recent activity.
- Build functional screens for Assets, QR Management, Locations, Departments, Employees, Assignments, Transfers, Maintenance, Verification, Audit Trail, Reports, Integrations, Users & Roles, and Settings.
- Use dialogs, drawers, filters, tables, timelines, status badges, empty/loading/error states, and success notifications consistently.
- Add mobile navigation emphasizing Scan QR, My Assets, Report Issue, Verify, Transfer, and Maintenance.

## Data, accounts, and security
- Enable email/password and Google sign-in, including signup, email confirmation messaging, forgot-password, reset-password, and safe sign-out.
- Store user profiles and roles separately; implement the listed roles and granular permissions without trusting browser state.
- Create normalized organization-scoped records for assets, categories, locations, departments, employees, assignments, transfers, maintenance, verification campaigns/results, QR tokens, documents, approvals, notifications, audits, and integrations.
- Enforce tenant isolation and role-aware access in database policies and protected server operations.
- Generate collision-safe asset IDs and opaque QR tokens; expose only basic approved fields on public QR pages.
- Keep audit records append-only and keep ERP credentials out of browser-readable data.

## Operational workflows
- Asset CRUD with configurable category prefixes, images/documents, lifecycle status, valuation, warranty, ownership, and full history.
- QR creation, regeneration, download, print, bulk generation, label sizing, and mobile camera scanning.
- Assignment and transfer flows with approval states and immutable history.
- Verification campaigns with scan-by-scan outcomes, photos, remarks, mismatches, and progress summaries.
- Maintenance requests, schedules, technicians/providers, costs, parts, attachments, and issue reporting from a scan.
- Validated CSV/Excel import preview with valid, invalid, duplicate, and missing-field results plus downloadable errors.
- Filterable reports with CSV/print output; PDF-ready print layouts.
- Integration registry, configurable field mappings, manual sync controls, and sync logs. ERP adapters remain behind a server/middleware boundary and do not affect standalone operation.

## Demo readiness
- Seed a demo organization with 50+ realistic assets across the requested categories, plus locations, departments, employees, assignments, transfers, maintenance, and verification records.
- Ensure new users can enter a coherent demo workspace without fake controls; major actions will save, update, export, navigate, or provide an explicit unavailable-state reason.

## Offline and installability
- Add installable app metadata and a guarded offline service worker for the published app only.
- Cache the application shell and limited authorized asset snapshots; queue verification notes/photos while offline and synchronize when connectivity returns.
- Exclude sign-in callbacks from caching and clearly show Offline, Sync Pending, and Synced states.

## Technical notes
- Use TanStack Start routes and server functions with Zod validation; external ERP/webhook traffic uses authenticated public API endpoints.
- Use Lovable Cloud for database, authentication, and private document/photo storage.
- Keep all visual values in semantic design tokens and preserve the selected glass composition, typography, restrained motion, and responsive structure.
- Add unique page metadata for every public/content route and test desktop/mobile rendering, authentication, tenant isolation, primary workflows, build health, and security findings.

## Delivery sequence
1. Foundation: design system, schema, tenant/RBAC policies, authentication, protected shell, and demo seed.
2. Core operations: dashboard, asset master/details, categories, organization masters, QR generation/scanning.
3. Lifecycle: assignments, transfers/approvals, verification, maintenance, history, audit, and notifications.
4. Administration: bulk import, reports/exports, integrations/mappings/logs, users/roles, settings, and offline synchronization.
5. Validation: responsive workflow checks, permissions, public QR disclosure, security scan, and production-readiness fixes.
