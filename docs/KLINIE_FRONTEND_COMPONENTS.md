# Klinie frontend components

Branch: `chatgpt/backend-foundation`

## Added components

- `components/chat/KlinieChat.tsx` — responsive chat workspace with recent and archived conversation lists, new chat creation, conversation loading, user-message persistence, archive/restore actions, and mobile history drawer.
- `components/layout/AppShell.tsx` — responsive Klin workspace shell with navigation and Klinie Chat as the active workspace. Other navigation destinations are explicitly marked as coming soon.

## API integration

The chat component uses the existing authenticated endpoints:

- `GET /api/conversations?archived=false|true`
- `POST /api/conversations`
- `GET /api/conversations/:conversationId`
- `PATCH /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/messages`

## Current limitations

- The conversation message endpoint persists the user's message but returns `assistant.status = not_connected`. No Klinie model provider or streaming response endpoint is implemented yet. The UI states this honestly and does not fabricate an AI answer.
- The repository currently has no `app/layout.tsx` or `app/page.tsx`. These components are not mounted on a website route until a real application entry point is added and connected to the existing authentication flow.
- No browser/mobile end-to-end test has yet been run against a deployed frontend.
- The current AppShell is a clean standalone shell, not a merge of the unavailable Grok-generated local frontend. Review its navigation and design before replacing any existing deployed UI.

## Integration step

Add the application's root layout and page after confirming the intended auth/session gate. The page should render `AppShell`; the root layout should include the global Tailwind stylesheet and metadata. Do not expose private environment variables to the browser.

## App entry points and authentication (added after the initial component commit)

The missing App Router integration is now present:

- `app/layout.tsx` — root document, metadata, viewport, global stylesheet.
- `app/page.tsx` — server-side authenticated gate; redirects signed-out users to `/login`.
- `app/globals.css` — auth screen styles and a compiled utility subset for the current shell/chat components. The repository has no Tailwind package dependency, so no unresolved Tailwind PostCSS directives are used.
- `middleware.ts` — refreshes Supabase SSR auth cookies before route execution.
- `app/login/page.tsx`, `app/signup/page.tsx`, `components/auth/AuthForm.tsx` — email/password authentication and confirmation UX.
- `app/auth/callback/route.ts` — PKCE callback exchange with a safe local redirect.
- `app/api/auth/logout/route.ts` — origin-checked server-side sign-out.
- `lib/supabase/browser.ts` — browser-only Supabase client.

See `docs/KLIN_APP_ENTRYPOINTS.md` for configuration requirements and remaining verification boundaries.
