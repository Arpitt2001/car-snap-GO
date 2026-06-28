import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';

export function useLocationTracker() {
  const { updateStats } = useGame();
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const lastTime = useRef<number>(Date.now());
  const watchIdRef = useRef<number | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const requestLocation = () => {
    setPermissionError(null);
    if ('geolocation' in navigator) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      // Try to get current position first to trigger prompt immediately
      navigator.geolocation.getCurrentPosition(
        () => {
          // Success, now watch
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const newPos = { lat: latitude, lng: longitude };
              setCurrentPosition(newPos);
              setIsActive(true);

              const now = Date.now();
              const timeDiff = (now - lastTime.current) / 1000; // seconds

              if (lastPosition.current) {
                const distance = calculateDistance(
                  lastPosition.current.lat,
                  lastPosition.current.lng,
                  newPos.lat,
                  newPos.lng
                );
                
                // Only update if moved more than 2 meters and less than 1km (filtering crazy jumps)
                if (distance > 0.002 && distance < 1) {
                   if (distance > 0.01) {
                      // Fetch route for accurate path
                      fetch(`https://router.project-osrm.org/route/v1/driving/${lastPosition.current.lng},${lastPosition.current.lat};${newPos.lng},${newPos.lat}?overview=full&geometries=geojson`)
                        .then(res => res.json())
                        .then(data => {
                           if (data.routes && data.routes[0] && data.routes[0].geometry) {
                              const routePoints = data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                              updateStats(distance, timeDiff, routePoints);
                           } else {
                              updateStats(distance, timeDiff, [newPos]);
                           }
                        })
                        .catch(() => updateStats(distance, timeDiff, [newPos]));
                   } else {
                      updateStats(distance, timeDiff, [newPos]);
                   }
                } else if (timeDiff > 10) {
                    // just update time if standing still for 10s
                    updateStats(0, timeDiff, [newPos]);
                }
              } else {
                 // First position
                 updateStats(0, 0, [newPos]);
              }

              if (timeDiff > 10 || (lastPosition.current && calculateDistance(lastPosition.current.lat, lastPosition.current.lng, newPos.lat, newPos.lng) > 0.002)) {
                  lastPosition.current = newPos;
                  lastTime.current = now;
              }
            },
            (error) => {
              console.warn('Geolocation error:', error);
              setPermissionError(error.message);
              setIsActive(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        },
        (error) => {
           console.warn('Geolocation prompt error:', error);
           setPermissionError(error.message || 'Location access denied');
           setIsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
       setPermissionError("Geolocation not supported by this browser.");
    }
  };

  useEffect(() => {
    // Auto-start on mount
    requestLocation();
    
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [updateStats]);

  return { currentPosition, permissionError, requestLocation, isActive };
}
