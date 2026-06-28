import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGame } from '../context/GameContext';
import { MapPin, Box, Zap, Camera, Layers } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CarCard } from '../types';
import { CarDetailsModal } from './CarDetailsModal';

function MapUpdater({ center, triggerRecenter }: { center: { lat: number; lng: number }, triggerRecenter: number }) {
  const map = useMap();
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    const handleDrag = () => setIsFollowing(false);
    map.on('dragstart', handleDrag);
    return () => {
      map.off('dragstart', handleDrag);
    };
  }, [map]);

  useEffect(() => {
    if (center && triggerRecenter > 0) {
      setIsFollowing(true);
      map.setView([center.lat, center.lng], 17, { animate: true });
    } else if (center && isFollowing) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    } else if (center && triggerRecenter === 0 && isFollowing) {
       map.setView([center.lat, center.lng], 17);
    }
  }, [center, triggerRecenter, map, isFollowing]);
  return null;
}

// Generate random points near a center
const generateNearPoints = (center: { lat: number, lng: number }, count: number, radiusInDeg: number) => {
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      id: Math.random().toString(36).substr(2, 9),
      lat: center.lat + (Math.random() - 0.5) * radiusInDeg,
      lng: center.lng + (Math.random() - 0.5) * radiusInDeg,
    });
  }
  return points;
};

