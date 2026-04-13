import { useState, useMemo, useRef, useEffect } from 'react';
import { Place } from '@/types';
import BottomSheet from './BottomSheet';
import { getDistance } from 'geolib';
import { Storefront, ForkKnife, Coffee, Hamburger } from '@phosphor-icons/react';

interface ResultListSheetProps {
    places: Place[];
    userLocation: [number, number] | null;
    onPlaceClick: (place: Place) => void;
    isExpanded: boolean;
    onExpandChange: (expanded: boolean) => void;
}

export default function ResultListSheet({
    places,
    userLocation,
    onPlaceClick,
    isExpanded,
    onExpandChange
}: ResultListSheetProps) {
    // Local state removed in favor of props
    // Use a key to force reset state when places change, rather than useEffect
    // Or just let it be handled by logic. For 20 init doc, we can use a key on the container? 
    // Actually, setting state in useEffect when props change IS valid if done right, 
    // but React warns against cascading updates.
    // Better strategy: Derive visible slice from a "page" state that resets when places change.

    // Simplest fix for "setState in useEffect": Use a key on the component or just accept that 
    // when places change, we want to reset.
    // The lint error was "Calling setState synchronously within an effect".
    // Warning was: "Calling setState synchronously within an effect body causes cascading renders".

    // Let's use useMemo for the visible count reset logic OR just use a key.
    // Using a Ref to track previous places length?

    // Easier: Just reset count in the same place we sort? No, sortedPlaces is memoized.

    const [visibleCount, setVisibleCount] = useState(20);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [prevPlaces, setPrevPlaces] = useState(places);

    // 1. Reset visibleCount (State) when places change
    if (prevPlaces !== places) {
        setPrevPlaces(places);
        setVisibleCount(20);
    }

    // 2. Reset Scroll (DOM) when places change - Done in Effect
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [places]);

    // Sort places by distance
    const sortedPlaces = useMemo(() => {
        if (!userLocation) return places;
        return [...places].sort((a, b) => {
            const distA = getDistance(
                { latitude: userLocation[1], longitude: userLocation[0] },
                { latitude: a.location[1], longitude: a.location[0] }
            );
            const distB = getDistance(
                { latitude: userLocation[1], longitude: userLocation[0] },
                { latitude: b.location[1], longitude: b.location[0] }
            );
            return distA - distB;
        });
    }, [places, userLocation]);

    // Lazy Loading on Scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 200) {
            setVisibleCount(prev => Math.min(prev + 20, sortedPlaces.length));
        }
    };

    const visiblePlaces = sortedPlaces.slice(0, visibleCount);

    const getPlaceIcon = (category: string) => {
        switch (category) {
            case 'restaurant': return <ForkKnife weight="fill" className="text-orange-500" />;
            case 'drink': return <Coffee weight="fill" className="text-blue-500" />;
            case 'snack': return <Hamburger weight="fill" className="text-yellow-500" />;
            default: return <Storefront weight="fill" className="text-gray-500" />;
        }
    };

    const formatDistance = (place: Place) => {
        if (!userLocation) return '';
        const dist = getDistance(
            { latitude: userLocation[1], longitude: userLocation[0] },
            { latitude: place.location[1], longitude: place.location[0] }
        );
        return dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`;
    };

    return (
        <BottomSheet
            isExpanded={isExpanded}
            onExpandChange={onExpandChange}
            onClose={() => onExpandChange(false)} // Can't really "close" it to nothing, just collapse
            className={`!z-[1000] transition-all ${!isExpanded ? '!max-h-[110px]' : ''}`} // Lower z-index than PlaceSheet (2000), limit height when collapsed
        >
            {/* Header / Handle */}
            <div className={`relative flex-shrink-0 drag-handle-area transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? 'pt-[calc(4rem+env(safe-area-inset-top))] pb-2' : 'pt-4 pb-2'}`}>
                {/* Handle Bar - Hide when expanded to clean up */}
                <div className={`absolute top-3 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 ${isExpanded ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-10 h-1 bg-gray-400/30 rounded-full" />
                </div>

                {/* Title / Summary */}
                <div className="mt-4 px-4 flex justify-between items-end">
                    <div>
                        <div className="text-[13px] text-gray-500 font-medium">共 {places.length} 个好去处</div>
                        <h2 className="text-[20px] font-bold text-gray-900 leading-tight">
                            附近推荐
                        </h2>
                    </div>
                    {/* Sort Info */}
                    <div className="text-[12px] text-gray-400 mb-1">
                        {userLocation ? '按距离排序' : '默认排序'}
                    </div>
                </div>
            </div>

            {/* Scrollable List */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 pb-8"
                onScroll={handleScroll}
            >
                <div className="space-y-4 pt-2">
                    {visiblePlaces.map(place => (
                        <div
                            key={place.id}
                            className="flex gap-3 p-3 bg-white/60 hover:bg-white/80 active:bg-gray-100/50 backdrop-blur-sm rounded-xl border border-white/60 transition-colors cursor-pointer"
                            onClick={() => {
                                // Collapse first, then select
                                onExpandChange(false);
                                onPlaceClick(place);
                            }}
                        >
                            {/* Icon Box */}
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
                                {getPlaceIcon(place.category)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-900 truncate pr-2">{place.name}</h3>
                                    <span className="text-[12px] text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
                                        {formatDistance(place)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-gray-500">
                                    {place.average_price && <span>¥{place.average_price}/人</span>}
                                    {place.average_price && <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />}
                                    <span className="truncate">{place.sub_category || '美食'}</span>
                                    {place.business_area && (
                                        <>
                                            <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                                            <span className="truncate">{place.business_area}</span>
                                        </>
                                    )}
                                </div>

                                {place.recommended_dishes && (
                                    <div className="mt-2 text-[12px] text-gray-500 bg-gray-50/80 px-2 py-1 rounded-md truncate">
                                        推荐: {place.recommended_dishes}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator or End */}
                    {visiblePlaces.length < places.length ? (
                        <div className="py-4 text-center text-gray-400 text-[12px]">加载中...</div>
                    ) : (
                        <div className="py-8 text-center text-gray-300 text-[12px]">已经到底啦</div>
                    )}
                </div>
            </div>
        </BottomSheet>
    );
}
