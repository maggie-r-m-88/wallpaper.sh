"use client";

import { useEffect, useState } from "react";

function getDisplayTags(categories) {
  if (!Array.isArray(categories)) return [];

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


function Meta({ label = null, value = null, url = null }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase text-gray-400 tracking-wide">{label}</span>
            {/* if url is present, make value a link */}
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


function TagsMeta({ categories }) {
  if (!categories?.length) return null;

  const MAX = 6;
  const allTags = getDisplayTags(categories);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? allTags : allTags.slice(0, MAX);
  const remaining = allTags.length - MAX;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase text-gray-400 tracking-wide">
        Tags
      </span>

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

export default function Home() {
    const [image, setImage] = useState(null);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        fetch("/api/wallpaper?format=json")
            .then((res) => res.json())
            .then(setImage)
            .catch(console.error);
    }, []);

    if (!image) return null; // or a skeleton

    return (
        <section className="max-w-7xl mx-auto px-8 w-full">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-16">
                <div className="relative w-full h-[600px] bg-gray-100">
                    <div className="absolute top-6 left-6 bg-white/95 px-4 py-2 rounded text-sm font-medium text-gray-700 backdrop-blur-sm">
                    Featured Image
                    </div>

                    <img
                        src={image.url}
                        alt={image.description || image.title}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="border-b border-gray-200">
                    <div className="flex gap-8 px-8">
                        <button
                            className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'details'
                                    ? 'text-gray-900 border-gray-900'
                                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                            }`}
                            onClick={() => setActiveTab('details')}
                        >
                            Details
                        </button>
                                                <button
                            className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'about'
                                    ? 'text-gray-900 border-gray-900'
                                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                            }`}
                            onClick={() => setActiveTab('about')}
                        >
                            About
                        </button>
                        <button
                            className={`py-4 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === 'tags'
                                    ? 'text-gray-900 border-gray-900'
                                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                            }`}
                            onClick={() => setActiveTab('tags')}
                        >
                            Tags
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    {activeTab === 'about' && (
                        <div>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                {image.description}
                            </p>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-sm text-gray-600">
                            <Meta label="Artist" value={image.artist} />
                            <Meta label="Date" value={image.date} />
                            <Meta label="Source" value={image.source} />
                            <Meta label="License" value={image.license_name} url={image.license_url} />
                            <Meta label="Dimensions" value={`${image.width} × ${image.height}`} />
                            <Meta label="Format" value={image.mime} />
                            <Meta label="Owner" value={image.owner} />
                        </div>
                    )}

                    {activeTab === 'tags' && (
                        <TagsMeta categories={image.categories} />
                    )}
                </div>
            </div>
        </section>
    );
}
