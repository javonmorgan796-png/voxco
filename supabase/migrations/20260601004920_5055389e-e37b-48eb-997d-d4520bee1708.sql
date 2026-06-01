
-- Atomic VIP purchase RPC: deducts balance, records vip_history, returns new state.
CREATE OR REPLACE FUNCTION public.purchase_vip(
  _plan_id text,
  _plan_label text,
  _months int,
  _price numeric
)
RETURNS TABLE(new_balance numeric, new_expires_at timestamptz, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_balance numeric;
  cur_expiry timestamptz;
  base_from timestamptz;
  next_expiry timestamptz;
  act text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF _price IS NULL OR _price <= 0 OR _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;

  -- Ensure wallet row exists
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO cur_balance FROM public.user_wallets WHERE user_id = uid FOR UPDATE;
  IF cur_balance < _price THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  -- Determine base date from latest active membership
  SELECT MAX(new_expires_at) INTO cur_expiry FROM public.vip_history WHERE user_id = uid;
  IF cur_expiry IS NOT NULL AND cur_expiry > now() THEN
    base_from := cur_expiry;
    act := 'extended';
  ELSE
    base_from := now();
    act := 'joined';
  END IF;

  next_expiry := base_from + (_months * INTERVAL '30 days');

  UPDATE public.user_wallets
    SET balance = cur_balance - _price, updated_at = now()
    WHERE user_id = uid;

  INSERT INTO public.vip_history (user_id, plan_id, plan_label, months, price, action, previous_expires_at, new_expires_at)
  VALUES (uid, _plan_id, _plan_label, _months, _price, act, cur_expiry, next_expiry);

  RETURN QUERY SELECT (cur_balance - _price)::numeric, next_expiry, act;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_vip(text, text, int, numeric) TO authenticated;
