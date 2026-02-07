"use client";

import Link from "next/link";
import Image from "next/image";

interface ImageData {
  id: string | number;
  url: string;
  description?: string;
  owner?: string;
  source?: string;
}

interface ImageGridProps {
  featuredImage?: ImageData | null;
  images: ImageData[];
}

export default function ImageGrid({ featuredImage, images }: ImageGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Large featured image in grid */}
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

      {/* Small grid images */}
      {images.map((image) => (
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
  );
}
