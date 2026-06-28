import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, Coins } from 'lucide-react';
import { useGame } from '../context/GameContext';

const SHOP_ITEMS = [
  { id: 'shirt_red', type: 'shirtColor', value: '#ef4444', name: 'Red Shirt', price: 100 },
  { id: 'shirt_green', type: 'shirtColor', value: '#22c55e', name: 'Green Shirt', price: 100 },
  { id: 'cap_blue', type: 'cap', value: '#3b82f6', name: 'Blue Cap', price: 200 },
  { id: 'cap_red', type: 'cap', value: '#ef4444', name: 'Red Cap', price: 200 },
  { id: 'glasses_black', type: 'glasses', value: '#000000', name: 'Black Shades', price: 300 },
  { id: 'glasses_gold', type: 'glasses', value: '#fbbf24', name: 'Gold Shades', price: 500 },
  { id: 'wrist_white', type: 'wristBand', value: '#ffffff', name: 'White Band', price: 50 },
  { id: 'wrist_neon', type: 'wristBand', value: '#39ff14', name: 'Neon Band', price: 150 },
];

export function ShopModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { stats, outfit, purchaseItem } = useGame();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-white/10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-950">
              <h2 className="text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
                 Shop <Coins size={16} className="text-yellow-400" /> {stats.coins || 0}
              </h2>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
              {SHOP_ITEMS.map((item) => {
                // @ts-ignore
                const isOwned = outfit[item.type] === item.value;
                return (
                  <div key={item.id} className="bg-neutral-950 rounded-lg border border-white/5 p-2 flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0" style={{ backgroundColor: item.type === 'glasses' ? '#222' : item.value }}>
                      {item.type === 'glasses' && <div className="text-[16px]">🕶️</div>}
                      {item.type === 'cap' && <div className="text-[16px] absolute" style={{ color: item.value }}>🧢</div>}
                    </div>
                    <span className="text-[8px] font-bold text-center text-white/80 h-5 leading-tight overflow-hidden">{item.name}</span>
                    
                    {isOwned ? (
                       <div className="text-[8px] font-bold text-green-400 bg-green-400/10 px-1 py-1 rounded w-full text-center mt-auto flex items-center justify-center gap-0.5">
                          <Check size={8} /> OWNED
                       </div>
                    ) : (
                       <button
                         onClick={() => purchaseItem(item.price, { [item.type]: item.value })}
                         disabled={(stats.coins || 0) < item.price}
                         className={`text-[8px] font-bold px-1 py-1 rounded w-full text-center mt-auto flex items-center justify-center gap-0.5 transition-colors
                            ${(stats.coins || 0) >= item.price ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'}
                         `}
                       >
                         {item.price} <Coins size={8} className={(stats.coins || 0) >= item.price ? 'text-yellow-400' : 'text-white/30'} />
                       </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
