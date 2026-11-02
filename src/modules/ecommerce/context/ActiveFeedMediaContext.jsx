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
  const activeMediaIdRef = useRef(null);
  const isMutedGlobalRef = useRef(false);

  activeMediaIdRef.current = activeMediaId;
  isMutedGlobalRef.current = isMutedGlobal;

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
      videoEl.muted = isMutedGlobalRef.current;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si el navegador bloquea autoplay con sonido, reintentar silenciado
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
      }
    }
  }, []);

  const clearActiveMedia = useCallback((id) => {
    if (activeMediaIdRef.current === id) {
      if (currentVideoRef.current) {
        try {
          currentVideoRef.current.pause();
        } catch (e) {}
      }
      currentVideoRef.current = null;
      setActiveMediaId(null);
    }
  }, []);

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
