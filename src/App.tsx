import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { GameProvider } from './context/GameContext';
import { Navigation } from './components/Navigation';
import { MapPage } from './pages/MapPage';
import { CameraPage } from './pages/CameraPage';
import { GaragePage } from './pages/GaragePage';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="bg-neutral-950 text-white min-h-screen font-sans selection:bg-blue-500/30 flex flex-col max-w-md mx-auto relative overflow-hidden shadow-2xl">
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/garage" element={<GaragePage />} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}
