-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bunq_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  bunq_user_id bigint NOT NULL UNIQUE,
  monetary_account_id bigint NOT NULL,
  api_key text NOT NULL,
  private_key_pem text NOT NULL,
  server_public_key text NOT NULL,
  installation_token text NOT NULL,
  device_id bigint NOT NULL,
  session_token text NOT NULL,
  session_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bunq_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT bunq_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.product_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  initial_search_id uuid NOT NULL,
  result_position integer NOT NULL CHECK (result_position > 0),
  title text NOT NULL,
  merchant_name text,
  product_url text NOT NULL CHECK (product_url ~* '^https?://'::text),
  product_image_url text CHECK (product_image_url IS NULL OR product_image_url ~* '^https?://'::text),
  thumbnail_url text CHECK (thumbnail_url IS NULL OR thumbnail_url ~* '^https?://'::text),
  current_price_text text,
  current_price_amount numeric CHECK (current_price_amount IS NULL OR current_price_amount >= 0::numeric),
  currency_code character(3) CHECK (currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$'::text),
  stock_status text,
  in_stock boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT product_candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT product_candidates_initial_search_id_fkey FOREIGN KEY (initial_search_id) REFERENCES public.product_searches(id)
);
CREATE TABLE public.product_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  search_image_id uuid NOT NULL,
  engine text NOT NULL DEFAULT 'google_lens'::text CHECK (engine = 'google_lens'::text),
  search_type text NOT NULL DEFAULT 'products'::text CHECK (search_type = 'products'::text),
  image_url text NOT NULL CHECK (image_url ~* '^https?://'::text),
  language_code text NOT NULL DEFAULT 'en'::text,
  country_code character(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'::text),
  safe_mode text NOT NULL DEFAULT 'active'::text,
  serpapi_search_id text UNIQUE,
  google_lens_url text CHECK (google_lens_url IS NULL OR google_lens_url ~* '^https?://'::text),
  status text NOT NULL DEFAULT 'success'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_searches_pkey PRIMARY KEY (id),
  CONSTRAINT product_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT product_searches_search_image_id_fkey FOREIGN KEY (search_image_id) REFERENCES public.search_images(id)
);
CREATE TABLE public.search_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  image_url text NOT NULL CHECK (image_url ~* '^https?://'::text),
  mime_type text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT search_images_pkey PRIMARY KEY (id),
  CONSTRAINT search_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.wishlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_candidate_id uuid NOT NULL,
  note text,
  on_discount boolean,
  sweet_spot boolean,
  reasoning text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  purchased_at timestamp with time zone,
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT wishlist_items_product_candidate_id_fkey FOREIGN KEY (product_candidate_id) REFERENCES public.product_candidates(id)
);
