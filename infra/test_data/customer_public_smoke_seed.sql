-- Seed data for the public customer smoke test in CI.
-- The test exercises the public restaurant homepage API and customer session creation flow.

INSERT INTO public.restaurants (
  id,
  name,
  subdomain,
  branch_code,
  default_language,
  timezone,
  currency,
  is_active,
  is_verified,
  onboarded,
  tax,
  address,
  phone,
  email,
  description_en,
  description_ja,
  description_vi,
  hero_title_en,
  hero_title_ja,
  hero_title_vi,
  hero_subtitle_en,
  hero_subtitle_ja,
  hero_subtitle_vi
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Smoke Test Shokudo',
  'smoke-test-branch',
  'smoke-branch',
  'ja',
  'Asia/Tokyo',
  'JPY',
  true,
  true,
  true,
  0.10,
  '1-1-1 Shibuya, Tokyo',
  '+81-3-0000-0000',
  'smoke-branch@example.com',
  'A branch-safe homepage smoke test for CI.',
  'CI 用の公開ページ確認用テスト店舗です。',
  'Nha hang kiem tra giao dien cong khai cho CI.',
  'Smoke Test Specials',
  'スモークテストおすすめ',
  'Mon dac biet kiem thu',
  'Verified against the canonical Supabase foundation.',
  '新しい Supabase 基盤で検証されています。',
  'Duoc kiem tra tren nen tang Supabase chinh thuc.'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  branch_code = EXCLUDED.branch_code,
  default_language = EXCLUDED.default_language,
  timezone = EXCLUDED.timezone,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  is_verified = EXCLUDED.is_verified,
  onboarded = EXCLUDED.onboarded,
  tax = EXCLUDED.tax,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  description_en = EXCLUDED.description_en,
  description_ja = EXCLUDED.description_ja,
  description_vi = EXCLUDED.description_vi,
  hero_title_en = EXCLUDED.hero_title_en,
  hero_title_ja = EXCLUDED.hero_title_ja,
  hero_title_vi = EXCLUDED.hero_title_vi,
  hero_subtitle_en = EXCLUDED.hero_subtitle_en,
  hero_subtitle_ja = EXCLUDED.hero_subtitle_ja,
  hero_subtitle_vi = EXCLUDED.hero_subtitle_vi;

INSERT INTO public.users (
  id,
  restaurant_id,
  email,
  name,
  role
)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'smoke-owner@example.com',
  'Smoke Test Owner',
  'owner'
)
ON CONFLICT (id) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

INSERT INTO public.tables (
  id,
  restaurant_id,
  name,
  status,
  capacity
)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'T1',
  'available',
  4
)
ON CONFLICT (id) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity;

INSERT INTO public.categories (
  id,
  restaurant_id,
  name_ja,
  name_en,
  name_vi,
  position
)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'おすすめ',
  'Chef Specials',
  'Mon dac sac',
  0
)
ON CONFLICT (id) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  name_ja = EXCLUDED.name_ja,
  name_en = EXCLUDED.name_en,
  name_vi = EXCLUDED.name_vi,
  position = EXCLUDED.position;

INSERT INTO public.menu_items (
  id,
  restaurant_id,
  category_id,
  code,
  name_ja,
  name_en,
  name_vi,
  description_ja,
  description_en,
  description_vi,
  price,
  available,
  position,
  is_signature,
  image_url
)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'smoke-pho-signature',
  'スモークフォー',
  'Smoked Pho',
  'Pho xong khoi',
  '公開メニュー確認用の看板料理です。',
  'Signature item used to validate the public menu flow.',
  'Mon chu luc de kiem tra luong menu cong khai.',
  1200,
  true,
  0,
  true,
  'https://images.example.com/smoke-pho.jpg'
)
ON CONFLICT (id) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  category_id = EXCLUDED.category_id,
  code = EXCLUDED.code,
  name_ja = EXCLUDED.name_ja,
  name_en = EXCLUDED.name_en,
  name_vi = EXCLUDED.name_vi,
  description_ja = EXCLUDED.description_ja,
  description_en = EXCLUDED.description_en,
  description_vi = EXCLUDED.description_vi,
  price = EXCLUDED.price,
  available = EXCLUDED.available,
  position = EXCLUDED.position,
  is_signature = EXCLUDED.is_signature,
  image_url = EXCLUDED.image_url;

INSERT INTO public.restaurant_gallery_images (
  id,
  restaurant_id,
  image_url,
  caption,
  alt_text,
  sort_order,
  is_hero
)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  'https://images.example.com/smoke-hero.jpg',
  'Hero image for the customer smoke test',
  'Smoke test hero image',
  0,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  image_url = EXCLUDED.image_url,
  caption = EXCLUDED.caption,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  is_hero = EXCLUDED.is_hero;
