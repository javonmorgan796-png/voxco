
-- Remove $1000 signup bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_wallets (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'javonmorgan796@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Admin credit/debit function. Positive _amount credits, negative debits.
CREATE OR REPLACE FUNCTION public.admin_credit_user(_user_id uuid, _amount numeric, _note text DEFAULT NULL)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  prev numeric;
  new_balance numeric;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'amount must be non-zero';
  END IF;

  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (_user_id, GREATEST(0, _amount))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO prev FROM public.user_wallets WHERE user_id = _user_id FOR UPDATE;
  new_balance := GREATEST(0, prev + _amount);

  UPDATE public.user_wallets
    SET balance = new_balance, updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, before, after)
  VALUES (caller, 'admin_credit_user', 'user_wallet', _user_id,
    jsonb_build_object('balance', prev),
    jsonb_build_object('balance', new_balance, 'delta', _amount, 'note', _note));

  RETURN new_balance;
END;
$function$;
