REVOKE EXECUTE ON FUNCTION public.detect_signals(date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rank_signals(date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_ingest_job() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.record_signal_version() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.detect_signals(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.rank_signals(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ingest_job() TO service_role;