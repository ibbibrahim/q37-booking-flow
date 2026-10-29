# Q37 Workflow Frontend

## Core rule: match existing patterns, don't invent new ones

Before writing new code, find how the codebase already solves this problem and follow that — even if a different approach seems cleaner in isolation. Search sibling `*_workflow` folders, `src/components`, `src/hooks`, `src/utils`, `src/lib`, `src/contexts` first. Reuse or extend what's there instead of writing a parallel implementation or a new abstraction "just in case."

## Tech stack
- React 18.3 + TypeScript 5.5 (`strict: true`, `noUnusedLocals`/`noUnusedParameters` on), Vite 5.
- Path alias `@/*` → `src/*` exists in tsconfig, but isn't uniformly used — many files (including `App.tsx`) still use relative imports. Either is acceptable; don't do a mass migration.
- Routing: React Router v7.
- Data fetching: TanStack React Query v5 + Axios. **No Redux/Zustand** — cross-cutting state goes through React Context, local state stays in components.
- UI: Radix UI primitives wrapped as shadcn-style components in `src/components/ui/*` (button, dialog, table, sidebar, form, list-filter-bar, list-pagination-bar, multi-file-upload-field, etc.). Styling helpers: `class-variance-authority`, `tailwind-merge`, `clsx` (`cn()` in `src/lib/utils.ts`).
- Charts: Recharts. Real-time: `@microsoft/signalr`. Dates: `date-fns` + `react-day-picker`. Drag-drop: `@dnd-kit`. Exports: `jspdf`, `exceljs`, `xlsx`, `docx`, `pdf-lib`. Animation: `motion`.
- Supabase SDK is present in deps but usage is unconfirmed — don't assume it's wired up without checking first.

## Project structure
Feature-first under `src/`: one folder per workflow module (`hr_workflow`, `booking_workflow`, `callsheet_workflow`, `creative_workflow`, `dtl_workflow`, `epg_workflow`, `bit_workflow`, `studio_booking`, `rota`, `inventory`, `admin`), plus shared `src/api`, `src/components`, `src/contexts`, `src/hooks`, `src/lib`, `src/utils`.

**There is no single fixed internal layout per module — it varies by module size:**
- Simpler modules (`booking_workflow`, `callsheet_workflow`, `dtl_workflow`, `studio_booking`): `components/`, `services/`, `types/` (+ `utils/` in some) — flat components, one `xxxApi.ts` per resource under `services/`.
- Richer modules (`hr_workflow`, the largest): `api/`, `components/`, `context/`, `data/`, `i18n/`, `pages/`, `types/`, `utils/` — page-level components live in `pages/`, reusable pieces in `components/`.
- Mid-size (`creative_workflow`, `epg_workflow`): `components/`, `hooks/`, `types/`, sometimes `services/`.

**When adding to a module, match that specific module's existing layout — don't force a universal structure across modules.** If a module is growing past a flat `components/` folder, follow the `hr_workflow` `pages/` + `components/` split rather than inventing a different one.

## API layer
- One service/API file per resource/domain, inside the owning module (e.g. `services/bookingApi.ts`, `hr_workflow/api/hrApi.ts`, `hiringRequestApi.ts`, `leaveRequestApi.ts`, `freelanceProfileApi.ts`).
- All of them call through the single shared Axios instance: `src/utils/apiClient.ts`. It auto-attaches the `Bearer` token from `localStorage('auth_token')` via a request interceptor, and redirects to `/login` on 401 via a response interceptor (opt out per-request with `skipAuthRedirect`). **New API calls must go through this instance, not a new Axios/fetch setup.**
- `src/api/` (top-level) holds things not owned by one workflow module (e.g. `bitChecklistApi.ts`, `notifications.ts`).
- Components/hooks wrap these service calls with React Query for caching — follow that pattern for new data fetching rather than raw `useEffect` + `fetch`.

