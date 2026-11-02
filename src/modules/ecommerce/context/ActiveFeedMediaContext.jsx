import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const ActiveFeedMediaContext = createContext({
  activeMediaId: null,
  setActiveMedia: () => {},
  clearActiveMedia: () => {},
  isMutedGlobal: false,
  toggleMutedGlobal: () => {},
  setMutedGlobal: () => {}
});

export const ActiveFeedMediaProvider = ({ children }) => {
  const [activeMediaId, setActiveMediaId] = useState(null);
  const [isMutedGlobal, setIsMutedGlobal] = useState(false);
  const currentVideoRef = useRef(null);

  const setActiveMedia = useCallback((id, videoEl) => {
    // Si ya hay un video reproduciéndose y es diferente, pausarlo de inmediato
    if (currentVideoRef.current && currentVideoRef.current !== videoEl) {
      try {
        currentVideoRef.current.pause();
      } catch (e) {}
    }

    setActiveMediaId(id);
    currentVideoRef.current = videoEl;

    // Reproducir atómicamente el video enfocado
    if (videoEl) {
      videoEl.muted = isMutedGlobal;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si el navegador bloquea autoplay con sonido, reintentar silenciado
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
      }
    }
  }, [isMutedGlobal]);

  const clearActiveMedia = useCallback((id) => {
    if (activeMediaId === id) {
      if (currentVideoRef.current) {
        try {
          currentVideoRef.current.pause();
        } catch (e) {}
      }
      currentVideoRef.current = null;
      setActiveMediaId(null);
    }
  }, [activeMediaId]);

  const toggleMutedGlobal = useCallback(() => {
    setIsMutedGlobal(prev => {
      const next = !prev;
      if (currentVideoRef.current) {
        currentVideoRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const setMutedGlobal = useCallback((val) => {
    setIsMutedGlobal(val);
    if (currentVideoRef.current) {
      currentVideoRef.current.muted = val;
    }
  }, []);

  return (
    <ActiveFeedMediaContext.Provider
      value={{
        activeMediaId,
        setActiveMedia,
        clearActiveMedia,
        isMutedGlobal,
        toggleMutedGlobal,
        setMutedGlobal
      }}
    >
      {children}
    </ActiveFeedMediaContext.Provider>
  );
};

export const useActiveFeedMedia = () => useContext(ActiveFeedMediaContext);
export default ActiveFeedMediaContext;
