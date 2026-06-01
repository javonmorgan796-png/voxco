REVOKE EXECUTE ON FUNCTION public.purchase_vip(text, text, integer, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_vip(text, text, integer, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_vip(text, text, integer, numeric) TO authenticated;