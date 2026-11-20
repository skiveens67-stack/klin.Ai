# Klin application entry points and authentication

Branch: `chatgpt/backend-foundation`

## App Router wiring

- `app/layout.tsx` provides the root HTML document, metadata, viewport, and global stylesheet.
- `app/page.tsx` is a force-dynamic authenticated workspace entry point. It calls Supabase `auth.getUser()`, redirects unauthenticated users to `/login`, and passes the authenticated email to the app shell.
- `app/globals.css` contains the auth screen design and the utility subset currently used by the AppShell and KlinieChat components. This repository does not currently include Tailwind as a package dependency, so the stylesheet avoids unresolved `@tailwind` directives and supplies the styles needed by these components directly.
- `middleware.ts` refreshes Supabase SSR cookies before server components and API routes execute. It does not grant access; protected pages and APIs still validate the user server-side.

## Authentication routes

- `/login` — email/password sign-in using Supabase Auth.
- `/signup` — account creation using Supabase Auth; displays an email-confirmation notice when confirmation is required.
- `/auth/callback` — exchanges the Supabase PKCE code for a session and validates the post-auth redirect path.
- `POST /api/auth/logout` — same-origin-only server-side sign-out; the app shell returns to `/login` after success.

## Required deployment configuration

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the Supabase publishable/anon key) in the deployment environment. The existing `.env.example` documents these names. The Supabase Auth URL configuration must allow the production callback URL `https://klin.website/auth/callback` and the matching preview callback URLs used for testing.

The service-role key remains server-only and is not used by browser authentication.

## Important boundaries

- No deployment, DNS, Supabase dashboard configuration, or production database change was made.
- The login/signup flows require the Supabase Auth email/password provider to be enabled and the callback URL to be allowlisted in the Supabase project.
- Browser/mobile end-to-end testing still requires a configured preview deployment and test account.
- Klinie model inference and streaming remain unimplemented; conversation storage is connected but the assistant provider is not.
- Other AppShell destinations remain marked as coming soon until their actual feature pages exist.

## Route resilience and crawler policy

- `app/loading.tsx` provides an accessible route loading state.
- `app/error.tsx` and `app/global-error.tsx` provide route and root-level recovery screens.
- `app/not-found.tsx` provides the application 404 page.
- `app/icon.svg` provides the app icon.
- `app/robots.ts` disallows indexing while the product is in pre-launch development.

## Settings and support entry points

- `/settings` is a server-protected account page showing the signed-in email.
- `components/settings/SettingsPanel.tsx` supports password updates through the authenticated Supabase browser session, with validation and user-visible success/error states.
- The AppShell Settings item links to the protected settings route.
- Help & Support opens the configured support domain `https://klin.help`.
