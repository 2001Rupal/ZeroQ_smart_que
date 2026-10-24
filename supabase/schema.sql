-- =========================================================================
-- Virtual QR Queue Platform - Supabase PostgreSQL Schema
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_phone TEXT,
    settings JSONB DEFAULT '{
        "snoozeOffset": 2,
        "walletBalance": 10.0,
        "autoExpireMinutes": 10,
        "batchSize": 3,
        "whatsappEnabled": false,
        "smsEnabled": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Counters Table
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    counter_number INT NOT NULL,
    counter_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    current_serving_token_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, counter_number)
);

-- 4. Create Daily Sequences Table (For Atomic Daily Token Numbers)
CREATE TABLE IF NOT EXISTS public.daily_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL, -- e.g. '2026-10-24'
    seq INT NOT NULL DEFAULT 0,
    UNIQUE(store_id, date_key)
);

-- 5. Create Tokens Table
CREATE TABLE IF NOT EXISTS public.tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uuid TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL, -- 'YYYY-MM-DD'
    token_number INT NOT NULL,
    token_code TEXT NOT NULL, -- e.g. 'A-01', 'B-02', 'P-03', 'S-01'
    service_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (service_type IN ('GENERAL', 'BILLING', 'PHARMACY', 'PRIORITY')),
    priority BOOLEAN DEFAULT FALSE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    -- Status Lifecycle: WAITING -> CALLED -> SERVING -> COMPLETED | SKIPPED | CANCELLED | EXPIRED
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'EXPIRED')),
    queue_position FLOAT8 NOT NULL,
    assigned_counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    snooze_count INT DEFAULT 0,
    hold_until TIMESTAMPTZ,
    notifications_sent JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for lightning-fast queue ordering and lookup
CREATE INDEX IF NOT EXISTS idx_tokens_store_date_status_pos ON public.tokens(store_id, date_key, status, queue_position);
CREATE INDEX IF NOT EXISTS idx_tokens_phone_dedup ON public.tokens(store_id, date_key, customer_phone, status);
CREATE INDEX IF NOT EXISTS idx_tokens_uuid ON public.tokens(uuid);

-- 6. Enable Supabase Realtime Replication on Tokens and Counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.counters;

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sequences ENABLE ROW LEVEL SECURITY;

-- Allow public read so customer phones and TV displays can view passes & queues
CREATE POLICY "Allow public read on stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Allow public read on counters" ON public.counters FOR SELECT USING (true);
CREATE POLICY "Allow public read on tokens" ON public.tokens FOR SELECT USING (true);

-- Allow service role (backend API) full access to write and update
CREATE POLICY "Allow service role full access on stores" ON public.stores USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on counters" ON public.counters USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on tokens" ON public.tokens USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on daily_sequences" ON public.daily_sequences USING (true) WITH CHECK (true);

-- 8. Seed Default Demo Store & Counters
INSERT INTO public.stores (slug, name, owner_phone)
VALUES ('express-store', 'Express Healthcare & Retail Center', '+19998887777')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
    demo_store_id UUID;
BEGIN
    SELECT id INTO demo_store_id FROM public.stores WHERE slug = 'express-store' LIMIT 1;

    IF demo_store_id IS NOT NULL THEN
        INSERT INTO public.counters (store_id, counter_number, counter_name)
        VALUES 
            (demo_store_id, 1, 'Counter 1 - General'),
            (demo_store_id, 2, 'Counter 2 - Express Billing'),
            (demo_store_id, 3, 'Counter 3 - Pharmacy Pickup')
        ON CONFLICT (store_id, counter_number) DO NOTHING;
    END IF;
END $$;
