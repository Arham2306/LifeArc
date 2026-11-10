import React, { useState } from 'react';
import { Home } from 'lucide-react';

interface PropertyArtworkProps {
  src: string | null;
  name: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export const PropertyArtwork: React.FC<PropertyArtworkProps> = ({
  src,
  name,
  className = '',
  loading = 'eager',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <div className={`overflow-hidden bg-sky-100 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading={loading}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sky-900" role="img" aria-label={name}>
          <Home className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};
