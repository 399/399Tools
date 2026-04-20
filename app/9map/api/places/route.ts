export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { fetchPlaces } from '@/app/9map/lib/places';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') as 'homepage' | 'full' | null;

        const places = await fetchPlaces({ type: type || 'full' });

        return NextResponse.json({ data: places });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
        console.error('Feishu API Error:', error);
        return NextResponse.json({ data: [], error: error.message || 'Failed to fetch data' }, { status: 500 });
    }
}
