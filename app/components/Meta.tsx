"use client";

interface MetaProps {
  label: string;
  value: string | null;
  url?: string;
}

export default function Meta({ label, value, url }: MetaProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase text-gray-400 tracking-wide">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-gray-700">{value}</span>
      )}
    </div>
  );
}
