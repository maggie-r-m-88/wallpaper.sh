"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------
   Utilities for tags & metadata
------------------------------ */
function getDisplayTags(categories: string[] = []) {
  return categories
    .filter((c) =>
      !c.match(
        /(images from|photographs by|taken with|featured pictures|files with|information field)/i
      )
    )
    .map((c) =>
      c
        .replace(/_/g, " ")
        .replace(/\s*\(.*?\)/g, "")
        .replace(/^Images of /i, "")
        .trim()
    );
}

function Meta({ label, value, url }: { label: string; value: string | null; url?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase text-gray-400 tracking-wide">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-gray-700">{value}</span>
      )}
    </div>
  );
}

function TagsMeta({ categories }: { categories: string[] | null }) {
  if (!categories?.length) return null;
  const MAX = 6;
  const allTags = getDisplayTags(categories);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? allTags : allTags.slice(0, MAX);
  const remaining = allTags.length - MAX;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase text-gray-400 tracking-wide">Tags</span>
      <div className="flex flex-wrap gap-2">
        {visible.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {tag}
          </span>
        ))}
        {!expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------
   Main Component
------------------------------ */
export default function HomeExplore() {
  const [hero, setHero] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details'|'about'|'tags'>('details');

  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch("/api/featured/home?limit=5&heroSize=2000&gridSize=1300", { cache: "no-store" });
        const data = await res.json();
        setHero(data.hero);
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
              <button
                className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'details' ? 'text-gray-900 border-gray-900' : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
                onClick={() => setActiveTab('details')}
              >Details</button>
              <button
                className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'about' ? 'text-gray-900 border-gray-900' : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
                onClick={() => setActiveTab('about')}
              >About</button>
              <button
                className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'tags' ? 'text-gray-900 border-gray-900' : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
                onClick={() => setActiveTab('tags')}
              >Tags</button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'about' && <p className="text-lg text-gray-700 leading-relaxed">{hero.description}</p>}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-sm text-gray-600">
                <Meta label="Artist" value={hero.artist} />
                <Meta label="Date" value={hero.date} />
                <Meta label="Source" value={hero.source} />
                <Meta label="License" value={hero.license_name} url={hero.license_url} />
                <Meta label="Dimensions" value={`${hero.width} × ${hero.height}`} />
                <Meta label="Format" value={hero.mime} />
                <Meta label="Owner" value={hero.owner} />
              </div>
            )}
            {activeTab === 'tags' && <TagsMeta categories={hero.categories} />}
          </div>
        </div>
      )}

      {/* ---------------- Grid Images ---------------- */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light mb-3 text-gray-900">Explore the collection</h2>
        <p className="text-gray-600">Thousands of curated images and growing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredImage && (
          <Link href={`/image/${featuredImage.id}`} className="md:col-span-2 md:row-span-2">
            <div className="grid-item rounded-lg overflow-hidden shadow-md bg-white relative group cursor-pointer h-full transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="relative h-full min-h-96 bg-gray-100">
                <Image
                  src={featuredImage.url}
                  alt={featuredImage.description || ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/60 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white">
                    <p className="text-xl font-medium mb-1">{featuredImage.description}</p>
                    <p className="text-gray-200">{featuredImage.owner} · {featuredImage.source}</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {smallImages.map((image) => (
          <Link key={image.id} href={`/image/${image.id}`}>
            <div className="grid-item rounded-lg overflow-hidden shadow-md bg-white relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] bg-gray-100">
                <Image
                  src={image.url}
                  alt={image.description || ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/60 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white">
                    <p className="text-sm font-medium line-clamp-1">{image.description}</p>
                    <p className="text-xs text-gray-200 line-clamp-1">{image.owner}</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* CTA Card */}
        <Link
          href="/browse"
          className="grid-item rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center cursor-pointer hover:from-gray-800 hover:to-gray-600 transition-all group"
        >
          <div className="text-center text-white p-6">
            <p className="text-3xl font-light mb-2">1,000+</p>
            <p className="text-sm mb-3">curated images</p>
            <p className="text-xs text-gray-300 group-hover:text-white transition-colors">
              Browse collection →
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
