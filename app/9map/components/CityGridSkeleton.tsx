export default function CityGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-[320px] bg-white/50 rounded-[32px] animate-pulse" />
            ))}
        </div>
    );
}
