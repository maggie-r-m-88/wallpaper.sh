import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/* --------------------------------------------------
   GET - Featured Hero + Grid Images
--------------------------------------------------- */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 5); // number of grid images
    const heroSize = Number(searchParams.get("heroSize") || 2000);
    const gridSize = Number(searchParams.get("gridSize") || 1300);

    /* ------------------------------
       1️⃣ Fetch hero image
    ------------------------------ */
    const { data: heroData, error: heroError } = await supabase
      .from("images")
      .select("*")
      .eq("featured", true)
      .order("added_at", { ascending: false })
      .limit(1)
      .single();

    if (heroError) {
      console.error("Supabase hero fetch error:", heroError);
    }

    /* ------------------------------
       2️⃣ Fetch other random/grid images (excluding hero)
    ------------------------------ */
    const heroId = heroData?.id || null;

    const { data: gridData, error: gridError } = await supabase
      .rpc("get_random_images", { limit_count: limit + 5 }) // fetch extra in case hero overlaps
      .then(({ data, error }) => ({ data, error }));

    if (gridError) {
      console.error("Supabase grid fetch error:", gridError);
    }

    // Remove hero from grid
    const filteredGrid = (gridData || [])
      .filter((img) => img.id !== heroId)
      .slice(0, limit);

    /* ------------------------------
       3️⃣ Transform Wikimedia URLs if needed
    ------------------------------ */
    const transformThumbnail = (img: any, size: number) => {
      if (!img.url.includes("upload.wikimedia.org")) return img;
      const match = img.url.match(/\/wikipedia\/commons\/([0-9a-zA-Z])\/([0-9a-zA-Z]+)\/(.+)$/i);
      if (!match) return img;
      const [_, firstLetter, subfolder, filename] = match;
      const thumbUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${firstLetter}/${subfolder}/${filename}/${size}px-${filename}`;
      return { ...img, url: thumbUrl };
    };

    const hero = heroData ? transformThumbnail(heroData, heroSize) : null;
    const grid = filteredGrid.map((img) => transformThumbnail(img, gridSize));

    return NextResponse.json(
      { hero, images: grid },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to read images" },
      { status: 500 }
    );
  }
}
