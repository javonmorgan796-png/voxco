
-- 1. user_wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
  ON public.user_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all wallets"
  ON public.user_wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update any wallet"
  ON public.user_wallets FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert wallets"
  ON public.user_wallets FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own wallet"
  ON public.user_wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed wallet on signup ($1000 welcome bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_wallets (user_id, balance) VALUES (NEW.id, 1000) ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'javonmorgan796@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill wallets for existing users
INSERT INTO public.user_wallets (user_id, balance)
SELECT id, 1000 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Credit on deposit approval
CREATE OR REPLACE FUNCTION public.apply_deposit_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (NEW.user_id, NEW.amount_usd)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_wallets.balance + EXCLUDED.balance,
          updated_at = now();
    NEW.credited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deposit_apply ON public.deposit_requests;
CREATE TRIGGER trg_deposit_apply
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_deposit_approval();

-- 4. Debit on withdrawal approval
CREATE OR REPLACE FUNCTION public.apply_withdrawal_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT balance INTO current_balance FROM public.user_wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF current_balance IS NULL THEN
      INSERT INTO public.user_wallets (user_id, balance) VALUES (NEW.user_id, 0);
      current_balance := 0;
    END IF;
    UPDATE public.user_wallets
      SET balance = GREATEST(0, current_balance - NEW.amount_usd),
          updated_at = now()
      WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_apply ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_apply
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_withdrawal_approval();

-- 5. Enable realtime for wallets
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;
