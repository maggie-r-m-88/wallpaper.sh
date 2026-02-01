import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - List all images
export async function GET() {
  try {
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to read images" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { images: images || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to read images" },
      { status: 500 }
    );
  }
}

// POST - Add new image
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newImage = {
      url: body.url,
      title: body.title || null,
      added_at: new Date().toISOString(),
      source: body.source || null,
      attribution: body.attribution || null,
      width: body.width || null,
      height: body.height || null,
      mime: body.mime || null,
      license_name: body.license_name || null,
      license_url: body.license_url || null,
      categories: body.categories || null,
      description: body.description || null,
      taken_at: body.taken_at || null,
    };

    const { data, error } = await supabase
      .from('images')
      .insert([newImage])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to add image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, image: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to add image" },
      { status: 500 }
    );
  }
}

// PUT - Update image
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...imageData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('images')
      .update(imageData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, image: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }
}

// DELETE - Remove image by URL
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    console.log("DELETE request - url:", url);

    if (!url) {
      console.log("Invalid request - no URL provided");
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('images')
      .delete()
      .eq('url', url)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }

    if (!data) {
      console.log("Image not found with URL:", url);
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    console.log("Successfully deleted:", data.url);
    return NextResponse.json({ success: true, deleted: data });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

