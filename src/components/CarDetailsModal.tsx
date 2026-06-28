import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RotateCw, Edit2, Check, RefreshCw } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { CarCard } from '../types';

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'Legendary': return 'from-yellow-400 to-yellow-600';
    case 'Rare': return 'from-blue-400 to-blue-600';
    default: return 'from-neutral-400 to-neutral-600';
  }
};

interface Props {
  car: CarCard | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function CarDetailsModal({ car, onClose, onNext, onPrev, hasNext, hasPrev }: Props) {
  const { updateCar } = useGame();
  const [direction, setDirection] = useState(0);
  const [rotation, setRotation] = useState(car?.imageRotation || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [isRefreshingSpecs, setIsRefreshingSpecs] = useState(false);

  useEffect(() => {
    if (car) {
      setRotation(car.imageRotation || 0);
      setEditBrand(car.brand);
      setEditModel(car.model);
      setIsEditing(false);
    }
  }, [car]);

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = offset.x;
    if (swipe < -50 && hasNext && onNext) {
      setDirection(1);
      onNext();
    } else if (swipe > 50 && hasPrev && onPrev) {
      setDirection(-1);
      onPrev();
    }
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (car) {
      const newRot = (rotation + 90) % 360;
      setRotation(newRot);
      updateCar(car.id, { imageRotation: newRot });
    }
  };

  const saveEdit = () => {
    if (car) {
      updateCar(car.id, { brand: editBrand, model: editModel });
      setIsEditing(false);
    }
  };

  const refreshSpecs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!car) return;
    setIsRefreshingSpecs(true);
    try {
      const response = await fetch('/api/car-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brand: editBrand || car.brand, 
          model: editModel || car.model,
          location: car.location
        })
      });
      const data = await response.json();
      if (data && (data.engine || data.horsepower)) {
        updateCar(car.id, {
          engine: data.engine || car.engine,
          horsepower: data.horsepower || car.horsepower,
          topSpeed: data.topSpeed || car.topSpeed,
          year: data.year || car.year
        });
      }
    } catch (err) {
      // Ignore silently
    } finally {
      setIsRefreshingSpecs(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9,
      rotateY: direction > 0 ? 45 : -45
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9,
      rotateY: direction < 0 ? 45 : -45
    })
  };

  const modalContent = (
    <AnimatePresence>
      {car && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md overflow-hidden"
          onClick={onClose}
        >
          {hasPrev && onPrev && (
            <button 
              onClick={(e) => { e.stopPropagation(); setDirection(-1); setRotation(0); onPrev(); }}
              className="absolute left-2 z-50 p-2 text-white/50 hover:text-white"
            >
              <ChevronLeft size={32} />
            </button>
          )}
          {hasNext && onNext && (
            <button 
              onClick={(e) => { e.stopPropagation(); setDirection(1); setRotation(0); onNext(); }}
              className="absolute right-2 z-50 p-2 text-white/50 hover:text-white"
            >
              <ChevronRight size={32} />
            </button>
          )}
          
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={car.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className={`w-full max-w-sm rounded-3xl p-1 bg-gradient-to-b ${getRarityColor(car.rarity)} my-auto max-h-[90vh] flex flex-col cursor-grab active:cursor-grabbing shadow-2xl`}
              onClick={e => e.stopPropagation()}
            >
               <div className="w-full h-full bg-neutral-950 rounded-[22px] overflow-y-auto flex flex-col relative scrollbar-hide">
                 <button 
                   onClick={onClose}
                   className="absolute top-4 left-4 z-20 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white"
                 >
                   <X size={16} />
                 </button>
                 
                 <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                   <span className="text-[10px] font-black tracking-widest text-white uppercase">{car.rarity}</span>
                 </div>
                 
                 <div className="flex-none relative flex items-center justify-center bg-neutral-900 overflow-hidden h-[300px]">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                       <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/70 font-mono tracking-widest border border-white/10">
                          {new Date(car.capturedAt).toLocaleDateString()}
                       </span>
                    </div>
                    
                    <button 
                      onClick={handleRotate}
                      className="absolute bottom-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <RotateCw size={18} />
                    </button>

                    <img 
                      src={car.image} 
                      alt={car.brand} 
                      className="absolute w-full h-full object-cover transition-transform duration-300" 
                      style={{ transform: `rotate(${rotation}deg) scale(${rotation % 180 !== 0 ? 1.5 : 1})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent pointer-events-none" />
                 </div>
                 
                 <div className="bg-neutral-950 p-6 border-t border-white/10 flex flex-col flex-1 shrink-0">
                    <div className="flex justify-between items-start">
                       <div className="flex flex-col flex-1 pr-4">
                         {isEditing ? (
                           <div className="flex flex-col gap-2">
                             <input 
                               value={editBrand} 
                               onChange={e => setEditBrand(e.target.value)} 
                               className="bg-neutral-900 border border-white/20 rounded px-2 py-1 text-xs font-bold text-white uppercase tracking-wider focus:outline-none"
                               placeholder="Brand"
                             />
                             <input 
                               value={editModel} 
                               onChange={e => setEditModel(e.target.value)} 
                               className="bg-neutral-900 border border-white/20 rounded px-2 py-1 text-lg font-black text-white uppercase tracking-wide focus:outline-none"
                               placeholder="Model"
                             />
                             <button onClick={saveEdit} className="mt-2 bg-white text-black font-bold text-xs py-2 rounded flex items-center justify-center gap-1">
                               <Check size={14} /> SAVE
                             </button>
                           </div>
                         ) : (
                           <div className="flex flex-col truncate group cursor-pointer" onClick={() => setIsEditing(true)}>
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{car.brand}</span>
                               <Edit2 size={10} className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <h2 className="text-2xl font-black uppercase text-white tracking-wide truncate leading-tight -mt-0.5">{car.model}</h2>
                           </div>
                         )}
                       </div>
                       <div className="flex-shrink-0 flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-md border border-white/5">
                          <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: car.color.toLowerCase() }} />
                          <span className="text-[9px] font-mono font-bold text-white/80 uppercase tracking-widest">{car.color}</span>
                       </div>
                    </div>
                    
                    {/* Extended Details */}
                    <div className="mt-8 relative border-t border-white/10 pt-6">
                      <div 
                        onClick={refreshSpecs} 
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-950 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                      >
                        Technical Specs
                        <button 
                          disabled={isRefreshingSpecs}
                          className="w-6 h-6 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-blue-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={isRefreshingSpecs ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 bg-neutral-900/50 p-3 rounded-xl border border-white/5">
                          <span className="text-[9px] text-neutral-500 font-bold tracking-widest uppercase">Engine</span>
                          <span className="text-sm text-white font-medium">{car.engine || 'UNKNOWN'}</span>
                        </div>
                        <div className="flex flex-col gap-1 bg-neutral-900/50 p-3 rounded-xl border border-white/5">
                          <span className="text-[9px] text-neutral-500 font-bold tracking-widest uppercase">Horsepower</span>
                          <span className="text-sm text-white font-medium">{car.horsepower || 'UNKNOWN'}</span>
                        </div>
                        <div className="flex flex-col gap-1 bg-neutral-900/50 p-3 rounded-xl border border-white/5">
                          <span className="text-[9px] text-neutral-500 font-bold tracking-widest uppercase">Top Speed</span>
                          <span className="text-sm text-white font-medium">{car.topSpeed || 'UNKNOWN'}</span>
                        </div>
                        <div className="flex flex-col gap-1 bg-neutral-900/50 p-3 rounded-xl border border-white/5">
                          <span className="text-[9px] text-neutral-500 font-bold tracking-widest uppercase">Launch Year</span>
                          <span className="text-sm text-white font-medium">{car.year || 'UNKNOWN'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-center pb-2">
                       <div className="w-10 h-1 rounded-full bg-white/10" />
                    </div>
                 </div>
               </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
