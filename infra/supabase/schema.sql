-- Supabase/Postgres
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Optional: keep statuses constrained and readable
do $$
begin
  if not exists (select 1 from pg_type where typname = 'search_status') then
    create type public.search_status as enum ('pending', 'success', 'partial', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_selection_status') then
    create type public.match_selection_status as enum ('unreviewed', 'accepted', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'offer_stock_status') then
    create type public.offer_stock_status as enum ('in_stock', 'out_of_stock', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'wishlist_item_status') then
    create type public.wishlist_item_status as enum ('active', 'paused', 'purchased', 'archived');
  end if;
end $$;

-- Users own searches and wishlists through Supabase auth.users
-- auth.users is managed by Supabase, so we only reference it.

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  normalized_name citext not null unique,
  homepage_url text,
  source_icon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_homepage_url_chk
    check (homepage_url is null or homepage_url ~* '^https?://'),
  constraint merchants_source_icon_url_chk
    check (source_icon_url is null or source_icon_url ~* '^https?://')
);

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  brand text,
  title text not null,
  canonical_name text,
  category text,
  model_code text,              -- e.g. 1183C102-751 inferred from URL/title when available
  colorway text,
  gtin text,
  mpn text,
  image_url text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_products_image_url_chk
    check (image_url is null or image_url ~* '^https?://')
);

-- Helpful uniqueness when you can derive a stable product code
create unique index if not exists catalog_products_model_code_uidx
  on public.catalog_products (lower(model_code))
  where model_code is not null;

create table if not exists public.product_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- input searched by the user
  search_image_url text not null,
  search_country char(2) not null,
  search_language text not null default 'en',
  search_type text not null default 'products',
  safe_mode text not null default 'active',

  -- SerpAPI metadata
  serpapi_search_id text not null unique,  -- "69ebe7236372f34d9274da7d"
  serpapi_json_endpoint text,
  serpapi_html_endpoint text,
  google_lens_url text,
  api_status search_status not null default 'pending',
  api_created_at timestamptz,
  api_processed_at timestamptz,
  total_time_taken_seconds numeric(8,2),

  -- full raw payload for replay/debugging/audit
  raw_response jsonb not null,

  created_at timestamptz not null default now(),

  constraint product_searches_country_chk
    check (search_country ~ '^[A-Z]{2}$'),
  constraint product_searches_image_url_chk
    check (search_image_url ~* '^https?://'),
  constraint product_searches_json_endpoint_chk
    check (serpapi_json_endpoint is null or serpapi_json_endpoint ~* '^https?://'),
  constraint product_searches_html_endpoint_chk
    check (serpapi_html_endpoint is null or serpapi_html_endpoint ~* '^https?://'),
  constraint product_searches_google_lens_url_chk
    check (google_lens_url is null or google_lens_url ~* '^https?://'),
  constraint product_searches_time_taken_chk
    check (total_time_taken_seconds is null or total_time_taken_seconds >= 0)
);

create index if not exists product_searches_user_created_idx
  on public.product_searches (user_id, created_at desc);

create index if not exists product_searches_raw_response_gin
  on public.product_searches using gin (raw_response jsonb_path_ops);

