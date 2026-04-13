'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForkKnife, Hamburger, Coffee, MapPin } from '@phosphor-icons/react';
import { Place } from '@/types';

interface MapComponentProps {
    places: Place[];
    onMarkerClick: (place: Place) => void;
    selectedPlaceId?: string;
    targetCity?: string;
    onRouteCalculated?: (info: { distance: string; time: string } | null) => void;
    onUserLocationUpdate?: (location: [number, number]) => void;
}

export interface MapRef {
    resetLocation: () => void;
}

const MapComponent = forwardRef<MapRef, MapComponentProps>(({ places, onMarkerClick, selectedPlaceId, targetCity, onRouteCalculated, onUserLocationUpdate }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstance = useRef<any>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<Map<string, any>>(new Map());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userLocation, setUserLocation] = useState<any>(null);
    const [locationFailed, setLocationFailed] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geolocationRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    useImperativeHandle(ref, () => ({
        resetLocation: () => {
            if (geolocationRef.current) {
                geolocationRef.current.getCurrentPosition();
            }
        },
    }));

    useEffect(() => {
        if (!mapContainer.current) return;

        // AMap Security Configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)._AMapSecurityConfig = {
            securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE,
        };

        AMapLoader.load({
            key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
            version: '2.0',
            plugins: ['AMap.Geolocation', 'AMap.Scale', 'AMap.ToolBar', 'AMap.DistrictSearch', 'AMap.Driving', 'AMap.Geocoder'],
        })
            .then((AMap) => {
                const map = new AMap.Map(mapContainer.current, {
                    viewMode: '3D',
                    zoom: 13, // Initial zoom synced with geolocation zoom
                    center: [121.4737, 31.2304], // Default Shanghai
                    mapStyle: 'amap://styles/light',
                });

                // Set features to show only background and roads (hide buildings and points)
                map.setFeatures(['bg', 'road']);

                // Explicitly set style again to be sure
                map.setMapStyle('amap://styles/light');

                mapInstance.current = map;
                setIsMapReady(true);

                // Geolocation Logic with Fallback
                const initGeolocation = (useHighAccuracy: boolean) => {
                    map.plugin('AMap.Geolocation', function () {
                        // Cleanup previous instance if any (though we usually only have one active)
                        if (geolocationRef.current) {
                            map.removeControl(geolocationRef.current);
                        }

                        const geolocation = new AMap.Geolocation({
                            enableHighAccuracy: useHighAccuracy,
                            timeout: 10000,
                            position: 'RB',
                            offset: [10, 20],
                            zoomToAccuracy: false, // Handle zoom manually
                            showButton: false, // Hide default button
                        });

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        geolocation.on('complete', (result: any) => {
                            console.log(`📍 Geolocation Success (${useHighAccuracy ? 'High' : 'Low'} Accuracy):`, result);
                            setUserLocation(result);
                            if (result.position && onUserLocationUpdate) {
                                onUserLocationUpdate([result.position.lng, result.position.lat]);
                            }
                        });

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        geolocation.on('error', (err: any) => {
                            if (useHighAccuracy) {
                                console.warn('⚠️ High accuracy failed, falling back to low accuracy...', err);
                                initGeolocation(false);
                            } else {
                                console.warn('📍 Geolocation failed completely. Defaulting to map view.', err);
                                setLocationFailed(true);
                            }
                        });

                        map.addControl(geolocation);
                        geolocationRef.current = geolocation;
                        geolocation.getCurrentPosition();
                    });
                };

                // Start with high accuracy
                initGeolocation(true);
            })
            .catch((e) => {
                console.error('Map loading failed', e);
            });

        return () => {
            if (mapInstance.current) {
                mapInstance.current.destroy();
            }
        };
    }, []);

    // Helper to generate marker content
    const getMarkerContent = useCallback((place: Place, isSelected: boolean, variant: 'full' | 'dot' = 'full') => {
        // DOT MODE CONTENT
        if (variant === 'dot') {
            const dot = document.createElement('div');
            dot.className = 'marker-dot';
            dot.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: white;
                border: 2px solid #374151; /* gray-700 */
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                cursor: pointer;
                pointer-events: auto;
                transform: translate(-50%, -50%);
                position: relative;
                z-index: 50; /* Below full markers */
                transition: transform 0.2s;
            `;

            // Hover effect
            dot.onmouseover = () => { dot.style.transform = 'translate(-50%, -50%) scale(1.3)'; };
            dot.onmouseout = () => { dot.style.transform = 'translate(-50%, -50%) scale(1)'; };

            // Click Handler
            dot.onclick = (e) => {
                e.stopPropagation();
                if (mapInstance.current) {
                    const map = mapInstance.current;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    map.panTo(new (window as any).AMap.LngLat(place.location[0], place.location[1]));
                    // Maintain current zoom unless it's very zoomed out (optional, based on user request "maintain")
                    // User request: "Maintain current zoom, don't stretch"
                }
                onMarkerClick(place);
            };
            return dot;
        }

        // FULL MODE CONTENT
        let IconComponent = MapPin;
        let iconColor = '#6b7280'; // gray-500

        if (place.category === 'restaurant') {
            IconComponent = ForkKnife;
            iconColor = '#374151'; // gray-700
        } else if (place.category === 'drink') {
            IconComponent = Coffee;
            iconColor = '#374151'; // gray-700
        } else if (place.category === 'snack') {
            IconComponent = Hamburger;
            iconColor = '#374151'; // gray-700
        }

        // Generate static HTML for the icon
        const iconHtml = renderToStaticMarkup(
            <IconComponent
                size={20}
                weight="bold"
                color={iconColor}
                style={{ display: 'block' }}
            />
        );

        const selectedShadow = '0 8px 20px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,165,0,0.6)';
        const normalShadow = '0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)';

        const scale = isSelected ? 1.25 : 1;
        const shadow = isSelected ? selectedShadow : normalShadow;
        const zIndex = isSelected ? 999 : 100;

        // Container
        const container = document.createElement('div');
        container.className = 'marker-container';
        container.style.cssText = `
            transform: translateY(-50%) scale(${scale});
            z-index: ${zIndex};
            pointer-events: none; /* Pass through clicks on transparent area */
            width: 48px;
            height: 48px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            transform-origin: center center;
            transition: transform 0.2s, z-index 0.2s; /* Add transition */
        `;

        // Icon Wrapper
        const iconDiv = document.createElement('div');
        iconDiv.className = 'marker-icon';
        iconDiv.style.cssText = `
            box-shadow: ${shadow};
            background-color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(0,0,0,0.05);
            position: relative;
            pointer-events: auto; /* Catch clicks on icon */
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        `;
        iconDiv.innerHTML = iconHtml;

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'marker-label';
        labelDiv.style.cssText = `
            opacity: ${isSelected ? 1 : 0.9};
            pointer-events: none;
            position: absolute;
            top: 110%;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            font-size: 14px;
            font-weight: 700;
            color: #000;
            text-shadow: -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 2px 4px rgba(0,0,0,0.3);
            transition: opacity 0.2s;
        `;
        labelDiv.innerText = place.name;

        container.appendChild(iconDiv);
        container.appendChild(labelDiv);

        // Events
        container.onmouseover = () => {
            container.style.transform = 'translateY(-50%) scale(1.25)';
            container.style.zIndex = '999';
            iconDiv.style.boxShadow = selectedShadow;
        };
        container.onmouseout = () => {
            container.style.transform = `translateY(-50%) scale(${scale})`;
            container.style.zIndex = `${zIndex}`;
            iconDiv.style.boxShadow = shadow;
        };

        // Click Handler (Directly on Icon)
        const handleClick = (e: MouseEvent) => {
            e.stopPropagation();
            if (mapInstance.current) {
                const map = mapInstance.current;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const targetLngLat = new (window as any).AMap.LngLat(place.location[0], place.location[1]);

                // Smart Pan: Only pan if obscured by Bottom Sheet
                const pixel = map.lngLatToContainer(targetLngLat);
                const containerHeight = map.getContainer().clientHeight;
                const containerWidth = map.getContainer().clientWidth;

                // Estimate Bottom Sheet Height (when expanded) approx 380px
                const BOTTOM_OBSCURED_HEIGHT = 400;
                // Also adding top/side padding to ensure it's comfortably visible
                const TOP_PADDING = 100;
                const SIDE_PADDING = 50;

                const isObscuredBottom = pixel.y > (containerHeight - BOTTOM_OBSCURED_HEIGHT);
                const isObscuredTop = pixel.y < TOP_PADDING;
                const isObscuredSide = pixel.x < SIDE_PADDING || pixel.x > (containerWidth - SIDE_PADDING);

                if (isObscuredBottom || isObscuredTop || isObscuredSide) {
                    // Pan to center (simple and robust)
                    map.panTo(targetLngLat);
                }
                // Else: It's clearly visible, so don't move the map (User Request)
            }
            onMarkerClick(place);
        };

        iconDiv.onclick = handleClick;
        return container;
    }, [onMarkerClick]);

    // Debounce function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debounce = (func: (...args: any[]) => void, wait: number) => {
        let timeout: NodeJS.Timeout;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Update visible markers based on viewport
    const updateVisibleMarkers = useCallback(() => {
        if (!mapInstance.current || places.length === 0) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;
        const map = mapInstance.current;
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        // Update zoom level attribute for CSS styling
        if (mapContainer.current) {
            let zoomLevel = 'high';
            if (zoom < 11) zoomLevel = 'low';
            else if (zoom < 16) zoomLevel = 'medium';

            mapContainer.current.setAttribute('data-zoom', zoomLevel);
        }

        // Keep track of markers that should remain (using representative Place IDs)
        const activeMarkerIds = new Set<string>();
        const occupiedRegions: { x: number, y: number }[] = [];

        // Sort places: Selected place first (to ensure it becomes cluster head), then by latitude
        const sortedPlaces = [...places].sort((a, b) => {
            if (a.id === selectedPlaceId) return -1;
            if (b.id === selectedPlaceId) return 1;
            return b.location[1] - a.location[1]; // Stable deterministic sort
        });

        const CLUSTER_THRESHOLD = 50; // px - Increased to ensure dots appear when crowded

        sortedPlaces.forEach(place => {
            const [lng, lat] = place.location;
            if (!bounds.contains(new AMap.LngLat(lng, lat))) return; // Skip invisible

            const pixel = map.lngLatToContainer(new AMap.LngLat(lng, lat));

            // Check collision with existing FULL markers
            let isColliding = false;
            for (const region of occupiedRegions) {
                const distance = Math.sqrt(Math.pow(pixel.x - region.x, 2) + Math.pow(pixel.y - region.y, 2));
                if (distance < CLUSTER_THRESHOLD) {
                    isColliding = true;
                    break;
                }
            }

            const variant = isColliding ? 'dot' : 'full';

            // Mark this region as occupied regardless of variant (Dots also take up space)
            // This prevents "Full" markers from overlapping "Dots', creating a cleaner chain
            occupiedRegions.push({ x: pixel.x, y: pixel.y });

            // Render Marker
            activeMarkerIds.add(place.id);
            let marker = markersRef.current.get(place.id);
            const isSelected = place.id === selectedPlaceId;

            // Check if updates are needed using extData
            const needsUpdate = !marker ||
                (marker.getExtData && marker.getExtData().isSelected !== isSelected) ||
                (marker.getExtData && marker.getExtData().variant !== variant);

            if (needsUpdate) {
                // Pass variant to generation function
                const content = getMarkerContent(place, isSelected, variant);

                if (!marker) {
                    // Create new marker
                    marker = new AMap.Marker({
                        position: new AMap.LngLat(lng, lat),
                        content: content,
                        offset: variant === 'dot' ? new AMap.Pixel(0, 0) : new AMap.Pixel(0, 0),
                        anchor: 'center',
                        zIndex: isSelected ? 999 : (variant === 'dot' ? 50 : 100),
                        clickable: false, // Critical: Disable AMap internal click handling
                        extData: { id: place.id, isSelected, variant }
                    });

                    marker.setMap(map);
                    markersRef.current.set(place.id, marker);
                } else {
                    // Update existing
                    marker.setContent(content);
                    marker.setExtData({ id: place.id, isSelected, variant });

                    // Update Z-Index
                    const targetZIndex = isSelected ? 999 : (variant === 'dot' ? 50 : 100);
                    if (typeof marker.setzIndex === 'function') marker.setzIndex(targetZIndex);
                    else if (typeof marker.setZIndex === 'function') marker.setZIndex(targetZIndex);

                    // Update position
                    marker.setPosition(new AMap.LngLat(lng, lat));

                    // Update Offset/Anchor if changing variants (full <-> dot)
                    // Currently both are center anchored, but let's be safe.
                    // marker.setAnchor('center'); 
                }
            } else {
                marker.setPosition(new AMap.LngLat(lng, lat));
            }
        });

        // Cleanup markers that are NOT in the active render list
        markersRef.current.forEach((marker, id) => {
            if (!activeMarkerIds.has(id)) {
                marker.setMap(null);
                markersRef.current.delete(id);
            }
        });

    }, [places, selectedPlaceId, getMarkerContent]);

    // Use a Ref to hold the latest version of updateVisibleMarkers to allow stable debounce
    const updateVisibleMarkersRef = useRef(updateVisibleMarkers);
    // useLayoutEffect usually better for sync refs but useEffect is fine mostly. useLayoutEffect satisfies React rules better for refs.
    // However, since we are in Next.js which might SSR, useLayoutEffect might warn.
    // Let's stick to useEffect or just bare assignment if strict mode isn't complaining about side effects?
    // Actually, simple ref assignment during render IS the problem linter complains about.
    // So we use useEffect to update the ref.
    useEffect(() => {
        updateVisibleMarkersRef.current = updateVisibleMarkers;
    }, [updateVisibleMarkers]);


    // Create a stable debounce wrapper that calls the ref
    const debouncedUpdate = useMemo(() => {
        // eslint-disable-next-line react-hooks/refs
        return debounce(() => {
            if (updateVisibleMarkersRef.current) updateVisibleMarkersRef.current();
        }, 100);
    }, []);

    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        // Initial update
        updateVisibleMarkers();

        // Listen to moveend and zoomend
        map.on('moveend', debouncedUpdate);
        map.on('zoomend', debouncedUpdate);

        return () => {
            map.off('moveend', debouncedUpdate);
            map.off('zoomend', debouncedUpdate);

            // Cleanup all markers when unmounting or places change significantly
            // So we need to handle "removed places" too.

            // Simple cleanup for safety:
            if (places.length === 0) {
                markersRef.current.forEach((marker) => marker.setMap(null));
                markersRef.current.clear();
            }
        };
    }, [places, isMapReady, selectedPlaceId, onMarkerClick, debouncedUpdate, updateVisibleMarkers]); // Re-run if these change

    // Calculate Route when selection changes
    useEffect(() => {
        if (!isMapReady || !mapInstance.current || !selectedPlaceId || !onMarkerClick || !onRouteCalculated) {
            return;
        }

        const place = places.find(p => p.id === selectedPlaceId);
        if (!place) return;

        // Verify User Location
        // Note: userLocation might be null if failed. 
        // We can check geolocationRef.current check status? Or just rely on userLocation state.
        // Assuming userLocation is set from Geolocation success
        if (!userLocation) {
            console.log('User location not ready for route calculation');
            if (onRouteCalculated) onRouteCalculated(null);
            return;
        }

        const map = mapInstance.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;


        // Load Driving Plugin specifically if not ready (though we preloaded it)
        map.plugin('AMap.Driving', function () {
            const driving = new AMap.Driving({
                policy: AMap.DrivingPolicy.LEAST_TIME,
                map: null, // Don't draw route on map automatically (user just wants info?)
                // If user wants lines, set map: map. But typically this is for info only.
                // User said "Show distance and time", didn't explicitly say "Draw line".
                // "Lightweight" implies maybe don't draw messy lines unless asked.
                // Let's NOT set map: map to keep it clean, just fetch data.
            });

            const start = new AMap.LngLat(userLocation.position.lng, userLocation.position.lat);
            const end = new AMap.LngLat(place.location[0], place.location[1]);

            console.log('🚗 Calculating route...', start, end);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            driving.search(start, end, function (status: string, result: any) {
                if (status === 'complete') {
                    if (result.routes && result.routes.length) {
                        const route = result.routes[0];
                        const distance = route.distance; // meters
                        const time = route.time; // seconds

                        // Format
                        let distanceText = '';
                        if (distance > 1000) {
                            distanceText = (distance / 1000).toFixed(1) + 'km';
                        } else {
                            distanceText = distance + 'm';
                        }

                        // Format Time
                        let timeText = '';
                        const hours = Math.floor(time / 3600);
                        const minutes = Math.ceil((time % 3600) / 60);

                        if (hours > 0) {
                            timeText = `${hours}小时${minutes}分钟`;
                        } else {
                            timeText = `${minutes}分钟`;
                        }

                        // Callback
                        if (onRouteCalculated) {
                            onRouteCalculated({
                                distance: distanceText,
                                time: timeText,
                                // Future: tolls, traffic lights could go here
                            });
                        }
                    }
                } else {
                    console.warn('Driving route failed:', result);
                    if (onRouteCalculated) onRouteCalculated(null);
                }
            });
        });

    }, [selectedPlaceId, userLocation, isMapReady, places, onRouteCalculated, onMarkerClick]); // Depend on userLocation to retry if it comes late

    // Efficiently update selected state without re-creating markers
    useEffect(() => {
        if (!isMapReady) return;

        markersRef.current.forEach((marker, id) => {
            const place = places.find(p => p.id === id);
            if (place) {
                const isSelected = id === selectedPlaceId;
                const content = getMarkerContent(place, isSelected);
                marker.setContent(content);

                // Safe zIndex setting (API v2 might use setzIndex or setTop)
                if (typeof marker.setzIndex === 'function') {
                    marker.setzIndex(isSelected ? 999 : 100);
                } else if (typeof marker.setZIndex === 'function') {
                    marker.setZIndex(isSelected ? 999 : 100);
                } else if (typeof marker.setTop === 'function') {
                    marker.setTop(isSelected);
                }
            }
        });
    }, [selectedPlaceId, isMapReady, places, getMarkerContent]);

    // Smart Location Centering
    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        if (!userLocation && !locationFailed) return; // Wait for geolocation result (success or fail)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;
        const map = mapInstance.current;
        const result = userLocation;

        let shouldCenterOnUser = false;

        if (result) {
            // Strategy 1: Check City Name (Best for explicit city matching)
            if (result.addressComponent) {
                const userCity = result.addressComponent.city || result.addressComponent.province;
                const target = targetCity || '上海市';

                console.log('📍 User City:', userCity);
                console.log('📍 Target City:', target);

                if (userCity && target && (userCity.includes(target) || target.includes(userCity))) {
                    shouldCenterOnUser = true;
                }
            }

            // Strategy 2: Distance Check (Fallback if city name fails or is blocked)
            // If user is within 50km of the first place, assume they are in the same city.
            if (!shouldCenterOnUser && result.position && places.length > 0) {
                const userLocationLngLat = result.position; // AMap.LngLat
                const firstPlace = places[0];
                const placeLocation = new AMap.LngLat(firstPlace.location[0], firstPlace.location[1]);

                const distance = userLocationLngLat.distance(placeLocation); // Meters
                console.log('📍 Distance to first place:', distance, 'meters');

                if (distance < 50000) { // 50km threshold
                    shouldCenterOnUser = true;
                    console.log('📍 Within 50km, centering on user.');
                }
            }
        }

        console.log('📍 Should Center on User:', shouldCenterOnUser);

        if (shouldCenterOnUser && result) {
            // User is in the city -> Center on user
            console.log('📍 Centering on User Position:', result.position);
            map.setCenter(result.position);
            map.setZoom(13); // Position Lock Zoom Level
        } else {
            // User is NOT in the city OR Geolocation Failed -> Center on places with fixed Zoom 13
            if (places.length > 0) {
                let totalLng = 0, totalLat = 0;
                places.forEach(p => {
                    totalLng += p.location[0];
                    totalLat += p.location[1];
                });
                const centerLng = totalLng / places.length;
                const centerLat = totalLat / places.length;

                map.setCenter(new AMap.LngLat(centerLng, centerLat));
                map.setZoom(13); // Fixed zoom level to match "In City" experience
            }
        }
    }, [isMapReady, userLocation, locationFailed, places, targetCity]);


    // City Boundary Masking logic removed (cleanup)


    return (
        <div className="relative w-full h-full">
            {/* Top Gradient Mask (Smooth 8-point) */}
            <div
                className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 10%, rgba(255, 255, 255, 0.85) 20%, rgba(255, 255, 255, 0.65) 35%, rgba(255, 255, 255, 0.35) 60%, rgba(255, 255, 255, 0.15) 80%, rgba(255, 255, 255, 0) 100%)'
                }}
            />

            {/* Bottom Gradient Mask (Smooth 8-point) */}
            <div
                className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 10%, rgba(255, 255, 255, 0.85) 20%, rgba(255, 255, 255, 0.65) 35%, rgba(255, 255, 255, 0.35) 60%, rgba(255, 255, 255, 0.15) 80%, rgba(255, 255, 255, 0) 100%)'
                }}
            />

            {/* City Title Overlay */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[5] pointer-events-none flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900 drop-shadow-sm">{targetCity || '上海'}</span>
            </div>

            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;
