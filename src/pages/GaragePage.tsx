import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { Search, Info, X, Share2, Trash2, Box, Grid } from 'lucide-react';
import { CarCard } from '../types';
import { Garage3D } from '../components/Garage3D';
import { CarDetailsModal } from '../components/CarDetailsModal';

export function GaragePage() {
  const { cars, garageSlots, updateGarageSlot, deleteCar } = useGame();
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedCar, setSelectedCar] = useState<CarCard | null>(null);
  const [contextMenuCar, setContextMenuCar] = useState<CarCard | null>(null);
  const [selectingForSlot, setSelectingForSlot] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'rarity'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const brands = useMemo(() => {
    const allBrands = cars.map(c => c.brand.toUpperCase());
    return Array.from(new Set(allBrands)).sort();
  }, [cars]);

  const sortedCars = useMemo(() => {
    let filtered = cars.filter(car => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = car.brand.toLowerCase().includes(q) || car.model.toLowerCase().includes(q);
      const matchesBrand = selectedBrand ? car.brand.toUpperCase() === selectedBrand : true;
      return matchesSearch && matchesBrand;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date') return b.capturedAt - a.capturedAt;
      const rarityScore = { Legendary: 3, Rare: 2, Common: 1 };
      return rarityScore[b.rarity] - rarityScore[a.rarity];
    });
  }, [cars, searchQuery, selectedBrand, sortBy]);

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return 'from-yellow-500 to-orange-600 border-yellow-500/50 text-yellow-300';
      case 'Rare': return 'from-blue-500 to-purple-600 border-blue-500/50 text-blue-300';
      default: return 'from-neutral-600 to-neutral-800 border-neutral-600/50 text-neutral-300';
    }
  };

  const handleShare = (car: CarCard) => {
    if (navigator.share) {
      navigator.share({
        title: `I caught a ${car.rarity} ${car.brand} ${car.model}!`,
        text: `Check out my ${car.brand} ${car.model} in CarDex!`,
      }).catch(console.error);
    }
    setContextMenuCar(null);
  };

  const handleDelete = (car: CarCard) => {
    deleteCar(car.id);
    setContextMenuCar(null);
  };

  // Custom long press handler
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{x: number, y: number} | null>(null);

  const startPress = (e: React.MouseEvent | React.TouchEvent, car: CarCard) => {
    isLongPress.current = false;
    if ('touches' in e) {
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      startPos.current = { x: e.clientX, y: e.clientY };
    }
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      setContextMenuCar(car);
    }, 500); // 500ms for long press
  };

  const cancelPress = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent, car: CarCard) => {
    cancelPress();
    let moveDistance = 0;
    if (startPos.current) {
      if ('changedTouches' in e) {
        const dx = e.changedTouches[0].clientX - startPos.current.x;
        const dy = e.changedTouches[0].clientY - startPos.current.y;
        moveDistance = Math.sqrt(dx*dx + dy*dy);
      } else {
        const dx = (e as React.MouseEvent).clientX - startPos.current.x;
        const dy = (e as React.MouseEvent).clientY - startPos.current.y;
        moveDistance = Math.sqrt(dx*dx + dy*dy);
      }
    }
    
    if (!isLongPress.current && moveDistance < 10) {
      setSelectedCar(car);
    }
    isLongPress.current = false;
    startPos.current = null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col bg-neutral-950 pb-24"
    >
      {viewMode === '2d' && (
        <header className="p-6 pt-12 pb-4 sticky top-0 bg-neutral-950/95 backdrop-blur-xl z-20 border-b border-white/5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-black italic tracking-tighter text-white">INVENTORY</h1>
            
            <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
              <button
                onClick={() => setViewMode('2d')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors bg-neutral-800 text-white`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors text-neutral-500 hover:text-white`}
              >
                <Box size={16} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-neutral-500" />
            </div>
            <input
              type="text"
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Brand Filters */}
          {brands.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors border ${!selectedBrand ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}
              >
                ALL
              </button>
              {brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors border ${selectedBrand === brand ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-xs font-mono text-neutral-500">{sortedCars.length} CARS</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setSortBy('date')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-colors ${sortBy === 'date' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400'}`}
              >
                LATEST
              </button>
              <button 
                 onClick={() => setSortBy('rarity')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition-colors ${sortBy === 'rarity' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400'}`}
              >
                RARITY
              </button>
            </div>
          </div>
        </header>
      )}

      {viewMode === '3d' ? (
        <div className="flex-1 relative min-h-[500px]">
          <div className="absolute top-12 right-6 z-20 flex bg-neutral-900/80 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-xl">
            <button
              onClick={() => setViewMode('2d')}
              className={`p-2 rounded-md flex items-center justify-center transition-colors text-neutral-400 hover:text-white`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`p-2 rounded-md flex items-center justify-center transition-colors bg-blue-500/20 text-blue-400`}
            >
              <Box size={20} />
            </button>
          </div>
          <Garage3D onPlatformClick={(index) => setSelectingForSlot(index)} />
        </div>
      ) : (
        <div className="p-2 sm:p-4 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
          {sortedCars.length === 0 ? (
            <div className="col-span-full text-center py-20 flex flex-col items-center opacity-50">
              <Search size={48} className="mb-4 text-neutral-700" />
              <p className="font-mono text-sm tracking-widest text-neutral-400">NO CARS FOUND</p>
            </div>
          ) : (
          sortedCars.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 25 }}
              onMouseDown={(e) => startPress(e, car)}
              onMouseUp={(e) => handleCardClick(e, car)}
              onMouseLeave={cancelPress}
              onTouchStart={(e) => startPress(e, car)}
              onTouchEnd={(e) => handleCardClick(e, car)}
              className={`relative aspect-[3/4] rounded-lg sm:rounded-xl p-0.5 bg-gradient-to-b ${getRarityColor(car.rarity)} cursor-pointer shadow-lg hover:scale-[1.02] transition-transform select-none group`}
            >
              <div className="absolute inset-[2px] bg-neutral-900 rounded-[10px] flex flex-col overflow-hidden">
                {/* Image Area */}
                <div className="flex-1 w-full bg-black relative flex items-center justify-center p-2 min-h-0 overflow-hidden">
                  <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-500 rounded-md overflow-hidden">
                    <img 
                      src={car.image} 
                      alt={car.brand} 
                      draggable={false} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" 
                      style={{ transform: car.imageRotation ? `rotate(${car.imageRotation}deg) scale(${car.imageRotation % 180 !== 0 ? 1.5 : 1})` : undefined }}
                    />
                  </div>
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br ${getRarityColor(car.rarity)} z-20 shadow-[0_0_8px_currentColor]`} />
                </div>
                
                {/* Text Area */}
                <div className="h-[44px] w-full bg-neutral-950 flex flex-col items-center justify-center px-2 border-t border-white/10 shrink-0">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5 w-full text-center truncate">{car.brand}</span>
                  <span className="text-[11px] font-black text-white uppercase leading-none w-full text-center truncate">{car.model}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      )}

      {(() => {
        const selectedIndex = selectedCar ? sortedCars.findIndex(c => c.id === selectedCar.id) : -1;
        const hasNext = selectedIndex >= 0 && selectedIndex < sortedCars.length - 1;
        const hasPrev = selectedIndex > 0;
        
        return (
          <CarDetailsModal 
            car={selectedCar} 
            onClose={() => setSelectedCar(null)}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onNext={() => hasNext && setSelectedCar(sortedCars[selectedIndex + 1])}
            onPrev={() => hasPrev && setSelectedCar(sortedCars[selectedIndex - 1])}
          />
        );
      })()}

      {/* Context Menu for Long Press */}
      <AnimatePresence>
        {contextMenuCar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setContextMenuCar(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-neutral-900 w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                 <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center p-1 ${getRarityColor(contextMenuCar.rarity)}`}>
                   <img src={contextMenuCar.image} alt={contextMenuCar.brand} className="max-w-full max-h-full object-contain mix-blend-screen" />
                 </div>
                 <div>
                   <h3 className="font-black text-white">{contextMenuCar.brand}</h3>
                   <p className="text-xs text-neutral-400 truncate w-48">{contextMenuCar.model}</p>
                 </div>
              </div>

              <button 
                onClick={() => handleShare(contextMenuCar)}
                className="w-full py-4 bg-neutral-800 rounded-2xl font-bold tracking-wider text-sm text-white flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
              >
                <Share2 size={18} />
                SHARE CARD
              </button>
              
              <button 
                onClick={() => handleDelete(contextMenuCar)}
                className="w-full py-4 bg-red-950/50 rounded-2xl font-bold tracking-wider text-sm text-red-500 border border-red-900/50 flex items-center justify-center gap-2 hover:bg-red-900/50 transition-colors"
              >
                <Trash2 size={18} />
                DELETE CARD
              </button>

              <button 
                onClick={() => setContextMenuCar(null)}
                className="w-full py-4 bg-transparent rounded-2xl font-bold tracking-wider text-sm text-neutral-500 hover:text-white transition-colors mt-2"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot Selection Overlay */}
      <AnimatePresence>
        {selectingForSlot !== null && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed inset-0 z-[2000] bg-neutral-950 flex flex-col"
          >
             <header className="p-6 pt-12 pb-4 bg-neutral-900 border-b border-white/5 flex justify-between items-center shadow-xl">
               <div>
                  <h2 className="text-xl font-black italic text-white">SELECT CAR</h2>
                  <p className="text-xs text-blue-400 font-mono tracking-widest">FOR SLOT {selectingForSlot + 1}</p>
               </div>
               <button 
                 onClick={() => setSelectingForSlot(null)}
                 className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
               >
                 <X size={20} />
               </button>
             </header>
             <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start pb-24">
               {/* Empty slot option */}
               <button 
                  onClick={() => {
                     updateGarageSlot(selectingForSlot, null);
                     setSelectingForSlot(null);
                  }}
                  className="col-span-full py-4 rounded-xl border border-dashed border-neutral-700 text-neutral-500 font-bold tracking-widest text-sm hover:text-white hover:border-white/50 mb-2 transition-colors flex items-center justify-center gap-2"
               >
                  <Trash2 size={16} /> CLEAR SLOT
               </button>
               {cars.map((car) => {
                  const isAssigned = garageSlots.includes(car.id);
                  return (
                    <button
                      key={car.id}
                      onClick={() => {
                         if (!isAssigned) {
                           updateGarageSlot(selectingForSlot, car.id);
                           setSelectingForSlot(null);
                         } else {
                           // Allow swapping
                           const oldIndex = garageSlots.indexOf(car.id);
                           updateGarageSlot(oldIndex, garageSlots[selectingForSlot]);
                           updateGarageSlot(selectingForSlot, car.id);
                           setSelectingForSlot(null);
                         }
                      }}
                      className={`relative aspect-[4/3] sm:aspect-[3/4] rounded-xl p-0.5 bg-gradient-to-b ${getRarityColor(car.rarity)} cursor-pointer ${isAssigned ? 'opacity-50 hover:opacity-80' : 'hover:scale-105'} transition-all`}
                    >
                      <div className="absolute inset-0.5 bg-neutral-900 rounded-[10px] overflow-hidden flex flex-col relative group">
                        {isAssigned && <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center"><p className="text-[10px] font-bold text-white bg-black px-2 py-1 rounded">SLOT {garageSlots.indexOf(car.id) + 1}</p></div>}
                        <div className="flex-1 w-full relative flex items-center justify-center p-1 bg-neutral-900 overflow-hidden">
                          <img src={car.image} alt={car.brand} className="w-full h-full object-cover mix-blend-screen opacity-90" />
                        </div>
                      </div>
                    </button>
                  );
               })}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
