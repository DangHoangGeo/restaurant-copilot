CREATE OR REPLACE FUNCTION get_top_seller_for_day(p_restaurant_id uuid, p_date text)
RETURNS TABLE (
    name_en TEXT,
    name_ja TEXT,
    name_vi TEXT,
    total_sold BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
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
        o.created_at::date = p_date::date
    GROUP BY
        mi.id,
        mi.name_en,
        mi.name_ja,
        mi.name_vi
    ORDER BY
        total_sold DESC
    LIMIT 1;
END;
$$;
