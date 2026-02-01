import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Fetch all images from Supabase
    const { data: images, error } = await supabase
      .from('images')
      .select('url');

    if (error) {
      console.error("Supabase error:", error);
      return new Response(null, { status: 500 });
    }

    // Check if we have any images
    if (!images || images.length === 0) {
      return new Response(null, { status: 404 });
    }

    // Pick a random image
    const randomIndex = Math.floor(Math.random() * images.length);
    const image = images[randomIndex].url;

    // Redirect to the image URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: image,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(null, { status: 500 });
  }
}
