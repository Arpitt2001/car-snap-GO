import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CarCard, PlayerStats, Badge, PlayerOutfit } from '../types';

interface GameContextType {
  cars: CarCard[];
  stats: PlayerStats;
  badges: Badge[];
  outfit: PlayerOutfit;
  garageSlots: (string | null)[];
  addCar: (car: Omit<CarCard, 'id' | 'capturedAt'>) => void;
  updateStats: (distance: number, time: number, pathPoints?: {lat: number, lng: number}[]) => void;
  addXP: (amount: number) => void;
  updateOutfit: (outfit: Partial<PlayerOutfit>) => void;
  updateGarageSlot: (index: number, carId: string | null) => void;
  updateName: (name: string) => void;
  updateMapTheme: (theme: 'dark' | 'normal') => void;
  updateShowPath: (show: boolean) => void;
  clearData: () => void;
  deleteCar: (id: string) => void;
  updateCar: (id: string, updates: Partial<CarCard>) => void;
  purchaseItem: (cost: number, itemUpdate: Partial<PlayerOutfit>) => boolean;
}

const INITIAL_STATS: PlayerStats = {
  xp: 0,
  level: 1,
  distanceTravelled: 0,
  timeActive: 0,
  carsCollected: 0,
  name: 'Player One',
  mapTheme: 'dark',
  coins: 10000,
};

const INITIAL_OUTFIT: PlayerOutfit = {
  shirtColor: '#3b82f6',
  pantsColor: '#1f2937',
  skinColor: '#fcd34d',
};

