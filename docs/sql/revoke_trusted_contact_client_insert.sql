-- PROPOSED SECURITY PATCH — DO NOT APPLY UNTIL MIGRATION HISTORY IS RECONCILED.
--
-- Live inspection on the Klin.Ai Supabase project found column-level INSERT
-- privileges for authenticated on trusted_contacts, including secret_reference.
-- RLS limits rows to auth.uid(), but column grants still allow the owner to
-- bypass the application route that performs AES-256-GCM encryption.
--
-- The application route now writes through the server-only service-role client
-- after authenticating the user and deriving user_id from the verified session.
-- Apply this SQL only after reconciling the local migration filenames with the
-- 16 migrations currently recorded in the live project.
--
-- Keep the existing SELECT column grants, UPDATE column grants, DELETE grant,
-- and trusted_contacts_self RLS policy. Remove only direct INSERT rights.

REVOKE INSERT ON TABLE public.trusted_contacts FROM PUBLIC, anon, authenticated;

REVOKE INSERT (user_id, display_name, channel, secret_reference, priority, is_emergency)
ON TABLE public.trusted_contacts
FROM PUBLIC, anon, authenticated;

-- Verification query to run after the migration:
-- SELECT
--   has_column_privilege('authenticated', 'public.trusted_contacts', 'secret_reference', 'INSERT')
--     AS authenticated_can_insert_secret_reference;
-- Expected result: false.
