-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'javonmorgan796@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Leaderboard
CREATE TABLE public.leaderboard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_bets integer DEFAULT 0 NOT NULL,
  wins integer DEFAULT 0 NOT NULL,
  losses integer DEFAULT 0 NOT NULL,
  total_wagered numeric DEFAULT 0 NOT NULL,
  total_won numeric DEFAULT 0 NOT NULL,
  biggest_payout numeric DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upsert own stats" ON public.leaderboard_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.leaderboard_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- VIP predictions
CREATE TABLE public.vip_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('A','B','C','E')),
  home_team TEXT NOT NULL, away_team TEXT NOT NULL, league TEXT NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL, prediction TEXT NOT NULL,
  selection TEXT NOT NULL DEFAULT 'home' CHECK (selection IN ('home','draw','away')),
  odds NUMERIC NOT NULL CHECK (odds > 1),
  confidence INTEGER NOT NULL DEFAULT 75 CHECK (confidence BETWEEN 1 AND 100),
  analysis TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vip_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view VIP predictions" ON public.vip_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert VIP predictions" ON public.vip_predictions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update VIP predictions" ON public.vip_predictions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete VIP predictions" ON public.vip_predictions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_vip_predictions_updated_at BEFORE UPDATE ON public.vip_predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.vip_predictions (section, home_team, away_team, league, kickoff, prediction, selection, odds, confidence, analysis) VALUES
('A','Manchester City','Brighton','English Premier League', now() + interval '1 day','Home Win','home',1.45,92,'City unbeaten at home in 14, Brighton missing two key defenders.'),
('A','Real Madrid','Getafe','Spanish La Liga', now() + interval '2 day','Home Win & Over 1.5','home',1.55,89,'Madrid scored 2+ in last 9 home games. Getafe poor away form.'),
('B','Bayern Munich','Wolfsburg','German Bundesliga', now() + interval '1 day','Over 2.5 Goals','home',1.50,84,'Bayern averaging 3.1 goals at home. Wolfsburg leak goals away.'),
('B','Inter Milan','Lazio','Italian Serie A', now() + interval '2 day','Both Teams to Score','home',1.70,81,'BTTS landed in 7 of last 8 between these sides.'),
('C','PSG','Lyon','French Ligue 1', now() + interval '3 day','Home Win & BTTS','home',2.40,76,'Lyon scoring consistently away, but PSG firepower decisive.'),
('C','Liverpool','Arsenal','English Premier League', now() + interval '3 day','Over 2.5 & BTTS','home',2.10,79,'Both teams averaging 2+ goals.'),
('E','Atletico Madrid','Sevilla','Spanish La Liga', now() + interval '2 day','Correct Score 2-1','home',8.50,62,'Atletico tight at home.'),
('E','Borussia Dortmund','RB Leipzig','German Bundesliga', now() + interval '4 day','First Half Over 1.5','home',3.20,68,'Both teams press high in opening 20 mins.');

-- Crypto/request enums + bank field
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.crypto_kind AS ENUM ('BTC', 'ETH', 'USDT', 'BANK');

-- Deposit requests
CREATE TABLE public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  crypto crypto_kind NOT NULL,
  tx_hash text, note text,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz,
  bank_name text, bank_account text, bank_reference text,
  receipt_url text, credited_at timestamptz, reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposits" ON public.deposit_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own deposits" ON public.deposit_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all deposits" ON public.deposit_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update deposits" ON public.deposit_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_deposit_requests_updated_at BEFORE UPDATE ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  crypto crypto_kind NOT NULL,
  destination_address text NOT NULL, note text,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz,
  bank_name text, bank_account text, bank_reference text, reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update withdrawals" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VIP bets
CREATE TYPE public.vip_bet_status AS ENUM ('pending', 'approved', 'rejected', 'won', 'lost');
CREATE TABLE public.vip_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prediction_id uuid NOT NULL REFERENCES public.vip_predictions(id) ON DELETE CASCADE,
  stake numeric NOT NULL CHECK (stake > 0),
  odds numeric NOT NULL,
  potential_payout numeric NOT NULL,
  status vip_bet_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vip_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own vip bets" ON public.vip_bets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own vip bets" ON public.vip_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all vip bets" ON public.vip_bets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update vip bets" ON public.vip_bets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_vip_bets_updated_at BEFORE UPDATE ON public.vip_bets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_bets;

-- Audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before jsonb, after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

-- VIP history
CREATE TABLE public.vip_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  plan_label text NOT NULL,
  months int NOT NULL,
  price numeric NOT NULL,
  action text NOT NULL CHECK (action IN ('joined','extended')),
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vip_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own vip history" ON public.vip_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vip history" ON public.vip_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all vip history" ON public.vip_history FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Storage: receipts (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users upload own receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'));

-- Payment wallets
CREATE TABLE public.payment_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crypto public.crypto_kind NOT NULL,
  label TEXT NOT NULL, address TEXT NOT NULL, network TEXT NOT NULL,
  qr_url TEXT, icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active wallets" ON public.payment_wallets FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert wallets" ON public.payment_wallets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update wallets" ON public.payment_wallets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete wallets" ON public.payment_wallets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_payment_wallets_updated_at BEFORE UPDATE ON public.payment_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage: wallet QR (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('wallet-qr', 'wallet-qr', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Wallet QR public read" ON storage.objects FOR SELECT USING (bucket_id = 'wallet-qr');
CREATE POLICY "Admins upload wallet QR" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wallet-qr' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update wallet QR" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'wallet-qr' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete wallet QR" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wallet-qr' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_wallets (crypto, label, address, network, icon_url) VALUES
  ('BTC', 'Bitcoin', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bitcoin Network', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'),
  ('USDT', 'Tether (USDT)', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'ERC-20 / TRC-20', 'https://assets.coingecko.com/coins/images/325/large/Tether.png'),
  ('ETH', 'Ethereum', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum Network', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png');