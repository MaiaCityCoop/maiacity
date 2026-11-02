-- After the one-time import: play reads nothing of legacy any more (play/SPEC.md §2).
REVOKE SELECT ON public.founders, public.passkeys FROM play;
REVOKE USAGE ON SCHEMA public FROM play;