const INITIAL_BADGES: Badge[] = [
  { id: 'first_capture', name: 'First Capture', description: 'Capture your first car', unlockedAt: null, icon: 'Camera' },
  { id: 'suv_hunter', name: 'SUV Hunter', description: 'Capture 3 SUVs', unlockedAt: null, icon: 'Tractor' },
  { id: 'luxury_collector', name: 'Luxury Collector', description: 'Capture a Legendary car', unlockedAt: null, icon: 'Crown' },
];

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [cars, setCars] = useState<CarCard[]>(() => {
    const saved = localStorage.getItem('cardex_cars');
    return saved ? JSON.parse(saved) : [];
  });

  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('cardex_stats');
    return saved ? { ...INITIAL_STATS, ...JSON.parse(saved) } : INITIAL_STATS;
  });

  const [outfit, setOutfit] = useState<PlayerOutfit>(() => {
    const saved = localStorage.getItem('cardex_outfit');
    return saved ? { ...INITIAL_OUTFIT, ...JSON.parse(saved) } : INITIAL_OUTFIT;
  });

  const [badges, setBadges] = useState<Badge[]>(() => {
    const saved = localStorage.getItem('cardex_badges');
    return saved ? JSON.parse(saved) : INITIAL_BADGES;
  });

  const [garageSlots, setGarageSlots] = useState<(string | null)[]>(() => {
    const saved = localStorage.getItem('cardex_garageSlots');
    return saved ? JSON.parse(saved) : [null, null, null, null, null, null];
  });

  useEffect(() => {
    localStorage.setItem('cardex_cars', JSON.stringify(cars));
    localStorage.setItem('cardex_stats', JSON.stringify(stats));
    localStorage.setItem('cardex_outfit', JSON.stringify(outfit));
    localStorage.setItem('cardex_badges', JSON.stringify(badges));
    localStorage.setItem('cardex_garageSlots', JSON.stringify(garageSlots));
  }, [cars, stats, outfit, badges, garageSlots]);

  const checkBadges = (newCars: CarCard[], newStats: PlayerStats) => {
    let updatedBadges = [...badges];
    let badgesChanged = false;
    const now = Date.now();

    const unlockBadge = (id: string) => {
      const idx = updatedBadges.findIndex(b => b.id === id);
      if (idx !== -1 && !updatedBadges[idx].unlockedAt) {
        updatedBadges[idx] = { ...updatedBadges[idx], unlockedAt: now };
        badgesChanged = true;
      }
    };

    if (newCars.length >= 1) unlockBadge('first_capture');
    if (newCars.some(c => c.rarity === 'Legendary')) unlockBadge('luxury_collector');
    // Simplified SUV check for prototype
    if (newCars.filter(c => c.model.toLowerCase().includes('suv') || c.brand.toLowerCase().includes('jeep')).length >= 3) {
      unlockBadge('suv_hunter');
    }

    if (badgesChanged) {
      setBadges(updatedBadges);
    }
  };

  const addCar = (carData: Omit<CarCard, 'id' | 'capturedAt'>) => {
    const isDuplicate = cars.some(c => c.brand === carData.brand && c.model === carData.model);
    const xpGained = isDuplicate ? 10 : 50;

    const newCar: CarCard = {
      ...carData,
      id: Math.random().toString(36).substr(2, 9),
      capturedAt: Date.now(),
    };

    const newCars = [newCar, ...cars];
    setCars(newCars);

    const newXp = stats.xp + xpGained;
    const newLevel = Math.floor(newXp / 100) + 1;
    
    const coinReward = carData.rarity === 'Legendary' ? 100 : carData.rarity === 'Rare' ? 50 : 10;

    const newStats = {
      ...stats,
      carsCollected: stats.carsCollected + 1,
      xp: newXp,
      level: newLevel,
      coins: (stats.coins || 0) + coinReward,
    };
    
    setStats(newStats);
    checkBadges(newCars, newStats);
  };

  const purchaseItem = (cost: number, itemUpdate: Partial<PlayerOutfit>) => {
    if ((stats.coins || 0) >= cost) {
      setStats(prev => ({ ...prev, coins: (prev.coins || 0) - cost }));
      setOutfit(prev => ({ ...prev, ...itemUpdate }));
      return true;
    }
    return false;
  };

  const updateStats = useCallback((distanceInc: number, timeInc: number, pathPoints?: {lat: number, lng: number}[]) => {
    setStats(prev => {
      let updatedPath = prev.pathHistory || [];
      if (pathPoints && pathPoints.length > 0) {
        const newPoints = pathPoints.map(p => ({ ...p, timestamp: Date.now() }));
        updatedPath = [...updatedPath, ...newPoints];
        if (updatedPath.length > 2000) {
           updatedPath = updatedPath.slice(updatedPath.length - 2000);
        }
      }
      return {
        ...prev,
        distanceTravelled: prev.distanceTravelled + distanceInc,
        timeActive: prev.timeActive + timeInc,
        pathHistory: updatedPath,
      };
    });
  }, []);

  const addXP = (amount: number) => {
    setStats(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const updateOutfit = (newOutfit: Partial<PlayerOutfit>) => {
    setOutfit(prev => ({ ...prev, ...newOutfit }));
  };

  const updateGarageSlot = (index: number, carId: string | null) => {
    setGarageSlots(prev => {
      const newSlots = [...prev];
      newSlots[index] = carId;
      return newSlots;
    });
  };

  const updateName = (name: string) => {
    setStats(prev => ({ ...prev, name }));
  };

  const updateMapTheme = (theme: 'dark' | 'normal') => {
    setStats(prev => ({ ...prev, mapTheme: theme }));
  };

  const updateShowPath = (show: boolean) => {
    setStats(prev => ({ ...prev, showPath: show }));
  };

  const clearData = () => {
    setCars([]);
    setStats(INITIAL_STATS);
    setOutfit(INITIAL_OUTFIT);
    setBadges(INITIAL_BADGES);
    setGarageSlots([null, null, null, null, null, null]);
  };

  const deleteCar = (id: string) => {
    setCars(prev => prev.filter(c => c.id !== id));
    setGarageSlots(prev => prev.map(cId => cId === id ? null : cId));
  };

  const updateCar = (id: string, updates: Partial<CarCard>) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <GameContext.Provider value={{ cars, stats, badges, outfit, garageSlots, addCar, updateStats, addXP, updateOutfit, updateGarageSlot, updateName, updateMapTheme, updateShowPath, clearData, deleteCar, updateCar, purchaseItem }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
