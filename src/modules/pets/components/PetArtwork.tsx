import React, { useState } from 'react';
import { PawPrint } from 'lucide-react';

interface PetArtworkProps {
  src: string | null;
  name: string;
  className?: string;
  muted?: boolean;
  loading?: 'eager' | 'lazy';
}

export const PetArtwork: React.FC<PetArtworkProps> = ({
  src,
  name,
  className = '',
  muted = false,
  loading = 'eager',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <div className={`overflow-hidden bg-amber-50 ${muted ? 'opacity-80 saturate-75' : ''} ${className}`}>
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
          <PawPrint className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};
