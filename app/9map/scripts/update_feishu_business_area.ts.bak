
import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
// AMAP_WEB_KEY removed as it was unused and confusing
// const AMAP_WEB_KEY = process.env.NEXT_PUBLIC_AMAP_WEB_KEY || ''; 

// Using the same key from existing env if possible, or assume it's AMAP_WEB_KEY.
// Actually, let's use the same KEY for now, but commonly JS key != Web key.
// I will use 'process.env.AMAP_WEB_SERVICE_KEY' and fallback to 'process.env.NEXT_PUBLIC_AMAP_KEY' but warn.

const AMAP_KEY = process.env.AMap_WEB_SERVICE_KEY || process.env.AMAP_WEB_SERVICE_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;

interface FeishuLocationField {
    location: string;
    address?: string;
    cityname?: string;
}

async function updateBusinessAreas() {
    console.log('🚀 Starting Business Area Update Script...');

    if (!AMAP_KEY) {
        console.error('❌ Missing Amap Key (AMAP_WEB_SERVICE_KEY or NEXT_PUBLIC_AMAP_KEY)');
        return;
    }

    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    const appToken = process.env.FEISHU_APP_TOKEN;
    const tableId = process.env.FEISHU_TABLE_ID;

    if (!appId || !appSecret || !appToken || !tableId) {
        console.error('❌ Missing Feishu Config:', { appId: !!appId, appSecret: !!appSecret, appToken: !!appToken, tableId: !!tableId });
        return;
    }

    const client = new lark.Client({
        appId: appId,
        appSecret: appSecret,
    });

    try {
        // 1. Fetch all records
        console.log('📦 Fetching records from Feishu...');
        // Pagination handling would be good, but for now assuming < 500 records or just processing first batch
        const listRes = await client.bitable.appTableRecord.list({
            path: { app_token: appToken, table_id: tableId },
            params: { page_size: 100 } // Process 100 at a time
        });

        if (!listRes.data?.items) {
            console.log('⚠️ No records found.');
            return;
        }

        const items = listRes.data.items;
        console.log(`✅ Found ${items.length} records.`);

        let updatedCount = 0;
        let skippedCount = 0;
        // diffCount removed as unused

        for (const item of items) {
            const fields = item.fields;
            const recordId = item.record_id;
            const name = fields['name'] || 'Unknown'; // Lowercase 'name'
            // Assuming 'BusinessArea' is the field name locally (check user request: "BusinessArea 字段")
            // Ensure we use the correct field ID/Name.
            // If field doesn't exist in map, it might return undefined.

            const currentArea = fields['BusinessArea'] as string;
            // The location field is usually an object in Feishu: { location: "lng,lat", address: "..." } or specific columns.
            // Based on debug_feishu.ts, it seemed location was a complex field. 
            // BUT, usually we have 'Location' or specific Lat/Lng fields.
            // Let's assume 'Location' field exists and has "lng,lat" string or object.

            // Check debug_feishu output from previous turn... user didn't show output. 
            // I'll assume 'Location' field contains geocoords.
            // Location field is lowercase 'location' and is an object
            // { location: "lng,lat", ... }
            const locationVal = fields['location'] as FeishuLocationField | string | undefined;

            if (!locationVal) {
                console.log(`⏭️  Skipping ${name}: No Location data.`);
                continue;
            }

            let lng = 0, lat = 0;
            // Handle Feishu Location Type
            if (typeof locationVal === 'object' && locationVal.location) {
                [lng, lat] = locationVal.location.split(',').map(Number);
            } else if (typeof locationVal === 'string' && locationVal.includes(',')) {
                // Fallback if it's just a string
                [lng, lat] = locationVal.split(',').map(Number);
            }

            if (!lng || !lat) {
                console.log(`⏭️  Skipping ${name}: Invalid Location format.`);
                continue;
            }

            // Optimization: Skip if already valid (not empty and not 'Unknown')
            // Disabled to enforce strict "No AOI/Neighborhood" logic.
            // if (currentArea && !currentArea.includes('未知区域')) {
            //     skippedCount++;
            //     continue;
            // }

            // 2. Call Amap Regeo API
            const url = `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lng},${lat}&key=${AMAP_KEY}&radius=1000&extensions=all`;

            const amapRes = await fetch(url);
            const amapData = await amapRes.json();

            if (amapData.status === '1' && amapData.regeocode) {
                const comp = amapData.regeocode.addressComponent;
                const district = comp.district;
                const businessAreas = comp.businessAreas; // Array

                let area = '';

                // Logic: BusinessArea > Township > Street
                // Priority 1: BusinessArea (Commercial Hub)
                if (businessAreas && businessAreas.length > 0) {
                    area = businessAreas[0].name;
                }
                // Priority 2: Township (Administrative Subdistrict)
                else if (comp.township) {
                    area = comp.township;
                }
                // Priority 3: Street Name (Fallback)
                else if (comp.streetNumber && comp.streetNumber.street) {
                    area = comp.streetNumber.street;
                }

                if (!area || typeof area !== 'string') area = '未知区域';

                const businessAreaStr = `${district} / ${area}`;

                // Only update if changed
                if (currentArea === businessAreaStr) {
                    skippedCount++;
                    // continue; // Don't continue, fall through to delay
                } else {
                    console.log(`🔄 Updating ${name}: ${businessAreaStr}`);

                    // 3. Update Feishu Record
                    await client.bitable.appTableRecord.update({
                        path: { app_token: appToken, table_id: tableId, record_id: recordId! },
                        data: {
                            fields: {
                                'BusinessArea': businessAreaStr
                            }
                        }
                    });
                    updatedCount++;
                }

            } else {
                console.error(`❌ Amap Error for ${name}:`, amapData.info);
            }

            // Rate limit politeness (Throttling for EVERY call)
            await new Promise(r => setTimeout(r, 300));
        }

        console.log(`\n🎉 Done! Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    } catch (e) {
        console.error('Script Error:', e);
    }
}

updateBusinessAreas();
