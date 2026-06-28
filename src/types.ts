export interface CarCard {
  id: string;
  image: string; // base64
  imageRotation?: number;
  brand: string;
  model: string;
  color: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  capturedAt: number;
  location?: { lat: number; lng: number };
  engine?: string;
  year?: number;
  topSpeed?: string;
  horsepower?: string;
}

export interface PlayerStats {
  xp: number;
  level: number;
  distanceTravelled: number; // in km
  timeActive: number; // in seconds
  carsCollected: number;
  name: string;
  mapTheme?: 'dark' | 'normal';
  coins: number;
  pathHistory?: { lat: number; lng: number; timestamp: number }[];
  showPath?: boolean;
}

export interface PlayerOutfit {
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  cap?: string;
  glasses?: string;
  wristBand?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlockedAt: number | null;
  icon: string;
}
