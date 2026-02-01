import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const IMAGES_PATH = path.join(process.cwd(), "data", "images.json");

interface Image {
  url: string;
  title: string;
  addedAt: string;
  source: string;
  attribution: string;
}

async function readImages(): Promise<Image[]> {
  console.log("Reading from:", IMAGES_PATH);
  const data = await fs.readFile(IMAGES_PATH, "utf-8");
  const parsed = JSON.parse(data);
  console.log("Read", parsed.length, "images from file");
  return parsed;
}

async function writeImages(data: Image[]): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  console.log("Writing to:", IMAGES_PATH);
  console.log("Writing", data.length, "images");
  await fs.writeFile(IMAGES_PATH, jsonString, "utf-8");
  console.log("Write completed successfully");

  // Verify the write
  const verification = await fs.readFile(IMAGES_PATH, "utf-8");
  const verifiedData = JSON.parse(verification);
  console.log("Verified:", verifiedData.length, "images in file");
}

// GET - List all images
export async function GET() {
  try {
    const images = await readImages();
    return NextResponse.json(
      { images },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
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
    const images = await readImages();

    const newImage: Image = {
      url: body.url,
      title: body.title || "",
      addedAt: new Date().toISOString(),
      source: body.source || "",
      attribution: body.attribution || "",
    };

    images.push(newImage);
    await writeImages(images);

    return NextResponse.json({ success: true, image: newImage });
  } catch (error) {
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
    const { index, ...imageData } = body;

    const images = await readImages();

    if (index < 0 || index >= images.length) {
      return NextResponse.json(
        { error: "Invalid index" },
        { status: 400 }
      );
    }

    images[index] = {
      ...images[index],
      ...imageData,
    };

    await writeImages(images);

    return NextResponse.json({ success: true, image: images[index] });
  } catch (error) {
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

    const images = await readImages();
    console.log("Total images:", images.length);

    const index = images.findIndex((img) => img.url === url);

    if (index === -1) {
      console.log("Image not found with URL:", url);
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    console.log("Found image at index:", index);
    const deleted = images.splice(index, 1);
    await writeImages(images);

    console.log("Successfully deleted:", deleted[0]?.url);
    return NextResponse.json({ success: true, deleted: deleted[0] });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

