export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getTenantAccessToken, checkDuplicate, createRecord } from '@/app/feishu_push/lib/feishu';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items } = body; // Expecting { items: [...] }

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid input: items must be an array' }, { status: 400 });
        }

        // Limit batch size to 100 just in case
        if (items.length > 100) {
            return NextResponse.json({ error: 'Batch size limit exceeded (max 100)' }, { status: 400 });
        }

        const accessToken = await getTenantAccessToken();
        const results = [];

        // Process serially to be safe with rate limits
        for (const item of items) {
            const { shopName, address, type, location, recommended_dishes, avoid_dishes } = item;

            try {
                if (!shopName || !address || !type || !location) {
                    results.push({ status: 'error', message: '缺少必要信息', item });
                    continue;
                }

                // Check duplicate
                const existing = await checkDuplicate(accessToken, shopName, address);
                if (existing) {
                    results.push({ status: 'skipped', message: '重复记录', item, existingRecordId: existing.record_id });
                    continue;
                }

                // Create record
                const fields = {
                    'name': shopName,
                    'location': location,
                    'category': type,
                    'full_address': address,
                    'recommended_dishes': recommended_dishes || '',
                    'avoid_dishes': avoid_dishes || '',
                };

                const created = await createRecord(accessToken, fields);
                results.push({ status: 'success', data: created, item });

            } catch (err: any) {
                console.error('Error processing item:', item, err);
                results.push({ status: 'error', message: err.message, item });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Batch server error:', error);
        return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
    }
}
