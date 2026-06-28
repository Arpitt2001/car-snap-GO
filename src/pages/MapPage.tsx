import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useLocationTracker } from '../hooks/useLocationTracker';
import { Trophy, Navigation as NavIcon, Timer, Zap, Menu, X, Focus, MapPinOff, Coins } from 'lucide-react';
import { GameMap } from '../components/GameMap';

export function MapPage() {
  const { stats, badges, outfit, updateOutfit, updateMapTheme, updateShowPath, cars } = useGame();
  const { currentPosition, permissionError, requestLocation, isActive } = useLocationTracker();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [recenterCounter, setRecenterCounter] = useState(0);
  const [isDatePopupOpen, setIsDatePopupOpen] = useState(false);
  const [isCoinsPopupOpen, setIsCoinsPopupOpen] = useState(false);
  const [selectedPathDate, setSelectedPathDate] = useState<string | null>(null);
  const [isMapUIHidden, setIsMapUIHidden] = useState(false);

  const brandStats = useMemo(() => {
    const stats: Record<string, { coins: number, count: number }> = {};
    cars.forEach(car => {
      let coins = 100;
      if (car.rarity === 'Rare') coins = 250;
      if (car.rarity === 'Legendary') coins = 1000;
      
      if (!stats[car.brand]) {
        stats[car.brand] = { coins: 0, count: 0 };
      }
      stats[car.brand].coins += coins;
      stats[car.brand].count += 1;
    });
    return Object.entries(stats).sort((a, b) => b[1].coins - a[1].coins);
  }, [cars]);

  const totalCoins = useMemo(() => brandStats.reduce((sum, [_, stat]) => sum + stat.coins, 0), [brandStats]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const defaultCenter = { lat: 37.7749, lng: -122.4194 };
  const center = currentPosition || defaultCenter;

  const handleRecenter = () => {
     setRecenterCounter(prev => prev + 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col relative h-screen bg-neutral-950 overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <GameMap center={center} recenterCounter={recenterCounter} selectedPathDate={selectedPathDate} onModalStateChange={setIsMapUIHidden} />
      </div>

      {!isMapUIHidden && (
        <>
          {(!isActive || permissionError) && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[500] w-[90%] max-w-sm">
              <div className="bg-red-500/90 backdrop-blur-md rounded-2xl p-4 border border-red-400/50 shadow-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center shrink-0">
                  <MapPinOff className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm mb-1">Location Required</h3>
                  <p className="text-red-100 text-xs mb-3">{permissionError || "Allow location access to find cars around you."}</p>
                  <button 
                    onClick={requestLocation}
                    className="w-full bg-white text-red-600 font-black text-xs py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    ENABLE LOCATION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recenter Button */}
          <button 
            onClick={handleRecenter}
            className="absolute bottom-24 right-6 z-[500] w-12 h-12 bg-neutral-900/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white shadow-xl hover:bg-neutral-800 transition-colors"
          >
            <Focus size={24} className="text-blue-400" />
          </button>

          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="absolute top-12 left-6 z-[500] w-12 h-12 bg-neutral-900/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white shadow-xl hover:bg-neutral-800 transition-colors"
          >
            <Menu size={24} />
          </button>
          
          {/* Level indicator Top Right */}
          <div className="absolute top-12 right-6 z-[500] bg-neutral-900/80 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 flex flex-col items-end shadow-xl">
            <span className="text-[10px] text-neutral-400 font-bold tracking-wider">LEVEL {stats.level}</span>
            <span className="text-sm font-black text-blue-400">{stats.xp} XP</span>
          </div>
        </>
      )}

      {/* Slide-out Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 z-[600] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="absolute top-0 left-0 bottom-0 w-80 bg-neutral-950/95 backdrop-blur-xl border-r border-white/10 z-[700] p-6 pt-12 flex flex-col shadow-2xl overflow-y-auto pb-24"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-xl font-black italic tracking-tighter text-neutral-500 drop-shadow-md mb-2">CARDEX</h1>
                  
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setIsProfileOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg relative">
                       <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-end justify-center" style={{ backgroundColor: outfit.shirtColor }}>
                          {/* simple avatar representation */}
                          <div className="w-6 h-6 rounded-t-xl" style={{ backgroundColor: outfit.skinColor }} />
                       </div>
                       <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-neutral-900 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">{stats.level}</span>
                       </div>
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{stats.name}</h2>
                       <p className="text-blue-400 font-mono text-[10px] font-semibold tracking-widest">EDIT PROFILE</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-neutral-900/60 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-neutral-400 tracking-wider">LEVEL {stats.level}</span>
                      <span className="text-xs font-mono text-neutral-600">|</span>
                      <span className="text-sm font-black text-blue-400">{stats.xp} XP</span>
                    </div>
                    <button 
                      onClick={() => setIsCoinsPopupOpen(true)}
                      className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 border border-blue-500/20 transition-colors shadow-sm"
                    >
                      View Coins
                    </button>
                  </div>
                  {/* Progress bar could go here if wanted, keeping it minimal for now */}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-900/60 rounded-2xl p-4 border border-white/5 flex flex-col">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <NavIcon size={14} />
                      <span className="text-[10px] font-bold tracking-wider">DISTANCE</span>
                    </div>
                    <span className="text-xl font-black text-white">{stats.distanceTravelled.toFixed(2)}<span className="text-xs text-neutral-500 ml-1">km</span></span>
                  </div>

                  <div className="bg-neutral-900/60 rounded-2xl p-4 border border-white/5 flex flex-col">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Timer size={14} />
                      <span className="text-[10px] font-bold tracking-wider">TIME</span>
                    </div>
                    <span className="text-xl font-black text-white">{formatTime(stats.timeActive)}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 rounded-2xl p-4 border border-blue-500/20 shadow-lg flex justify-between items-center mt-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-blue-300 mb-1">
                      <Zap size={14} />
                      <span className="text-[10px] font-bold tracking-wider">CARS COLLECTED</span>
                    </div>
                    <span className="text-2xl font-black text-white">{stats.carsCollected}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xs font-bold tracking-widest text-neutral-500 mb-4 uppercase">Map Settings</h3>
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={() => updateMapTheme('dark')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wider transition-colors border ${stats.mapTheme === 'dark' || !stats.mapTheme ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}
                    >
                      DARK MAP
                    </button>
                    <button 
                      onClick={() => updateMapTheme('normal')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wider transition-colors border ${stats.mapTheme === 'normal' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}
                    >
                      NORMAL MAP
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      if (stats.showPath) {
                        updateShowPath(false);
                      } else {
                        setIsDatePopupOpen(true);
                      }
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-bold tracking-wider transition-colors border ${stats.showPath ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}
                  >
                    {stats.showPath ? 'HIDE MOVEMENT PATH' : 'SHOW MOVEMENT PATH'}
                  </button>
                </div>

                {/* Achievements section */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold tracking-widest text-neutral-500 mb-4 uppercase">Achievements</h3>
                  <div className="flex flex-col gap-3">
                    {badges.map(badge => (
                      <div key={badge.id} className={`flex items-center gap-4 p-3 rounded-2xl border ${badge.unlockedAt ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-white/5 bg-neutral-900/30 opacity-60'}`}>
                        <div className={`w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center border ${badge.unlockedAt ? 'border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-neutral-900 shadow-lg shadow-yellow-500/20' : 'border-neutral-800 bg-neutral-900/50'}`}>
                          <Trophy size={20} className={badge.unlockedAt ? 'text-yellow-400' : 'text-neutral-600'} />
                        </div>
                        <div className="flex flex-col">
                           <span className={`font-bold text-sm ${badge.unlockedAt ? 'text-yellow-400' : 'text-neutral-400'}`}>{badge.name}</span>
                           <span className="text-xs text-neutral-500 leading-tight">{badge.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Minimal Pop-up Profile Editor */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[800]"
              onClick={() => setIsProfileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:w-full md:max-w-md md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[801] bg-neutral-900 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10 max-h-[85vh]"
            >
              <div className="p-4 flex justify-between items-center border-b border-white/5 bg-neutral-950">
                 <h2 className="text-sm font-black text-white tracking-widest">CUSTOMIZATION</h2>
                 <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                 {/* 3D Preview (Minimal) */}
                 <div className="w-full h-40 bg-gradient-to-b from-neutral-800 to-neutral-950 rounded-2xl mb-6 flex items-center justify-center border border-white/5 shadow-inner relative overflow-hidden">
                    <div className="w-24 h-48 relative flex flex-col items-center transform scale-75 origin-bottom">
                       {/* Head */}
                       <div className="relative z-10">
                         {outfit.cap && <div className="absolute -top-2 -left-1 w-14 h-6 rounded-t-xl shadow-sm z-30" style={{ backgroundColor: outfit.cap }} />}
                         <div className="w-12 h-12 rounded-xl shadow-lg relative flex justify-center" style={{ backgroundColor: outfit.skinColor }}>
                           {outfit.glasses && <div className="absolute top-3 w-10 h-4 rounded shadow-sm z-20" style={{ backgroundColor: outfit.glasses }} />}
                         </div>
                       </div>
                       
                       {/* Body & Arms */}
                       <div className="relative -mt-2 z-20">
                          {/* Left Arm & Hand */}
                          <div className="absolute -left-6 top-1 w-6 h-14 rounded-xl shadow-lg" style={{ backgroundColor: outfit.shirtColor }}>
                             <div className="absolute -bottom-3 left-1 w-4 h-5 rounded-md shadow-lg" style={{ backgroundColor: outfit.skinColor }} />
                             {outfit.wristBand && <div className="absolute bottom-0 w-6 h-2 shadow-sm" style={{ backgroundColor: outfit.wristBand }} />}
                          </div>
                          
                          <div className="w-20 h-20 rounded-2xl shadow-lg" style={{ backgroundColor: outfit.shirtColor }} />
                          
                          {/* Right Arm & Hand */}
                          <div className="absolute -right-6 top-1 w-6 h-14 rounded-xl shadow-lg" style={{ backgroundColor: outfit.shirtColor }}>
                             <div className="absolute -bottom-3 left-1 w-4 h-5 rounded-md shadow-lg" style={{ backgroundColor: outfit.skinColor }} />
                             {outfit.wristBand && <div className="absolute bottom-0 w-6 h-2 shadow-sm" style={{ backgroundColor: outfit.wristBand }} />}
                          </div>
                       </div>
                       {/* Legs */}
                       <div className="flex gap-2 -mt-4 z-10">
                         <div className="w-8 h-20 rounded-xl shadow-lg" style={{ backgroundColor: outfit.pantsColor }} />
                         <div className="w-8 h-20 rounded-xl shadow-lg" style={{ backgroundColor: outfit.pantsColor }} />
                       </div>
                    </div>
                 </div>

                 {/* Options */}
                 <div className="flex flex-col gap-6">
                   <div>
                     <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2 uppercase">Skin Tone</h3>
                     <div className="flex gap-2">
                        {['#fcd34d', '#f59e0b', '#d97706', '#92400e', '#451a03'].map(color => (
                          <button 
                            key={color}
                            onClick={() => updateOutfit({ skinColor: color })}
                            className={`w-10 h-10 rounded-full border-2 ${outfit.skinColor === color ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                     </div>
                   </div>

                   <div>
                     <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2 uppercase">Shirt Color</h3>
                     <div className="flex gap-2 flex-wrap">
                        {['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#1f2937', '#f8fafc'].map(color => (
                          <button 
                            key={color}
                            onClick={() => updateOutfit({ shirtColor: color })}
                            className={`w-10 h-10 rounded-full border-2 ${outfit.shirtColor === color ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                     </div>
                   </div>

                   <div>
                     <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2 uppercase">Pants Color</h3>
                     <div className="flex gap-2 flex-wrap">
                        {['#1e40af', '#0f172a', '#475569', '#fef3c7', '#7c2d12', '#14532d', '#7f1d1d', '#581c87'].map(color => (
                          <button 
                            key={color}
                            onClick={() => updateOutfit({ pantsColor: color })}
                            className={`w-10 h-10 rounded-full border-2 ${outfit.pantsColor === color ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                     </div>
                   </div>
                 </div>
              </div>
           </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Date Popup */}
      <AnimatePresence>
        {isDatePopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 rounded-3xl p-6 border border-white/10 w-full max-w-sm"
            >
              <h3 className="text-white font-bold text-lg mb-4">Select Date</h3>
              <p className="text-neutral-400 text-sm mb-6">Choose a date to view your movement path.</p>
              
              <input 
                type="date"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white mb-4 outline-none focus:border-blue-500"
                value={selectedPathDate || ''}
                onChange={(e) => setSelectedPathDate(e.target.value || null)}
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDatePopupOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-bold text-sm hover:bg-neutral-700"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    updateShowPath(true);
                    setIsDatePopupOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500"
                >
                  SHOW PATH
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Coins Popup */}
      <AnimatePresence>
        {isCoinsPopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[900] flex items-center justify-center p-4"
            onClick={() => setIsCoinsPopupOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 rounded-3xl p-6 border border-white/10 w-full max-w-sm max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Coins className="text-yellow-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg leading-none">Coins Earned</h3>
                    <p className="text-yellow-500 font-bold">{totalCoins} TOTAL</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCoinsPopupOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              
              <p className="text-xs text-neutral-400 mb-4 font-medium leading-relaxed">
                You earn coins based on the cars you've collected. Rarer cars award more coins!
                <br/><span className="text-[10px] text-neutral-500 uppercase font-bold mt-1 block">Common: 100 • Rare: 250 • Legendary: 1000</span>
              </p>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-0">
                {brandStats.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-sm font-bold">
                    No cars collected yet.
                  </div>
                ) : (
                  brandStats.map(([brand, stat]) => (
                    <div key={brand} className="flex justify-between items-center p-3 rounded-xl bg-neutral-950 border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm tracking-wider uppercase">{brand}</span>
                        {stat.count > 1 && (
                          <span className="text-[10px] font-black text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded-md">x{stat.count}</span>
                        )}
                      </div>
                      <span className="text-yellow-400 font-black">{stat.coins}</span>
                    </div>
                  ))
                )}
              </div>
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
