import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Camera, Image as ImageIcon, X, Zap, Info, CheckCircle2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useLocationTracker } from '../hooks/useLocationTracker';

export function CameraPage() {
  const navigate = useNavigate();
  const { addCar } = useGame();
  const { currentPosition } = useLocationTracker();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [zoomRange, setZoomRange] = useState<{min: number, max: number, step: number} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(1);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoomLevel = useRef<number>(1);
  const initialDigitalZoom = useRef<number>(1);

  const funnyQuotes = [
    "CHECKING BLINKER FLUID...",
    "COUNTING THE CUP HOLDERS...",
    "CALCULATING HORSEPOWER...",
    "MEASURING TRUNK SPACE FOR GROCERIES...",
    "VERIFYING NEW CAR SMELL...",
    "INSPECTING RACING STRIPES...",
  ];

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % funnyQuotes.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const track = mediaStream.getVideoTracks()[0];
        videoTrackRef.current = track;
        
        // Timeout to allow capabilities to populate in some browsers
        setTimeout(() => {
          if (track.getCapabilities) {
            const capabilities = track.getCapabilities() as any;
            if (capabilities.zoom) {
              setZoomRange({
                min: capabilities.zoom.min || 1,
                max: capabilities.zoom.max || 5,
                step: capabilities.zoom.step || 0.1
              });
              const settings = track.getSettings() as any;
              setZoomLevel(settings.zoom || 1);
            }
          }
        }, 500);
      } catch (err) {
        console.error("Camera access failed", err);
        setError("Camera access denied. Use the gallery button to upload a photo.");
      }
    };
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const processImage = async (base64Image: string) => {
    setIsScanning(true);
    setCapturedImage(base64Image);
    setError(null);
    
    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }
      
      if (!data.isCar) {
        setError("No car detected in the image. Please try again.");
        setIsScanning(false);
        setCapturedImage(null);
        return;
      }
      
      setScanResult(data);
      setIsScanning(false);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error communicating with the scanner.");
      setIsScanning(false);
      setCapturedImage(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && !capturedImage) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      initialZoomLevel.current = zoomLevel;
      initialDigitalZoom.current = digitalZoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current && !capturedImage) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scale = distance / initialPinchDistance.current;
      
      if (zoomRange && videoTrackRef.current) {
        let newZoom = initialZoomLevel.current * scale;
        newZoom = Math.max(zoomRange.min, Math.min(newZoom, zoomRange.max));
        setZoomLevel(newZoom);
        
        videoTrackRef.current.applyConstraints({
          advanced: [{ zoom: newZoom }]
        } as any).catch(console.error);
      } else {
        // Fallback to CSS digital zoom
        let newZoom = initialDigitalZoom.current * scale;
        newZoom = Math.max(1, Math.min(newZoom, 5)); // Cap digital zoom at 5x
        setDigitalZoom(newZoom);
      }
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Calculate crop dimensions for digital zoom if native zoom isn't supported
      let srcX = 0, srcY = 0, srcWidth = video.videoWidth, srcHeight = video.videoHeight;
      if (!zoomRange && digitalZoom > 1) {
         srcWidth = video.videoWidth / digitalZoom;
         srcHeight = video.videoHeight / digitalZoom;
         srcX = (video.videoWidth - srcWidth) / 2;
         srcY = (video.videoHeight - srcHeight) / 2;
      }
      
      canvas.width = srcWidth;
      canvas.height = srcHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        processImage(base64Image);
      }
    }
  }, [videoRef, canvasRef, digitalZoom, zoomRange]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          processImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToGarage = () => {
    if (scanResult && capturedImage) {
      addCar({
        image: capturedImage,
        brand: scanResult.brand,
        model: scanResult.model,
        color: scanResult.color,
        rarity: scanResult.rarity,
        engine: scanResult.engine,
        year: scanResult.year,
        topSpeed: scanResult.topSpeed,
        horsepower: scanResult.horsepower,
        location: currentPosition || undefined,
      });
      navigate('/garage');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-12 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
        >
          <X size={20} />
        </button>
        <button 
          onClick={() => setIsGuideOpen(true)}
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Viewport */}
      <div 
        className="flex-1 relative overflow-hidden bg-neutral-900"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {!capturedImage ? (
           <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-75"
                style={{ transform: !zoomRange ? `scale(${digitalZoom})` : 'none' }}
              />
              {/* Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                 </div>
              </div>
           </>
        ) : (
           <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover filter brightness-75" />
        )}
        
        {/* Scanning Overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center z-30"
            >
              <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                {/* Modern scanning animation */}
                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full" />
                <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-[spin_1s_linear_infinite]" />
                <div className="absolute inset-2 border-2 border-indigo-500/30 rounded-full" />
                <div className="absolute inset-2 border-b-2 border-indigo-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
                <Zap size={32} className="text-blue-400 animate-pulse" />
              </div>
              <p className="text-white font-mono font-bold tracking-widest mb-2">ANALYZING VEHICLE</p>
              <p className="text-blue-400 text-xs font-mono tracking-widest text-center px-6 h-4 transition-all">
                {funnyQuotes[quoteIndex]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!scanResult && !isScanning && (
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex justify-between items-center bg-gradient-to-t from-black via-black/80 to-transparent z-20">
          <button 
             onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20"
          >
            <ImageIcon size={20} />
          </button>
          
          <button 
             onClick={capturePhoto}
             className="w-20 h-20 rounded-full border-4 border-white/30 p-1 relative group"
          >
             <div className="w-full h-full rounded-full bg-white transition-transform group-active:scale-90" />
          </button>
          
          <div className="w-12 h-12" /> {/* Spacer */}
        </div>
      )}

      {/* Result Overlay */}
      <AnimatePresence>
        {scanResult && !isScanning && (
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            className="absolute bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] p-6 pb-12 z-40 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
          >
             <div className="w-16 h-1.5 bg-neutral-700 rounded-full mx-auto mb-8" />
             
             <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400">TARGET ACQUIRED</span>
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">{scanResult.brand}</h2>
                  <p className="text-xl font-bold text-neutral-400 tracking-tight">{scanResult.model}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-2xl border flex flex-col items-center justify-center ${scanResult.rarity === 'Legendary' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : scanResult.rarity === 'Rare' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-neutral-500/50 bg-neutral-500/10 text-neutral-400'}`}>
                   <span className="text-[9px] font-bold tracking-widest text-neutral-500 mb-0.5">CLASS</span>
                   <span className="text-xs font-black tracking-widest uppercase">{scanResult.rarity}</span>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-neutral-900/80 rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                   <p className="text-[10px] text-neutral-500 font-bold tracking-wider mb-2">COLOR SPEC</p>
                   <p className="text-base font-black text-white capitalize flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: scanResult.color.toLowerCase() }} />
                     {scanResult.color}
                   </p>
                </div>
                <div className="bg-neutral-900/80 rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                   <p className="text-[10px] text-neutral-500 font-bold tracking-wider mb-2">MATCH CONFIDENCE</p>
                   <div className="flex items-end gap-1">
                     <p className="text-2xl font-black text-white leading-none">{scanResult.confidence}</p>
                     <span className="text-sm font-bold text-neutral-500 mb-0.5">%</span>
                   </div>
                </div>
             </div>
             
             {/* Extended Details */}
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
                <div className="bg-neutral-900/50 rounded-xl p-3 border border-white/5">
                   <p className="text-[9px] text-neutral-500 font-bold tracking-wider mb-1 uppercase">Top Speed</p>
                   <p className="text-sm font-black text-white">{scanResult.topSpeed} <span className="text-[10px] text-neutral-500 font-normal">mph</span></p>
                </div>
                <div className="bg-neutral-900/50 rounded-xl p-3 border border-white/5">
                   <p className="text-[9px] text-neutral-500 font-bold tracking-wider mb-1 uppercase">Horsepower</p>
                   <p className="text-sm font-black text-white">{scanResult.horsepower} <span className="text-[10px] text-neutral-500 font-normal">hp</span></p>
                </div>
                <div className="bg-neutral-900/50 rounded-xl p-3 border border-white/5">
                   <p className="text-[9px] text-neutral-500 font-bold tracking-wider mb-1 uppercase">Engine</p>
                   <p className="text-sm font-black text-white truncate">{scanResult.engine}</p>
                </div>
                <div className="bg-neutral-900/50 rounded-xl p-3 border border-white/5">
                   <p className="text-[9px] text-neutral-500 font-bold tracking-wider mb-1 uppercase">Year</p>
                   <p className="text-sm font-black text-white">{scanResult.year}</p>
                </div>
             </div>

             <div className="flex gap-4">
               <button 
                 onClick={() => {
                   setScanResult(null);
                   setCapturedImage(null);
                 }}
                 className="flex-1 py-4 rounded-2xl font-bold tracking-wider text-sm bg-neutral-900 border border-white/10 text-neutral-400 hover:bg-neutral-800 transition-colors"
               >
                 DISCARD
               </button>
               <button 
                 onClick={saveToGarage}
                 className="flex-[2] py-4 rounded-2xl font-black tracking-wider text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-colors"
               >
                 <Zap size={18} className="fill-white" />
                 ADD TO GARAGE
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error Overlay */}
      <AnimatePresence>
         {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-6 right-6 bg-red-900/90 backdrop-blur-md text-white p-4 rounded-2xl border border-red-500/50 shadow-2xl z-50 flex flex-col items-center text-center"
            >
               <p className="text-sm font-bold">{error}</p>
               <button 
                 onClick={() => { setError(null); setCapturedImage(null); }}
                 className="mt-3 px-6 py-2 bg-white text-red-900 rounded-full text-xs font-black tracking-wider"
               >
                 TRY AGAIN
               </button>
            </motion.div>
         )}
      </AnimatePresence>
      
      {/* Guide Popup */}
      <AnimatePresence>
        {isGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            onClick={() => setIsGuideOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-xl font-black text-white mb-4">HOW TO SNAP</h3>
              <p className="text-sm text-neutral-400 mb-6">Follow these tips for the most accurate car identification.</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Clear Front/Side View</h4>
                    <p className="text-xs text-neutral-500 mt-1">Capture the full front or side profile of the car. Avoid obscure angles.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Good Lighting</h4>
                    <p className="text-xs text-neutral-500 mt-1">Ensure the car is well-lit. Avoid taking photos in pitch dark or against strong backlights.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Fill the Frame</h4>
                    <p className="text-xs text-neutral-500 mt-1">The car should take up most of the target box. Move closer if needed.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsGuideOpen(false)}
                className="w-full py-4 rounded-xl bg-white text-black font-black text-sm tracking-wider hover:bg-neutral-200 transition-colors"
              >
                GOT IT
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
