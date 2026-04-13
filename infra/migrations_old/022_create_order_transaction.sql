-- Create transactional order creation function
-- This function handles the entire order creation process atomically,
-- including validation, price calculation, and insertion of order + order items

CREATE OR REPLACE FUNCTION create_order(
    p_restaurant_id uuid,
    p_table_id uuid,
    p_guest_count integer,
    p_items jsonb
)
RETURNS TABLE (
    order_id uuid,
    total_amount numeric,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id uuid;
    v_total_amount numeric := 0;
    v_item jsonb;
    v_menu_item RECORD;
    v_size_price numeric := 0;
    v_toppings_price numeric := 0;
    v_item_price numeric;
    v_session_id uuid;
BEGIN
    -- Generate IDs
    v_order_id := gen_random_uuid();
    v_session_id := gen_random_uuid();
    
    -- Validate that table belongs to restaurant
    IF NOT EXISTS (
        SELECT 1 FROM tables 
        WHERE id = p_table_id AND restaurant_id = p_restaurant_id
    ) THEN
        RAISE EXCEPTION 'Table not found or does not belong to restaurant';
    END IF;

    -- Process each item and calculate total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Validate menu item belongs to restaurant
        SELECT price, name_en, name_ja, name_vi 
        INTO v_menu_item
        FROM menu_items 
        WHERE id = (v_item->>'menu_item_id')::uuid 
            AND restaurant_id = p_restaurant_id;
            
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item % not found or does not belong to restaurant', v_item->>'menu_item_id';
        END IF;

        -- Start with base price
        v_item_price := v_menu_item.price;
        v_size_price := 0;
        v_toppings_price := 0;

        -- Add size price if specified (size price replaces base price)
        IF v_item ? 'menu_item_size_id' AND v_item->>'menu_item_size_id' IS NOT NULL THEN
            SELECT price INTO v_size_price
            FROM menu_item_sizes 
            WHERE id = (v_item->>'menu_item_size_id')::uuid 
                AND restaurant_id = p_restaurant_id;
                
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Menu item size % not found or does not belong to restaurant', v_item->>'menu_item_size_id';
            END IF;
            
            v_item_price := v_size_price;
        END IF;

        -- Add toppings price if specified
        IF v_item ? 'topping_ids' AND jsonb_array_length(v_item->'topping_ids') > 0 THEN
            SELECT COALESCE(SUM(price), 0) INTO v_toppings_price
            FROM toppings 
            WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_item->'topping_ids'))::uuid[])
                AND restaurant_id = p_restaurant_id;
                
            -- Verify all toppings were found
            IF (SELECT COUNT(*) FROM toppings 
                WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_item->'topping_ids'))::uuid[])
                    AND restaurant_id = p_restaurant_id) != jsonb_array_length(v_item->'topping_ids') THEN
                RAISE EXCEPTION 'One or more toppings not found or do not belong to restaurant';
            END IF;
            
            v_item_price := v_item_price + v_toppings_price;
        END IF;

        -- Add to total amount
        v_total_amount := v_total_amount + (v_item_price * (v_item->>'quantity')::integer);
    END LOOP;

    -- Create the order
    INSERT INTO orders (
        id,
        restaurant_id,
        table_id,
        session_id,
        guest_count,
        status,
        total_amount,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        p_restaurant_id,
        p_table_id,
        v_session_id,
        p_guest_count,
        'new',
        v_total_amount,
        NOW(),
        NOW()
    );

    -- Create order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Recalculate price for this item (same logic as above)
        SELECT price INTO v_item_price FROM menu_items 
        WHERE id = (v_item->>'menu_item_id')::uuid AND restaurant_id = p_restaurant_id;
        
        -- Handle size price
        IF v_item ? 'menu_item_size_id' AND v_item->>'menu_item_size_id' IS NOT NULL THEN
            SELECT price INTO v_size_price FROM menu_item_sizes 
            WHERE id = (v_item->>'menu_item_size_id')::uuid AND restaurant_id = p_restaurant_id;
            v_item_price := v_size_price;
        END IF;

        -- Handle toppings price
        IF v_item ? 'topping_ids' AND jsonb_array_length(v_item->'topping_ids') > 0 THEN
            SELECT COALESCE(SUM(price), 0) INTO v_toppings_price FROM toppings 
            WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_item->'topping_ids'))::uuid[])
                AND restaurant_id = p_restaurant_id;
            v_item_price := v_item_price + v_toppings_price;
        END IF;

        INSERT INTO order_items (
            id,
            restaurant_id,
            order_id,
            menu_item_id,
            quantity,
            notes,
            menu_item_size_id,
            topping_ids,
            price_at_order,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            p_restaurant_id,
            v_order_id,
            (v_item->>'menu_item_id')::uuid,
            (v_item->>'quantity')::integer,
            v_item->>'notes',
            CASE WHEN v_item ? 'menu_item_size_id' THEN (v_item->>'menu_item_size_id')::uuid ELSE NULL END,
            CASE WHEN v_item ? 'topping_ids' THEN v_item->'topping_ids' ELSE NULL END,
            v_item_price,
            'new',
            NOW(),
            NOW()
        );
    END LOOP;

    -- Return order details
    RETURN QUERY
    SELECT v_order_id, v_total_amount, NOW();
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION create_order(uuid, uuid, integer, jsonb) IS 
'Atomically creates an order with validation and price calculation. Input format: [{"menu_item_id":"uuid","quantity":1,"notes":"optional","menu_item_size_id":"uuid","topping_ids":["uuid1","uuid2"]}]';