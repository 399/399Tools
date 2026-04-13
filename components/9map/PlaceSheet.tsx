import { useState, useEffect } from 'react';
import { Place } from '@/types';
import BottomSheet from './BottomSheet';
import { X, ClockCountdown, MapPinArea, CaretUp, CaretDown, Storefront, CalendarPlus, LetterCircleP, Armchair, FinnTheHuman, HandsClapping, ThumbsDown, Eyes, NavigationArrow, Copy, MapPin } from '@phosphor-icons/react';

interface PlaceSheetProps {
    place: Place | null;
    onClose: () => void;
    travelInfo?: { distance: string; time: string } | null;
}

export default function PlaceSheet({ place, onClose, travelInfo }: PlaceSheetProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Touch handling state removed (moved to BottomSheet)

    const [showNavMenu, setShowNavMenu] = useState(false);

    // Reset expanded state when place changes
    useEffect(() => {
        if (place) {
            setIsExpanded(false);
        }
    }, [place]);

    if (!place) return null;

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    // Helper component for dynamic icon loading
    const CategoryIcon = ({ place }: { place: Place }) => {
        const iconBaseUrl = 'https://img.399.be/img/icon';

        // Map category to Chinese filename
        const categoryMap: Record<string, string> = {
            'restaurant': '餐厅',
            'drink': '饮品甜点',
            'snack': '快餐小吃',
            'default': '餐厅' // Safe fallback
        };

        const categoryName = categoryMap[place.category] || categoryMap['default'];

        // Ensure safe URLs with encoding and trimming
        const safeSubCategory = place.sub_category ? encodeURIComponent(place.sub_category.trim()) : '';
        const safeCategoryName = encodeURIComponent(categoryName);

        const primarySrc = safeSubCategory ? `${iconBaseUrl}/${safeSubCategory}.png` : `${iconBaseUrl}/${safeCategoryName}.png`;
        const fallbackSrc = `${iconBaseUrl}/${safeCategoryName}.png`;

        const [src, setSrc] = useState(primarySrc);

        // Reset src when place changes
        useEffect(() => {
            setSrc(primarySrc);
        }, [primarySrc]); // Fix: Added primarySrc as dependency

        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={src}
                alt={place.sub_category || categoryName}
                className="w-16 h-16 object-contain"
                onError={() => {
                    if (src !== fallbackSrc) {
                        setSrc(fallbackSrc);
                    }
                }}
            />
        );
    };

    // Get icon for category
    const getCategoryIcon = () => {
        return <CategoryIcon place={place} />;
    };
    const getCategoryLabel = () => {
        let label = '其他';
        if (place.category === 'restaurant') label = '餐厅';
        if (place.category === 'drink') label = '饮品甜点';
        if (place.category === 'snack') label = '快餐小吃';

        if (place.sub_category) {
            return `${label} · ${place.sub_category}`;
        }
        return label;
    };

    const getTagIcon = (tag: string) => {
        const TAG_ICONS: Record<string, React.ReactNode> = {
            '连锁': <Storefront size={14} className="text-gray-600" weight="bold" />,
            '可预定': <CalendarPlus size={14} className="text-gray-600" weight="bold" />,
            '可停车': <LetterCircleP size={14} className="text-gray-600" weight="bold" />,
            '有包间': <Armchair size={14} className="text-gray-600" weight="bold" />,
        };

        for (const key in TAG_ICONS) {
            if (tag.includes(key)) {
                return TAG_ICONS[key];
            }
        }
        return null;
    };

    return (
        <>
            <BottomSheet
                isExpanded={isExpanded}
                onExpandChange={setIsExpanded}
                onClose={onClose}
            >
                {/* Header / Handle */}
                <div className="relative p-4 pb-2 flex-shrink-0 drag-handle-area">

                    {/* Mobile Handle Bar */}
                    <div
                        className="absolute top-3 left-1/2 transform -translate-x-1/2 md:hidden p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-gray-400/50 rounded-full" />
                    </div>

                    {/* Desktop Arrow (Hidden on Mobile) */}
                    <div
                        className="hidden md:flex absolute top-2 left-0 right-0 justify-center text-gray-500 cursor-pointer z-20 hover:text-gray-700 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        {isExpanded ? <CaretDown size={24} /> : <CaretUp size={24} />}
                    </div>

                    {/* Close Button (Absolute Top Right) */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100/50 transition-colors z-30"
                    >
                        <X size={24} className="text-gray-400" weight="bold" />
                    </button>

                    {/* Title Row */}
                    <div className="flex items-start mt-7 md:mt-2">
                        <h2 className={`text-[22px] font-bold text-gray-900 leading-tight pr-8 ${!isExpanded ? 'line-clamp-1' : ''}`}>
                            {place.name}
                        </h2>
                    </div>

                    {/* Tags Row */}
                    <div className="flex flex-wrap gap-2 mt-3 mb-4">
                        {place.tags && place.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 text-[12px] font-medium rounded-full bg-white/60 text-gray-700 flex items-center border border-gray-200/50 backdrop-blur-sm">
                                {getTagIcon(tag)}
                                {tag}
                            </span>
                        ))}
                        {/* Fallback if no tags */}
                        {(!place.tags || place.tags.length === 0) && (
                            <span className="px-3 py-1 text-[12px] font-medium rounded-full bg-white/60 text-gray-500 border border-gray-200/50 backdrop-blur-sm">
                                暂无标签
                            </span>
                        )}
                    </div>

                    {/* Featured Box (Icon + Quote) */}
                    {/* Featured Box (Redesigned: Silver Quality, Left/Right Split) */}
                    {/* Featured Box (Refined: Silver Layout) */}
                    {/* Featured Box (Refined: Unified Style with Left/Right Split) */}
                    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white/40">
                        {/* Removed Silver Glass Background div */}

                        <div className="relative flex h-full min-h-[140px]">
                            {/* Left Side (Auto width, min 35% - Category) */}
                            <div className="min-w-[35%] w-auto flex-shrink-0 flex flex-col items-center justify-center py-6 px-2 gap-3">
                                {/* Icon: No background/border as requested */}
                                <div className="flex items-center justify-center text-gray-700">
                                    {getCategoryIcon()}
                                </div>
                                {/* Label: Silver/White transition texture */}
                                <span className="px-3 py-1 text-[12px] font-medium rounded-full bg-gradient-to-br from-gray-100 via-white to-gray-200 border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-gray-600 whitespace-nowrap">
                                    {getCategoryLabel()}
                                </span>
                            </div>

                            {/* Vertical Divider (Gradient + White Highlight) */}
                            <div className="w-px my-6 bg-gradient-to-b from-transparent via-gray-300/50 to-transparent shadow-[1px_0_0_0_rgba(255,255,255,0.7)]" />

                            {/* Right Side (Approx 65% - Content) */}
                            <div className="flex-1 p-5 flex flex-col">
                                {/* Eyes Icon (Phosphor) */}
                                <Eyes className="text-gray-800 w-5 h-5 mb-2" weight="fill" />

                                {/* Content Text: Matches Recommended Dishes CSS (text-gray-600 leading-6) */}
                                <p className="text-gray-600 text-[14px] leading-6 font-normal line-clamp-4">
                                    {place.note || place.recommended_dishes || '暂无特别推荐'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className={`px-4 pb-8 overflow-y-auto flex-1 overscroll-contain ${isExpanded ? 'pt-2' : ''}`}>

                    {/* Expanded Content */}
                    <div className={`space-y-6 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>

                        {/* Note Block removed (moved to header) */}

                        {/* Logic: If Featured Box is showing 'recommended_dishes' (because note is missing), don't show it again here */}
                        {/* Only show Recommended Dishes block if:
                            1. It has content
                            2. AND (Featured Box is showing 'note' OR (Featured Box is showing fallback text AND Place has recommended dishes))
                            Actually simpler: If place.note exists, Featured Box shows Note. Then we show Recommended here.
                            If place.note is missing, Featured Box shows Recommended. Then we hide this block.
                         */}
                        {place.recommended_dishes && place.note && (
                            <div className="relative p-5 rounded-2xl border bg-green-50/50 border-green-100/50 flex gap-4 overflow-hidden">
                                {/* Decor Icon - Absolute positioned "Sticker" feel */}
                                {/* Green HandsClapping */}
                                <div className="absolute top-[-6px] left-[-6px] opacity-20 transform -rotate-12">
                                    <HandsClapping size={64} weight="fill" className="text-green-600" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex gap-3 w-full">
                                    <HandsClapping size={24} weight="fill" className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-green-800 font-bold mb-1 text-[15px]">值得一试</div>
                                        <p className="text-green-700/80 text-[14px] leading-6 font-medium">
                                            {place.recommended_dishes}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tags / Amenities */}

                        {/* Avoid Dishes */}
                        {place.avoid_dishes && (
                            <div className="relative p-5 rounded-2xl border bg-red-50/50 border-red-100/50 flex gap-4 overflow-hidden">
                                {/* Decor Icon - Left side now, matched style */}
                                <div className="absolute top-[-6px] left-[-6px] opacity-10 transform -rotate-12">
                                    <ThumbsDown size={80} weight="fill" className="text-red-600" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex gap-3 w-full">
                                    <ThumbsDown size={24} weight="fill" className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-red-800 font-bold mb-1 text-[15px]">谨慎选择</div>
                                        <p className="text-red-700/80 text-[14px] leading-6 font-medium">
                                            {place.avoid_dishes}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Block */}
                        <div className="p-4 bg-white/40 border border-gray-100 rounded-xl space-y-4">
                            {/* Tags / Amenities */}


                            {/* Travel Info (Driving) - Removed standalone block */}

                            {/* Average Price */}


                            {/* Average Price */}
                            {/* Average Price */}
                            {place.average_price && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <FinnTheHuman size={18} className="text-gray-600" weight="bold" />
                                    <span className="text-[14px]">人均 {place.average_price}</span>
                                </div>
                            )}

                            {/* Opening Hours */}
                            <div className="flex items-center gap-3 text-gray-600">
                                <ClockCountdown size={18} weight="bold" />
                                <span className="text-[14px]">{place.opening_hours || '暂无营业时间'}</span>
                            </div>

                            {/* Business Area (New) */}
                            {place.business_area && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <MapPin size={18} className="text-gray-600" weight="bold" />
                                    <span className="text-[14px] font-medium text-gray-800">{place.business_area}</span>
                                </div>
                            )}

                            {/* Address & Navigation */}
                            <div className="flex items-center gap-3 w-full">
                                {/* Icon */}
                                <MapPinArea size={18} className="text-gray-600 flex-shrink-0" weight="bold" />

                                {/* Text Column */}
                                <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                    {/* Address Text */}
                                    <span className="text-[14px] text-gray-600 leading-snug break-all line-clamp-2">
                                        {place.address}
                                    </span>

                                    {/* Subtitle: Travel Info */}
                                    {travelInfo && (
                                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500/80 font-medium">
                                            <span>距离我 {travelInfo.distance}</span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-gray-400" />
                                            <span>驾车 {travelInfo.time.replace(/(\d+)/g, ' $1 ')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Arrow (Click Trigger) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowNavMenu(true); }}
                                    className="p-2 -mr-2 text-gray-400 hover:text-blue-600 active:scale-95 transition-colors"
                                >
                                    <NavigationArrow size={24} weight="bold" />
                                </button>
                            </div>

                            {/* Spacer for bottom safe area */}
                        </div>

                        {/* Collapsed View Content - Removed Address Display */}
                    </div>
                </div>
            </BottomSheet>

            {/* Navigation Menu Modal (Global Bottom Sheet) */}
            {showNavMenu && (
                <div
                    className="fixed inset-0 z-[2100] flex flex-col justify-end animation-fade-in"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowNavMenu(false)}
                    />

                    {/* Modal Content */}
                    <div
                        className="relative w-full bg-[#ffffffdd] backdrop-blur-xl rounded-t-2xl shadow-2xl border-t border-white/60 overflow-hidden flex flex-col animation-slide-up pb-[env(safe-area-inset-bottom)]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle Bar */}
                        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setShowNavMenu(false)}>
                            <div className="w-10 h-1 bg-gray-400/40 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="p-4 py-3 text-center text-gray-500 text-[13px] font-medium border-b border-gray-200/50">
                            导航到 {place.name}
                        </div>

                        {/* Buttons */}
                        <button
                            className="w-full p-4 text-center text-[16px] text-blue-600 font-medium hover:bg-white/50 active:bg-gray-200/50 transition-colors border-b border-gray-200/50 flex justify-center items-center gap-2"
                            onClick={() => {
                                const [lng, lat] = place.location;
                                // AMap URL Scheme - iOS/Android
                                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                const webUrl = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(place.name)}`;

                                if (isIOS) {
                                    window.location.href = `iosamap://path?sourceApplication=9Map&dlat=${lat}&dlon=${lng}&dname=${encodeURIComponent(place.name)}&dev=0&t=0`;
                                    // Fallback to new tab
                                    setTimeout(() => {
                                        window.open(webUrl, '_blank');
                                    }, 2000);
                                } else {
                                    window.location.href = `androidamap://viewMap?sourceApplication=9Map&poiname=${encodeURIComponent(place.name)}&lat=${lat}&lon=${lng}&dev=0`;
                                    setTimeout(() => {
                                        window.open(webUrl, '_blank');
                                    }, 2000);
                                }
                                setShowNavMenu(false);
                            }}
                        >
                            高德地图
                        </button>

                        <button
                            className="w-full p-4 text-center text-[16px] text-blue-600 font-medium hover:bg-white/50 active:bg-gray-200/50 transition-colors border-b border-gray-200/50 flex justify-center items-center gap-2"
                            onClick={() => {
                                const [lng, lat] = place.location;
                                // Apple Maps
                                window.location.href = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
                                setShowNavMenu(false);
                            }}
                        >
                            Apple 地图
                        </button>

                        <button
                            className="w-full p-4 text-center text-[16px] text-blue-600 font-medium hover:bg-white/50 active:bg-gray-200/50 transition-colors flex justify-center items-center gap-2 mb-2"
                            onClick={() => {
                                navigator.clipboard.writeText(`${place.name} ${place.address}`);
                                alert('地址已复制');
                                setShowNavMenu(false);
                            }}
                        >
                            <Copy size={18} /> 拷贝地址
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
