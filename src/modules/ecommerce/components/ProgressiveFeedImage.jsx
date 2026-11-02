import React, { useState, useEffect, useRef } from 'react';

export default function ProgressiveFeedImage({
  src,
  alt = '',
  className = '',
  style = {},
  fallbackSrc = '',
  priority = false
}) {
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (priority || shouldLoad) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '250px 0px' } // Pre-calentar 250px antes de entrar a la vista
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  const targetSrc = hasError ? fallbackSrc : src;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-zinc-950 ${className}`}
      style={style}
    >
      {/* Skeleton / Placeholder mientras no entra al viewport o descarga */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black animate-pulse z-0" />
      )}

      {shouldLoad && targetSrc && (
        <img
          ref={imgRef}
          src={targetSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!hasError && fallbackSrc) {
              setHasError(true);
            } else {
              setIsLoaded(true);
            }
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
