CREATE OR REPLACE FUNCTION get_item_counts_for_categories(p_category_ids uuid[])
RETURNS TABLE (
    category_id uuid,
    item_count bigint
)
LANGUAGE sql
AS $$
    SELECT
        mi.category_id,
        COUNT(mi.id) as item_count
    FROM
        menu_items mi
    WHERE
        mi.category_id = ANY(p_category_ids)
    GROUP BY
        mi.category_id;
$$;
