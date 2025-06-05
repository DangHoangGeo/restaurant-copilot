INSERT INTO categories (restaurant_id, name_ja, name_en, name_vi, position)
VALUES
  ('<RESTAURANT_ID>', '前菜', 'Appetizers', 'Khai vị', 0),
  ('<RESTAURANT_ID>', '主菜', 'Main Dishes', 'Món chính', 1),
  ('<RESTAURANT_ID>', 'デザート', 'Desserts', 'Tráng miệng', 2);

-- Dummy data for a Vietnamese restaurant
INSERT INTO menu_items (
  restaurant_id, category_id,
  name_ja, name_en, name_vi,
  description_ja, description_en, description_vi,
  price, tags, image_url, stock_level, available, position
) VALUES
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', '43ddc5f0-2142-4d34-9d32-b923b68d8282',
 '生春巻き', 'Fresh Spring Rolls', 'Gỏi cuốn',
 'エビと野菜のさっぱり生春巻き', 'Rice paper rolls with shrimp and vegetables.', 'Cuốn tôm thịt tươi ngon.',
 580, ARRAY['healthy', 'shrimp'], NULL, 10, true, 0
);

-- Main Dishes
INSERT INTO menu_items (
  restaurant_id, category_id,
  name_ja, name_en, name_vi,
  description_ja, description_en, description_vi,
  price, tags, image_url, stock_level, available, position
) VALUES
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', '1883d712-e435-4c4a-beae-276b51a89113',
 'フォー', 'Pho Noodle Soup', 'Phở bò',
 '牛肉入りベトナムの伝統的なフォー', 'Vietnamese rice noodle soup with beef.', 'Phở bò truyền thống với thịt bò.',
 980, ARRAY['noodle', 'beef', 'soup'], NULL, 15, true, 0
);

-- Desserts
INSERT INTO menu_items (
  restaurant_id, category_id,
  name_ja, name_en, name_vi,
  description_ja, description_en, description_vi,
  price, tags, image_url, stock_level, available, position
) VALUES
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', '7dea7885-af28-4f19-b283-0792b623ec65',
 'チェー', 'Che Vietnamese Dessert', 'Chè thập cẩm',
 'ベトナムのミックスデザート', 'Vietnamese mixed bean & jelly dessert.', 'Chè thập cẩm truyền thống Việt Nam.',
 450, ARRAY['sweet', 'vegan'], NULL, 8, true, 0
);