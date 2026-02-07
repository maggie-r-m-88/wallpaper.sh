"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Meta from "./Meta";
import TagsMeta from "./TagsMeta";
import ImageGrid from "./HomeFeaturedGrid";

interface ImageData {
  id: string | number;
  url: string;
  description?: string;
  title?: string;
  artist?: string;
  date?: string;
  source?: string;
  license_name?: string;
  license_url?: string;
  width?: number;
  height?: number;
  mime?: string;
  owner?: string;
  categories?: string[];
}

export default function HomeExplore() {
  const [hero, setHero] = useState<ImageData | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "about" | "tags">("details");

  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch("/api/featured/home?limit=5&heroSize=2000&gridSize=1300", { cache: "no-store" });
        const data = await res.json();
        setHero(data.hero || null);
        setImages(data.images || []);
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h2 className="text-3xl font-light mb-3 text-gray-900">Explore the collection</h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </section>
    );
  }

  const [featuredImage, ...smallImages] = images;

  return (
    <section className="w-full">
      {/* ---------------- Hero Image ---------------- */}
      {hero && (
        <div className="bg-white rounded-lg overflow-hidden shadow-md mb-24">
          <div className="relative w-full h-[600px] bg-gray-100">
            <div className="absolute top-6 left-6 bg-white/95 px-4 py-2 rounded text-sm font-medium text-gray-700 backdrop-blur-sm">
              Featured Image
            </div>
            <Image
              src={hero.url}
              alt={hero.description || hero.title || ""}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          <div className="border-b border-gray-200">
            <div className="flex gap-8 px-8">
              {["details", "about", "tags"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as "details" | "about" | "tags")}
                  className={`py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab ? "text-gray-900 border-gray-900" : "text-gray-600 border-transparent"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === "about" && <p className="text-lg text-gray-700 leading-relaxed">{hero.description}</p>}
            {activeTab === "details" && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-sm text-gray-600">
                <Meta label="Artist" value={hero.artist || null} />
                <Meta label="Date" value={hero.date || null} />
                <Meta label="Source" value={hero.source || null} />
                <Meta label="License" value={hero.license_name || null} url={hero.license_url || undefined} />
                <Meta label="Dimensions" value={hero.width && hero.height ? `${hero.width} × ${hero.height}` : null} />
                <Meta label="Format" value={hero.mime || null} />
                <Meta label="Owner" value={hero.owner || null} />
              </div>
            )}
            {activeTab === "tags" && <TagsMeta categories={hero.categories || []} />}
          </div>
        </div>
      )}

      {/* ---------------- Grid Images ---------------- */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light mb-3 text-gray-900">Explore the collection</h2>
        <p className="text-gray-600">Thousands of curated images and growing</p>
      </div>

      <ImageGrid featuredImage={featuredImage || null} images={smallImages} />
    </section>
  );
}