export function GameMap({ center, recenterCounter, selectedPathDate, onModalStateChange }: { center: { lat: number, lng: number }, recenterCounter: number, selectedPathDate?: string | null, onModalStateChange?: (isOpen: boolean) => void }) {
  const { stats, outfit, addXP, cars, addCar } = useGame();
  const navigate = useNavigate();
  
  const filteredPathHistory = useMemo(() => {
    if (!stats.pathHistory) return [];
    if (!selectedPathDate) return stats.pathHistory;
    
    return stats.pathHistory.filter(p => {
       const d = new Date(p.timestamp);
       const y = d.getFullYear();
       const m = String(d.getMonth() + 1).padStart(2, '0');
       const day = String(d.getDate()).padStart(2, '0');
       const dateStr = `${y}-${m}-${day}`;
       return dateStr === selectedPathDate;
    });
  }, [stats.pathHistory, selectedPathDate]);
  
  // Game Data State
  const [collectibles, setCollectibles] = useState<{id: string, lat: number, lng: number}[]>([]);
  const [rareCars, setRareCars] = useState<{id: string, lat: number, lng: number, brand: string, model: string, rarity: 'Legendary' | 'Rare', image: string}[]>([]);
  const [lastGenCenter, setLastGenCenter] = useState<{lat: number, lng: number} | null>(null);
  
  const [isOverlapping, setIsOverlapping] = useState(false);
  useEffect(() => {
    let overlapping = false;
    if (center) {
      const allEntities = [...cars.map(c => c.location).filter(Boolean), ...rareCars, ...collectibles];
      for (const ent of allEntities) {
        if (ent && calculateDistance(center.lat, center.lng, ent.lat, ent.lng) < 15) {
          overlapping = true; break;
        }
      }
    }
    setIsOverlapping(overlapping);
  }, [center, cars, rareCars, collectibles]);

  // Custom Player Avatar Icon
  const playerIcon = useMemo(() => {
    const html = `
      <div class="relative w-12 h-12 flex flex-col items-center -mt-6 -ml-6 transition-transform ${isOverlapping ? 'opacity-40 pointer-events-none' : 'opacity-100 hover:scale-110'}">
         <div class="w-8 h-8 rounded-full border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20 flex items-center justify-center bg-neutral-900" style="background-color: ${outfit.shirtColor}">
            <div class="w-4 h-4 rounded-full" style="background-color: ${outfit.skinColor}"></div>
         </div>
         <div class="absolute top-6 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-white z-10"></div>
         <div class="absolute top-10 w-8 h-2 bg-black/40 rounded-[100%] blur-sm"></div>
      </div>
    `;
    return L.divIcon({ html, className: 'custom-player-marker', iconSize: [0, 0] });
  }, [outfit, isOverlapping]);
  
  // View Toggles
  const [showMarkers, setShowMarkers] = useState(true);
  
  // Encounter UI State
  const [activeEncounter, setActiveEncounter] = useState<any>(null);
  const [captureAnimation, setCaptureAnimation] = useState<any>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedCarForModal, setSelectedCarForModal] = useState<CarCard | null>(null);

  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(!!selectedCarForModal);
    }
  }, [selectedCarForModal, onModalStateChange]);
  
  const [encounterQuestions, setEncounterQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingEncounter, setIsLoadingEncounter] = useState(false);
  const [wrongAnswerState, setWrongAnswerState] = useState(false);
  const [correctAnswerState, setCorrectAnswerState] = useState(false);

  const [encounterStrikes, setEncounterStrikes] = useState(0);
  const [questionsToWin, setQuestionsToWin] = useState(3);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(10);
  
  const showWarning = (msg: string) => {
    setWarning(msg);
    setTimeout(() => setWarning(null), 3000);
  };
  
  // Generate points only once around the initial center
  useEffect(() => {
    if (!center) return;
    
    // Check distance from last generation center
    let shouldGenerate = false;
    if (!lastGenCenter) {
      shouldGenerate = true;
    } else {
      const dLat = center.lat - lastGenCenter.lat;
      const dLng = center.lng - lastGenCenter.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      // Generate new items if player moved more than ~500m
      if (dist > 0.005) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      setCollectibles(generateNearPoints(center, 10, 0.006));
      
      const spawnInitialCars = async () => {
        const C = [
          { brand: 'McLaren', model: 'P1', rarity: 'Legendary' as const },
          { brand: 'Porsche', model: '911 GT3', rarity: 'Legendary' as const },
          { brand: 'Nissan', model: 'GT-R Nismo', rarity: 'Rare' as const },
          { brand: 'Toyota', model: 'Supra', rarity: 'Rare' as const },
          { brand: 'Ferrari', model: 'F40', rarity: 'Legendary' as const },
        ];
        
        const initialCars = [];
        for (let i = 0; i < 3; i++) {
          const car = C[Math.floor(Math.random() * C.length)];
          try {
            const res = await fetch('/api/car-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: `${car.brand} ${car.model}` })
            });
            const data = await res.json();
            
            initialCars.push({
              id: 'initial-' + Date.now() + '-' + i,
              lat: center.lat + (Math.random() - 0.5) * 0.003,
              lng: center.lng + (Math.random() - 0.5) * 0.003,
              brand: car.brand,
              model: car.model,
              rarity: car.rarity,
              image: data.imageUrl || 'https://images.unsplash.com/photo-1621531649987-a2f268b8e0c3?w=800&auto=format&fit=crop',
            });
          } catch (e) {
            // Ignore silently
          }
        }
        
        if (initialCars.length > 0) {
           setRareCars(prev => {
             const combined = [...prev, ...initialCars];
             return combined.slice(0, 3);
           });
        }
      };
      
      spawnInitialCars();
      
      setLastGenCenter(center);
    }
  }, [center, lastGenCenter]);

  // Periodic rare car spawner
  const latestCenterRef = useRef(center);
  useEffect(() => {
    latestCenterRef.current = center;
  }, [center]);

  const rareCarsRef = useRef(rareCars);
  useEffect(() => {
    rareCarsRef.current = rareCars;
  }, [rareCars]);

  useEffect(() => {
    const spawnPeriodicCars = async () => {
      const currentCenter = latestCenterRef.current;
      const currentRareCars = rareCarsRef.current;
      if (!currentCenter) return;
      if (currentRareCars.length >= 3) return;
      
      const carsToSpawn = 3 - currentRareCars.length;
      
      const C = [
        { brand: 'McLaren', model: 'P1', rarity: 'Legendary' as const },
        { brand: 'Porsche', model: '911 GT3', rarity: 'Legendary' as const },
        { brand: 'Nissan', model: 'GT-R Nismo', rarity: 'Rare' as const },
        { brand: 'Toyota', model: 'Supra', rarity: 'Rare' as const },
        { brand: 'Ferrari', model: 'F40', rarity: 'Legendary' as const },
        { brand: 'Lamborghini', model: 'Aventador', rarity: 'Legendary' as const },
        { brand: 'BMW', model: 'M4', rarity: 'Rare' as const },
      ];
      
      const newCars = [];
      for (let i = 0; i < carsToSpawn; i++) {
        const car = C[Math.floor(Math.random() * C.length)];
        try {
          const res = await fetch('/api/car-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${car.brand} ${car.model}` })
          });
          const data = await res.json();
          newCars.push({
            id: 'periodic-' + Date.now() + '-' + i,
            lat: currentCenter.lat + (Math.random() - 0.5) * 0.003,
            lng: currentCenter.lng + (Math.random() - 0.5) * 0.003,
            brand: car.brand,
            model: car.model,
            rarity: car.rarity,
            image: data.imageUrl || 'https://images.unsplash.com/photo-1621531649987-a2f268b8e0c3?w=800&auto=format&fit=crop',
          });
        } catch (e) {
          // fetch failed, likely due to server restart or network issues. Ignore silently.
        }
      }
      
      if (newCars.length > 0) {
        setRareCars(prev => {
          const combined = [...prev, ...newCars];
          return combined.slice(0, 3);
        });
      }
    };

    // Check every 30 seconds if we need to spawn cars to maintain 3
    const interval = setInterval(spawnPeriodicCars, 30000);
    return () => clearInterval(interval);
  }, []);

  const collectibleIcon = useMemo(() => {
    const html = `
      <div class="relative w-8 h-8 flex flex-col items-center -mt-4 -ml-4 cursor-pointer hover:scale-125 transition-transform">
         <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 border-2 border-white shadow-[0_0_15px_rgba(234,179,8,0.8)] z-20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
         </div>
      </div>
    `;
    return L.divIcon({ html, className: 'custom-collectible-marker', iconSize: [0, 0] });
  }, []);

  const getCapturedCarIcon = (carCount: number, color: string, imageUrl: string) => {
    const isStacked = carCount > 1;
    const html = `
      <div class="relative w-12 h-12 flex flex-col items-center -mt-6 -ml-6 cursor-pointer hover:scale-110 transition-transform">
         ${isStacked ? `
         <div class="absolute -top-1 -right-1 w-full h-full rounded-full border-2 border-white/50 z-10 bg-neutral-800"></div>
         <div class="absolute -top-2 -right-2 w-full h-full rounded-full border-2 border-white/30 z-0 bg-neutral-700"></div>
         ` : ''}
         <div class="w-full h-full rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20 flex items-center justify-center relative overflow-hidden bg-neutral-900">
            <img src="${imageUrl}" class="w-full h-full object-cover mix-blend-screen opacity-90" />
            ${isStacked ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white z-30">${carCount}</div>` : ''}
         </div>
      </div>
    `;
    return L.divIcon({ html, className: 'custom-car-marker', iconSize: [0, 0] });
  };
  
  const rareCarIcon = useMemo(() => {
    const html = `
      <div class="relative w-16 h-16 flex flex-col items-center -mt-8 -ml-8 cursor-pointer hover:scale-110 transition-transform group">
         <div class="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping z-0"></div>
         <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 border-2 border-white shadow-[0_0_25px_rgba(234,179,8,1)] z-20 flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_60%)] opacity-50 mix-blend-overlay"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
         </div>
         <div class="absolute -top-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow-lg uppercase tracking-wider z-30 group-hover:-translate-y-1 transition-transform">Legendary</div>
      </div>
    `;
    return L.divIcon({ html, className: 'custom-rare-car-marker', iconSize: [0, 0] });
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula for distance in meters
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const handleCollect = (id: string, lat: number, lng: number) => {
    const dist = calculateDistance(center.lat, center.lng, lat, lng);
    if (dist > 100) {
      showWarning("Too far away! Get closer to collect.");
      return;
    }
    setCollectibles(prev => prev.filter(c => c.id !== id));
    addXP(10); // Gain 10 XP for collecting
  };

  const handleStopClick = (id: string, lat: number, lng: number) => {
    const dist = calculateDistance(center.lat, center.lng, lat, lng);
    if (dist > 100) {
      showWarning("Too far away! Get closer to interact.");
      return;
    }
    navigate('/camera');
  };
  
  const handleRareCarClick = async (car: any) => {
    const dist = calculateDistance(center.lat, center.lng, car.lat, car.lng);
    if (dist > 100) {
      showWarning("Too far away! Get closer to collect this rare car.");
      return;
    }
    
    // Start encounter loading
    setActiveEncounter(car);
    setIsLoadingEncounter(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: car.brand, model: car.model })
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setEncounterQuestions(data);
        setCurrentQuestionIndex(0);
        setEncounterStrikes(0);
        setQuestionsToWin(3);
        setCorrectAnswers(0);
        setQuestionTimer(10);
      } else {
        throw new Error('Invalid questions received');
      }
    } catch (error) {
      // Fallback questions if API fails
      setEncounterQuestions([
        {
          question: `What brand is the famous model ${car.model}?`,
          options: [car.brand, 'Ferrari', 'Lamborghini', 'Porsche'].filter((v, i, a) => a.indexOf(v) === i),
          correctIndex: 0
        },
        {
          question: `What type of vehicle is a ${car.brand}?`,
          options: ['Car', 'Boat', 'Plane', 'Train'],
          correctIndex: 0
        },
        {
          question: `How many wheels does a ${car.model} have?`,
          options: ['Four', 'Two', 'Three', 'Six'],
          correctIndex: 0
        }
      ]);
      setCurrentQuestionIndex(0);
      setEncounterStrikes(0);
      setQuestionsToWin(3);
      setCorrectAnswers(0);
      setQuestionTimer(10);
    } finally {
      setIsLoadingEncounter(false);
    }
  };
  
  useEffect(() => {
    if (activeEncounter && encounterQuestions.length > 0 && !isLoadingEncounter && !captureAnimation && !wrongAnswerState) {
      if (questionTimer > 0) {
        const timerId = setTimeout(() => setQuestionTimer(questionTimer - 1), 1000);
        return () => clearTimeout(timerId);
      } else {
        handleAnswerSubmit(-1);
      }
    }
  }, [activeEncounter, encounterQuestions, isLoadingEncounter, captureAnimation, wrongAnswerState, questionTimer]);
  
  const handleAnswerSubmit = (index: number) => {
    const currentQ = encounterQuestions[currentQuestionIndex];
    if (!currentQ) return;
    
    if (index === currentQ.correctIndex) {
      const newCorrect = correctAnswers + 1;
      setCorrectAnswers(newCorrect);
      setCorrectAnswerState(true);
      
      setTimeout(() => {
        if (newCorrect >= questionsToWin || currentQuestionIndex + 1 >= encounterQuestions.length) {
          // Win!
          setCaptureAnimation(activeEncounter);
          setActiveEncounter(null);
          setEncounterQuestions([]);
          setWrongAnswerState(false);
          setCorrectAnswerState(false);
          
          // Remove from map
          setRareCars(prev => prev.filter(c => c.id !== activeEncounter.id));
          
          // Add to inventory with a slight delay for animation
          setTimeout(() => {
            addCar({
              brand: activeEncounter.brand,
              model: activeEncounter.model,
              color: '#ffffff', // default
              rarity: activeEncounter.rarity,
              image: activeEncounter.image,
              location: { lat: activeEncounter.lat, lng: activeEncounter.lng }
            });
            setCaptureAnimation(null);
          }, 2000);
        } else {
          // Next question
          setCurrentQuestionIndex(prev => prev + 1);
          setQuestionTimer(10);
          setWrongAnswerState(false);
          setCorrectAnswerState(false);
        }
      }, 1000);
    } else {
      const newStrikes = encounterStrikes + 1;
      setEncounterStrikes(newStrikes);
      setWrongAnswerState(true);
      
      if (newStrikes >= 2) {
         // Fail to catch
         setTimeout(() => {
            showWarning("The car got away!");
            setActiveEncounter(null);
            setEncounterQuestions([]);
            setRareCars(prev => prev.filter(c => c.id !== activeEncounter.id));
            setWrongAnswerState(false);
         }, 1500);
      } else {
         // Add 1 more question to win
         setQuestionsToWin(prev => prev + 1);
         setTimeout(() => {
            if (currentQuestionIndex + 1 >= encounterQuestions.length) {
              showWarning("You ran out of questions! The car got away!");
              setActiveEncounter(null);
              setEncounterQuestions([]);
              setRareCars(prev => prev.filter(c => c.id !== activeEncounter.id));
              setWrongAnswerState(false);
              return;
            }
            setCurrentQuestionIndex(prev => prev + 1);
            setQuestionTimer(10);
            setWrongAnswerState(false);
         }, 1500);
      }
    }
  };

  return (
    <div className="w-full h-full relative bg-[#0a0a0a]">
      <div className="absolute inset-0">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={17} 
          zoomControl={false}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          className="w-full h-full"
          style={{ background: '#0a0a0a' }}
        >
          <TileLayer
            url={stats.mapTheme === 'normal' ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
            className="map-tiles opacity-80"
          />
          
          {center && (
            <Marker position={[center.lat, center.lng]} icon={playerIcon} zIndexOffset={1000} />
          )}

          {stats.showPath && filteredPathHistory.length > 1 && (
            <Polyline 
              positions={filteredPathHistory.map(p => [p.lat, p.lng])} 
              pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 10', opacity: 0.7 }} 
            >
              <Popup className="custom-popup">
                <div className="bg-neutral-900 p-3 rounded-lg border border-white/10 text-white min-w-[150px]">
                  <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest border-b border-white/10 pb-1">Path Info</h3>
                  <div className="flex flex-col gap-1">
                     <span className="text-xs font-mono"><span className="text-neutral-500">Dist:</span> {stats.distanceTravelled.toFixed(2)} km</span>
                     <span className="text-xs font-mono"><span className="text-neutral-500">Points:</span> {filteredPathHistory.length}</span>
                     {filteredPathHistory.length > 0 && (
                        <span className="text-[10px] text-neutral-400 mt-1 flex flex-col gap-1">
                          <span>Date: {new Date(filteredPathHistory[0].timestamp).toLocaleDateString()}</span>
                          <span>Time: {new Date(filteredPathHistory[0].timestamp).toLocaleTimeString()}</span>
                        </span>
                     )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          )}

          {showMarkers && collectibles.map(col => (
            <Marker 
              key={col.id} 
              position={[col.lat, col.lng]} 
              icon={collectibleIcon}
              eventHandlers={{
                click: () => handleCollect(col.id, col.lat, col.lng)
              }}
            />
          ))}
          
          {/* Render Rare/Legendary Cars */}
          {showMarkers && rareCars.map(car => (
            <Marker 
              key={car.id} 
              position={[car.lat, car.lng]} 
              icon={rareCarIcon}
              eventHandlers={{
                click: () => handleRareCarClick(car)
              }}
            />
          ))}

          {/* Render Captured Cars */}
          {cars && cars.filter(car => car.location).map((car, index, arr) => {
            if (!car.location) return null;
            // Find other cars very close to this one to stack them
            const stackedCars = arr.filter(c => c.location && calculateDistance(car.location!.lat, car.location!.lng, c.location.lat, c.location.lng) < 10);
            
            // Only render the first one of the stack to prevent duplicates
            if (stackedCars.length > 0 && stackedCars[0].id !== car.id) return null;

            return (
              <Marker
                key={car.id}
                position={[car.location.lat, car.location.lng]}
                icon={getCapturedCarIcon(stackedCars.length, car.color, car.image)}
                eventHandlers={{
                  click: () => {
                    if (stackedCars.length === 1) {
                       setSelectedCarForModal(car);
                    }
                  }
                }}
              >
                {stackedCars.length > 1 && (
                  <Popup className="custom-popup" closeButton={false}>
                     <div className="flex overflow-x-auto gap-2 p-1 snap-x max-w-[200px] hide-scrollbar">
                        {stackedCars.map(stackedCar => (
                          <div key={stackedCar.id} className="flex gap-2 shrink-0 w-[180px] snap-center bg-neutral-900 border border-white/10 rounded-full overflow-hidden shadow-xl cursor-pointer p-1 items-center" onClick={() => setSelectedCarForModal(stackedCar)}>
                             <div className="w-10 h-10 bg-neutral-800 rounded-full relative shrink-0 overflow-hidden">
                               <img src={stackedCar.image} alt={stackedCar.brand} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex flex-col flex-1 truncate pr-2">
                               <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none truncate">{stackedCar.brand}</span>
                               <span className="text-xs font-black text-white uppercase leading-tight truncate">{stackedCar.model}</span>
                             </div>
                          </div>
                        ))}
                     </div>
                  </Popup>
                )}
              </Marker>
            );
          })}

          {center && <MapUpdater center={center} triggerRecenter={recenterCounter} />}
        </MapContainer>
      </div>
      
      {/* View Toggles UI */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[500] flex flex-col gap-3">
        <button 
           onClick={() => setShowMarkers(!showMarkers)}
           className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border shadow-lg transition-all ${showMarkers ? 'bg-white/20 border-white/50 text-white' : 'bg-neutral-900/80 border-white/10 text-neutral-500'}`}
        >
          <Layers size={20} />
        </button>
      </div>

      {/* Encounter Modal */}
      {activeEncounter && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-48 relative">
              <img src={activeEncounter.image} alt={activeEncounter.brand} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded-sm uppercase tracking-widest inline-block mb-1">{activeEncounter.rarity}</div>
                <h3 className="text-2xl font-black text-white">{activeEncounter.brand} {activeEncounter.model}</h3>
              </div>
            </div>
            <div className="p-5">
              {isLoadingEncounter ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-neutral-400 font-bold text-sm tracking-widest uppercase">Generating Challenge...</p>
                </div>
              ) : encounterQuestions.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Question {currentQuestionIndex + 1} / {questionsToWin + encounterStrikes}</span>
                    <div className="flex items-center gap-2 relative w-8 h-8">
                       <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36">
                         <circle cx="18" cy="18" r="16" fill="none" className="stroke-neutral-800" strokeWidth="3" />
                         <circle cx="18" cy="18" r="16" fill="none" className={`stroke-current ${questionTimer <= 3 ? 'text-red-500' : 'text-blue-400'} transition-all duration-1000 ease-linear`} strokeWidth="3" strokeDasharray={`${(questionTimer/10)*100} 100`} />
                       </svg>
                       <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${questionTimer <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{questionTimer}</span>
                    </div>
                  </div>
                  <div className="relative mb-6 min-h-[4rem] flex items-center justify-center">
                    <p className={`text-neutral-300 font-medium text-sm text-center leading-tight transition-opacity ${(wrongAnswerState || correctAnswerState) ? 'opacity-0' : 'opacity-100'}`}>
                      {encounterQuestions[currentQuestionIndex].question}
                    </p>
                    {wrongAnswerState && (
                      <p className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl uppercase tracking-widest animate-in zoom-in duration-200">
                        INCORRECT!
                      </p>
                    )}
                    {correctAnswerState && (
                      <p className="absolute inset-0 flex items-center justify-center text-green-500 font-black text-xl uppercase tracking-widest animate-in zoom-in duration-200">
                        CORRECT!
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {encounterQuestions[currentQuestionIndex].options.map((opt: string, idx: number) => {
                      const isCorrectChoice = idx === encounterQuestions[currentQuestionIndex].correctIndex;
                      return (
                      <button 
                        key={idx}
                        onClick={() => handleAnswerSubmit(idx)}
                        disabled={wrongAnswerState || correctAnswerState}
                        className={`py-3 px-4 bg-neutral-800 border rounded-xl font-bold transition-all text-xs break-words leading-tight flex items-center justify-center min-h-[3rem] ${wrongAnswerState ? 'border-red-500/50 opacity-50' : (correctAnswerState ? (isCorrectChoice ? 'bg-green-500 text-white border-green-400' : 'opacity-30') : 'hover:bg-white hover:text-black border-white/10')}`}
                      >
                        {opt}
                      </button>
                    )})}
                  </div>
                </>
              ) : null}
              <button 
                onClick={() => { setActiveEncounter(null); setEncounterQuestions([]); }}
                className="mt-6 w-full py-3 text-neutral-500 font-medium hover:text-white transition-colors text-sm uppercase tracking-widest"
              >
                Run Away
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Animation */}
      {captureAnimation && (
        <div className="absolute inset-0 z-[2000] bg-black flex flex-col items-center justify-center animate-out fade-out duration-1000 delay-1000 fill-mode-forwards pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-white/20 blur-3xl absolute animate-pulse" />
          <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-orange-500 mb-8 animate-in slide-in-from-bottom-10 duration-500">CAPTURED!</h2>
          <div className="w-64 h-48 relative rounded-xl overflow-hidden border-2 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)] animate-in zoom-in duration-500 delay-200 fill-mode-backwards">
            <img src={captureAnimation.image} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 w-full bg-black/80 p-3 backdrop-blur-sm border-t border-yellow-500/30">
              <div className="text-xs font-bold text-yellow-500 uppercase">{captureAnimation.rarity}</div>
              <div className="text-lg font-black text-white leading-none">{captureAnimation.brand} {captureAnimation.model}</div>
            </div>
          </div>
        </div>
      )}

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-[400]" />

      {/* Warning Toast */}
      {warning && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-red-400/50 flex items-center gap-2">
            <Zap size={16} className="fill-white" />
            <span className="text-sm font-bold tracking-wide">{warning}</span>
          </div>
        </div>
      )}

      <CarDetailsModal car={selectedCarForModal} onClose={() => setSelectedCarForModal(null)} />
    </div>
  );
}
