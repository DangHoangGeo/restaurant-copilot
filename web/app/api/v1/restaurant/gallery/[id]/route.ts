import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// PUT - Update a gallery image
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { caption, alt_text, sort_order, is_hero } = body;

    if (!id) {
      return NextResponse.json({ error: "missing_image_id" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (caption !== undefined) updateData.caption = caption;
    if (alt_text !== undefined) updateData.alt_text = alt_text;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_hero !== undefined) updateData.is_hero = is_hero;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "no_fields_to_update" },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data: image, error } = await supabaseAdmin
      .from("restaurant_gallery_images")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating gallery image:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json({ error: "image_not_found" }, { status: 404 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error in gallery PUT:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a gallery image
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "missing_image_id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("restaurant_gallery_images")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting gallery image:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in gallery DELETE:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
