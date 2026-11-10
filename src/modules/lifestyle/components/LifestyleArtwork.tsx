import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface LifestyleArtworkProps {
  src: string | null;
  name: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export const LifestyleArtwork: React.FC<LifestyleArtworkProps> = ({
  src,
  name,
  className = '',
  loading = 'eager',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <div className={`overflow-hidden bg-amber-50 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading={loading}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-amber-900" role="img" aria-label={name}>
          <BookOpen className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};
