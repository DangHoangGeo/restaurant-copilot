CREATE OR REPLACE FUNCTION get_top_sellers_7days(p_restaurant_id uuid, p_limit int)
RETURNS TABLE (
    menu_item_id UUID,
    name_en TEXT,
    name_ja TEXT,
    name_vi TEXT,
    total_sold BIGINT
)
LANGUAGE sql
AS $$
    SELECT
        oi.menu_item_id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi,
        SUM(oi.quantity) AS total_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        menu_items mi ON oi.menu_item_id = mi.id
    WHERE
        o.restaurant_id = p_restaurant_id AND
        o.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY
        oi.menu_item_id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT
        p_limit;
$$;
