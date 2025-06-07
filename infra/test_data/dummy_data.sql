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

INSERT INTO menu_items (
  restaurant_id, category_id,
  name_ja, name_en, name_vi,
  description_ja, description_en, description_vi,
  price, tags, image_url, stock_level, available, position
) VALUES
-- Bánh flan (Vietnamese caramel pudding)
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', '7dea7885-af28-4f19-b283-0792b623ec65',
 'バインフラン', 'Vietnamese Caramel Flan', 'Bánh flan',
 'カラメルソースがかかったベトナム風プリン', 'Vietnamese-style caramel custard pudding.', 'Bánh flan truyền thống với caramel.',
 320, ARRAY['sweet', 'egg', 'pudding'], NULL, 10, true, 1
),

-- Xôi xoài (Mango sticky rice)
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', '7dea7885-af28-4f19-b283-0792b623ec65',
 'マンゴースティッキーライス', 'Mango Sticky Rice', 'Xôi xoài',
 'ココナッツミルクとマンゴーのもち米デザート', 'Sticky rice with coconut milk and fresh mango.', 'Xôi nếp dẻo với xoài tươi và nước cốt dừa.',
 480, ARRAY['sweet', 'rice', 'fruit'], NULL, 8, true, 2
);

INSERT INTO tables (restaurant_id, name, position_x, position_y, qr_code)
VALUES
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e', 'T01', 10, 15, 'qr_code_1'),
('9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e','T02', 20, 25, 'qr_code_2');


-- Insert an order
INSERT INTO orders (restaurant_id, table_id, session_id, status)
VALUES (
  '9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e',
  '54b8473b-789d-4242-af75-cba02db21783',
  '44444444-4444-4444-4444-444444444444',
  'new'
);

INSERT INTO order_items (restaurant_id, order_id, menu_item_id, quantity, notes)
VALUES 
(
  '9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e',
  '7deafa3f-b5fc-4d47-bdaa-5b79700796e2',
  '1c176dac-3761-4245-b382-80a0d4bbacc2',
  2,
  'Less spicy'
),
(
  '9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e',
  '7deafa3f-b5fc-4d47-bdaa-5b79700796e2',
  '5578f128-3e2b-44e3-bde1-33d5b0d36050',
  1,
  'Extra sauce'
);