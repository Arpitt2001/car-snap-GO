import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Map, Camera, LayoutGrid, Store, Trophy, User, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { ShopModal } from './ShopModal';

export function Navigation() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<'shop' | 'trophy' | null>(null);
  const { badges } = useGame();
  const location = useLocation();

  if (location.pathname === '/camera') return null;

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-neutral-900/80 backdrop-blur-md border-t border-white/10 z-[1000] px-6 pb-safe">
      <div className="max-w-md mx-auto h-full flex items-center justify-between relative px-2">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 ${isActive ? 'text-blue-400' : 'text-neutral-400'}`}>
          <Map size={24} />
          <span className="text-[10px] font-medium tracking-wider">MAP</span>
        </NavLink>

        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <NavLink to="/camera">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-neutral-900"
            >
              <Camera size={28} className="text-white" />
            </motion.div>
          </NavLink>
        </div>

        <div className="flex items-center gap-2">
          <NavLink to="/garage" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 ${isActive ? 'text-blue-400' : 'text-neutral-400'}`}>
            <LayoutGrid size={24} />
            <span className="text-[10px] font-medium tracking-wider">GARAGE</span>
          </NavLink>
          
          <div className="relative">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 rounded-full bg-neutral-800 flex flex-col items-center justify-center text-neutral-400 hover:text-white transition-colors ml-1"
            >
              <Plus size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="absolute bottom-14 right-0 flex flex-col gap-3"
                >
                  <button onClick={() => { setIsExpanded(false); setActiveModal('shop'); }} className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-blue-400 shadow-xl shadow-black/50 hover:bg-neutral-700">
                    <Store size={20} />
                  </button>
                  <button onClick={() => { setIsExpanded(false); setActiveModal('trophy'); }} className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-yellow-400 shadow-xl shadow-black/50 hover:bg-neutral-700">
                    <Trophy size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>

    {/* Popups */}
    <ShopModal isOpen={activeModal === 'shop'} onClose={() => setActiveModal(null)} />

    <AnimatePresence>
      {activeModal === 'trophy' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setActiveModal(null)}
        >
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="bg-neutral-900 border-t border-white/10 rounded-t-3xl p-6 pb-safe w-full max-w-md mx-auto h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic text-white flex items-center gap-2">
                <Trophy className="text-yellow-400" />
                ACHIEVEMENTS
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white"><X size={16}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 hide-scrollbar">
              {badges.map(badge => (
                <div key={badge.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${badge.unlockedAt ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-white/5 bg-neutral-800/50'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center border ${badge.unlockedAt ? 'border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-neutral-900 shadow-lg shadow-yellow-500/20' : 'border-neutral-700 bg-neutral-800'}`}>
                    <Trophy size={24} className={badge.unlockedAt ? 'text-yellow-400' : 'text-neutral-600'} />
                  </div>
                  <div className="flex flex-col">
                     <span className={`font-black uppercase tracking-wide text-sm ${badge.unlockedAt ? 'text-yellow-400' : 'text-neutral-400'}`}>{badge.name}</span>
                     <span className="text-xs text-neutral-400 leading-tight mt-1">{badge.description}</span>
                     {badge.unlockedAt && <span className="text-[9px] font-mono text-yellow-500/70 mt-2">UNLOCKED {new Date(badge.unlockedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
