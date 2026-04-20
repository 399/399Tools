import { Suspense } from 'react';
import CityGrid from '@/app/9map/components/CityGrid';
import CityGridSkeleton from '@/app/9map/components/CityGridSkeleton';

export default function Gallery() {
    return (
        <main className="min-h-screen bg-cream p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 text-center md:text-left">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        9Map <span className="text-apricot">Gallery</span>
                    </h1>
                    <p className="text-gray-500 text-lg max-w-2xl">
                        发现城市的角落。选择一个地图开始探索。
                    </p>
                </header>

                <Suspense fallback={<CityGridSkeleton />}>
                    <CityGrid />
                </Suspense>
            </div>
        </main>
    );
}
