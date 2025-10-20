export interface Region {
  id: string;
  name: string;
  color: string;
  minOrderAmount: number;
  deliveryTime: string;
  isActive: boolean;
  coordinates?: { lat: number; lng: number }[];
}

export interface DragDrawerProps {
  isServiceAreaDrawerOpen: boolean;
  setIsServiceAreaDrawerOpen: (open: boolean) => void;
  regions: Region[];
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
  restaurant: import('@/lib/firebase/db').Shop | null;
  isLoaded: boolean;
  loadError: boolean;
  mapCenter: { lat: number; lng: number };
}