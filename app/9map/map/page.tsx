'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PlaceSheet from '@/app/9map/components/PlaceSheet';
import FilterBar from '@/app/9map/components/FilterBar';
import ResultListSheet from '@/app/9map/components/ResultListSheet';
import { Place } from '@/app/9map/types';
import { Locate, ArrowLeft } from 'lucide-react';
import { MapRef } from '@/app/9map/components/MapComponent';

const MapComponent = dynamic(() => import('@/app/9map/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />
});

import { useSearchParams } from 'next/navigation';

function MapContent() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'restaurant' | 'drink'>('all');
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const mapRef = useRef<MapRef>(null);
  const searchParams = useSearchParams();
  const cityParam = searchParams.get('city');

  useEffect(() => {
    async function fetchPlaces() {
      try {
        const res = await fetch('/9map/api/places');
        const data = await res.json();
        const allPlaces: Place[] = data.data;

        // Filter by city if param exists
        const filteredByCity = cityParam
          ? allPlaces.filter(p => (p.city || '上海市') === cityParam)
          : allPlaces;

        setPlaces(filteredByCity);
      } catch (error) {
        console.error('Failed to fetch places:', error);
      }
    }
    fetchPlaces();
  }, [cityParam]);
  // Handle Filtering
  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') {
      return places;
    }
    return places.filter(p => p.category === activeFilter);
  }, [activeFilter, places]);

  const handleResetLocation = () => {
    if (mapRef.current) {
      mapRef.current.resetLocation();
    }
  };



  return (
    <main className="relative w-full h-[100dvh] overflow-hidden">
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 right-4 z-10 flex gap-3 pointer-events-none">
        <Link
          href="/9map"
          className="pointer-events-auto w-12 h-12 bg-[#ffffff85] backdrop-blur-md rounded-full border border-white/50 shadow-soft-1 flex items-center justify-center text-gray-700 hover:bg-white/80 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
      </div>

      <MapComponent
        ref={mapRef}
        places={filteredPlaces}
        onMarkerClick={setSelectedPlace}
        selectedPlaceId={selectedPlace?.id}
        targetCity={cityParam || undefined}
        onRouteCalculated={setRouteInfo}
        onUserLocationUpdate={setUserLocation}
      />

      {/* Location Reset Button */}
      <button
        onClick={handleResetLocation}
        className="absolute bottom-[160px] right-4 z-10 w-12 h-12 bg-[#ffffff85] backdrop-blur-md rounded-full border border-white/50 shadow-soft-1 flex items-center justify-center hover:bg-white/80 transition-all duration-300 active:scale-95"
        aria-label="重置位置"
      >
        <Locate className="w-6 h-6 text-gray-700" />
      </button>

      {/* Top Bar Background (Visible when list is expanded) */}
      <div
        className={`fixed top-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-top))] bg-white/95 backdrop-blur-md z-[1400] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] border-b border-gray-100 ${isListExpanded ? 'translate-y-0 opacity-100 shadow-sm' : '-translate-y-full opacity-0'
          }`}
      />

      {/* Filter Bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        variant={isListExpanded ? 'inline' : 'pill'}
        className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isListExpanded
          ? 'top-[calc(1rem+env(safe-area-inset-top)+6px)] !bottom-auto' /* Top aligns with Back Button (h-12 vs h-9ish), add offset to center */
          : '' /* Default is bottom-[140px] */
          }`}
      />

      {/* Result List Sheet (Only show if no place selected) */}
      {!selectedPlace && (
        <ResultListSheet
          places={filteredPlaces}
          userLocation={userLocation}
          onPlaceClick={setSelectedPlace}
          isExpanded={isListExpanded}
          onExpandChange={setIsListExpanded}
        />
      )}

      <PlaceSheet
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        travelInfo={routeInfo}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-gray-100 flex items-center justify-center">Loading...</div>}>
      <MapContent />
    </Suspense>
  );
}