create table if not exists public.search_matches (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.product_searches(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete set null,
  catalog_product_id uuid references public.catalog_products(id) on delete set null,

  position integer not null,
  title text not null,
  result_url text not null,
  source_name text not null,
  source_icon_url text,

  rating numeric(3,2),
  reviews_count integer,
  price_display text,                  -- "€160*"
  price_amount numeric(12,2),          -- 160.00
  currency_code char(3),               -- normalize "€" to "EUR" at ingest
  stock_status offer_stock_status not null default 'unknown',

  thumbnail_url text,
  thumbnail_width integer,
  thumbnail_height integer,
  image_url text,
  image_width integer,
  image_height integer,

  selection_status match_selection_status not null default 'unreviewed',
  selected_at timestamptz,
  created_at timestamptz not null default now(),

  constraint search_matches_position_chk
    check (position > 0),
  constraint search_matches_rating_chk
    check (rating is null or (rating >= 0 and rating <= 5)),
  constraint search_matches_reviews_chk
    check (reviews_count is null or reviews_count >= 0),
  constraint search_matches_price_chk
    check (price_amount is null or price_amount >= 0),
  constraint search_matches_thumb_w_chk
    check (thumbnail_width is null or thumbnail_width > 0),
  constraint search_matches_thumb_h_chk
    check (thumbnail_height is null or thumbnail_height > 0),
  constraint search_matches_img_w_chk
    check (image_width is null or image_width > 0),
  constraint search_matches_img_h_chk
    check (image_height is null or image_height > 0),
  constraint search_matches_result_url_chk
    check (result_url ~* '^https?://'),
  constraint search_matches_source_icon_url_chk
    check (source_icon_url is null or source_icon_url ~* '^https?://'),
  constraint search_matches_thumbnail_url_chk
    check (thumbnail_url is null or thumbnail_url ~* '^https?://'),
  constraint search_matches_image_url_chk
    check (image_url is null or image_url ~* '^https?://'),
  constraint search_matches_currency_chk
    check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  constraint search_matches_search_position_uniq
    unique (search_id, position)
);

create index if not exists search_matches_search_idx
  on public.search_matches (search_id, position);

create index if not exists search_matches_catalog_product_idx
  on public.search_matches (catalog_product_id);

create index if not exists search_matches_result_url_idx
  on public.search_matches (result_url);

create table if not exists public.product_offers (
  id uuid primary key default gen_random_uuid(),
  catalog_product_id uuid not null references public.catalog_products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,

  product_url text not null,
  product_url_hash text generated always as (md5(lower(product_url))) stored,

  merchant_sku text,
  merchant_product_title text not null,
  image_url text,

  currency_code char(3) not null,
  current_price_amount numeric(12,2),
  current_price_display text,
  stock_status offer_stock_status not null default 'unknown',
  rating numeric(3,2),
  reviews_count integer,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  is_active boolean not null default true,

  constraint product_offers_url_chk
    check (product_url ~* '^https?://'),
  constraint product_offers_image_url_chk
    check (image_url is null or image_url ~* '^https?://'),
  constraint product_offers_currency_chk
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint product_offers_price_chk
    check (current_price_amount is null or current_price_amount >= 0),
  constraint product_offers_rating_chk
    check (rating is null or (rating >= 0 and rating <= 5)),
  constraint product_offers_reviews_chk
    check (reviews_count is null or reviews_count >= 0),
  constraint product_offers_product_url_hash_uniq
    unique (product_url_hash)
);

create index if not exists product_offers_product_idx
  on public.product_offers (catalog_product_id, is_active, current_price_amount);

create index if not exists product_offers_merchant_idx
  on public.product_offers (merchant_id, is_active);

create table if not exists public.offer_price_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.product_offers(id) on delete cascade,
  observed_at timestamptz not null default now(),
  price_amount numeric(12,2),
  price_display text,
  currency_code char(3) not null,
  stock_status offer_stock_status not null default 'unknown',
  rating numeric(3,2),
  reviews_count integer,
  source_search_id uuid references public.product_searches(id) on delete set null,

  constraint offer_price_history_price_chk
    check (price_amount is null or price_amount >= 0),
  constraint offer_price_history_currency_chk
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint offer_price_history_rating_chk
    check (rating is null or (rating >= 0 and rating <= 5)),
  constraint offer_price_history_reviews_chk
    check (reviews_count is null or reviews_count >= 0)
);

create index if not exists offer_price_history_offer_observed_idx
  on public.offer_price_history (offer_id, observed_at desc);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlists_name_not_blank_chk
    check (length(trim(name)) > 0)
);

-- One default wishlist per user
create unique index if not exists wishlists_one_default_per_user_uidx
  on public.wishlists (user_id)
  where is_default = true;

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_product_id uuid not null references public.catalog_products(id) on delete restrict,
  selected_match_id uuid references public.search_matches(id) on delete set null,

  title_override text,
  note text,
  target_price_amount numeric(12,2),
  target_currency_code char(3),
  status wishlist_item_status not null default 'active',

  preferred_offer_id uuid references public.product_offers(id) on delete set null,
  best_offer_id uuid references public.product_offers(id) on delete set null,

  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint wishlist_items_target_price_chk
    check (target_price_amount is null or target_price_amount >= 0),
  constraint wishlist_items_target_currency_chk
    check (target_currency_code is null or target_currency_code ~ '^[A-Z]{3}$'),
  constraint wishlist_items_unique_per_wishlist_product
    unique (wishlist_id, catalog_product_id)
);

create index if not exists wishlist_items_user_status_idx
  on public.wishlist_items (user_id, status);

create index if not exists wishlist_items_best_offer_idx
  on public.wishlist_items (best_offer_id);

-- Map a wishlist item to all tracked offers for the same product.
-- Lets the user keep multiple sources and still compute best deal.
create table if not exists public.wishlist_item_offers (
  wishlist_item_id uuid not null references public.wishlist_items(id) on delete cascade,
  offer_id uuid not null references public.product_offers(id) on delete cascade,
  is_user_selected boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (wishlist_item_id, offer_id)
);

create index if not exists wishlist_item_offers_offer_idx
  on public.wishlist_item_offers (offer_id);

-- Refresh / tracking jobs for background price updates
create table if not exists public.offer_refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.product_offers(id) on delete cascade,
  run_after timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  success boolean,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists offer_refresh_jobs_pending_idx
  on public.offer_refresh_jobs (run_after)
  where started_at is null;
