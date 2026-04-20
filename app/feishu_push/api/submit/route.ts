import { NextResponse } from 'next/server';
import { getTenantAccessToken, checkDuplicate, createRecord, updateRecord } from '@/app/feishu_push/lib/feishu';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { shopName, address, type, location, forceUpdate, recordId, recommended_dishes, avoid_dishes } = body;

        if (!shopName || !address || !type || !location) {
            return NextResponse.json({ error: '缺少必要信息' }, { status: 400 });
        }

        // 1. Get Tenant Access Token
        const accessToken = await getTenantAccessToken();

        // 2. Duplicate Check (if not force update)
        if (!forceUpdate) {
            const existingRecord = await checkDuplicate(accessToken, shopName, address);
            if (existingRecord) {
                return NextResponse.json({
                    duplicate: true,
                    message: `似乎与已有信息 "${existingRecord.fields.name}" 重复`,
                    existingRecord: existingRecord
                }, { status: 200 });
            }
        }

        // 3. Create or Update Record
        const fields = {
            'name': shopName,
            'location': location,
            'category': type,
            'full_address': address,
            'recommended_dishes': recommended_dishes || '',
            'avoid_dishes': avoid_dishes || '',
        };

        console.log(`Sending payload to Feishu (${forceUpdate ? 'UPDATE' : 'CREATE'}):`, JSON.stringify(fields, null, 2));

        let recordData;
        if (forceUpdate && recordId) {
            recordData = await updateRecord(accessToken, recordId, fields);
        } else {
            recordData = await createRecord(accessToken, fields);
        }

        return NextResponse.json({ success: true, data: recordData });

    } catch (error: any) {
        console.error('Server error:', error);
        return NextResponse.json({ error: error.message || '服务器内部错误' }, { status: 500 });
    }
}