## Routing & auth
- All routes are declared in one tree in `App.tsx` (no per-module route files, no lazy-loading observed). Add new routes inline under the existing `ProtectedRoute`-wrapped tree.
- Role gating: `<ProtectedRoute allowedRoles={[...]}>`. A `strict` prop means Admin does **not** auto-bypass the check (used for BIT, HR) — use it for sensitive modules.
- Default landing route is computed from `user.roles` priority order in `getDefaultRoute()`.
- Auth state: `src/contexts/AuthContext.tsx`, plain Context (no external auth library). Token + user JSON persisted in `localStorage` (`auth_token`, `auth_user`), JWT decoded once on login, restored on mount. `useAuth()` throws if called outside the provider — copy this exact hook-from-context shape for any new context.

## Styling — tokens, not hex
Colors are HSL custom properties in `src/index.css`, mapped to semantic Tailwind names in `tailwind.config.js`: `background/foreground`, `card`, `popover`, `primary` (+ `hover`/`active`/`soft`/`subtle` variants), `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `border/input/ring`, plus a separate `sidebar.*` set. Dark mode uses the `class` strategy. **Never use raw hex in components** — add new semantic tokens to this system instead.

## Naming conventions
- Components: `PascalCase.tsx` (`RequestDetail.tsx`), suffixed by role where relevant (`ChangePasswordModal`, `EmployeeDetailPage`, `RequestCard`).
- Hooks: `camelCase`, `use*.ts` (`useXxx.ts`).
- API/service files: `camelCase`, `xxxApi.ts`.
- Contexts: `XxxContext.tsx`, exporting the context, a `useXxx()` hook, and an `XxxProvider`.
- Types: domain models live in a module-local `types/` folder, not inlined in components. Small prop-only interfaces stay inline in the component file.

## Shared/reusable — check these before building anything new
- `src/components/ui/*` — the Radix/shadcn primitive library. Check here before building any generic button/dialog/table/form/pagination piece.
- `src/contexts/*` — six shared contexts: `AuthContext`, `NotificationContext`, `PageHeaderContext`, `SignalRContext`, `ThemeContext`, `ToastContext`.
- `src/lib/*` — small shared helpers (`utils.ts` has `cn()`, plus `appVersion.ts`, `formatFileSize.ts`).
- `src/utils/*` — `apiClient.ts`, `apiError.ts`, `browserNotifications.ts`.
- **Page titles go through context, not a per-page `<h1>`.** Use `usePageHeader(title, subtitle)` from `PageHeaderContext`, matching existing pages in the module being touched.

## Real-time / notifications
`SignalRContext` wraps the `@microsoft/signalr` hub connection app-wide. `NotificationContext` plus `NotificationDropdown.tsx` / `NotificationPermissionBanner.tsx` / `NotificationSettings.tsx` layer in-app and browser-permission notification UI on top. Real-time events should arrive via `SignalRContext` and surface through `NotificationContext`/toast — don't open ad hoc per-component sockets.

## Placeholder data
If a UI needs a number with no real backend source yet, name the variable `dummy*` with a `// DUMMY — ...` comment explaining exactly what's missing and why, instead of faking a "real-looking" calculation or silently using 0.

## Lint & TypeScript
- Flat ESLint config: `typescript-eslint` recommended + `react-hooks` recommended + `react-refresh` only-export-components warning. Nothing unusually strict beyond that — don't add new lint rules without asking.
- TS is `strict`, with `noUnusedLocals`/`noUnusedParameters` on — don't disable these to silence an error; fix the actual unused code.

## When unsure
Search the codebase for the closest analogous feature and match it, rather than guessing or defaulting to a generic/textbook pattern.

## Project notes
- Backend: separate repo `qtv37-workflow-api`.
- Never run or connect to the MySQL database directly (no `mysql.exe`, no ad hoc scripts) — migrations are run by the user; only point to the migration file.
