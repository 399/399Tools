import { Place, PlaceCategory } from '@/types';
import { client, FEISHU_APP_TOKEN, FEISHU_TABLE_ID } from '@/lib/feishu';

export async function fetchPlaces(options: { type?: 'homepage' | 'full' } = { type: 'full' }) {
    // If Feishu config is missing, return empty
    if (!FEISHU_APP_TOKEN || !FEISHU_TABLE_ID) {
        console.warn('Feishu config missing');
        return [];
    }

    interface FeishuLocation {
        location: string;
        address: string;
        cityname: string;
    }

    interface ListParams {
        page_size: number;
        field_names?: string;
    }

    type FeishuFieldValue = string | number | boolean | object | null | undefined;

    const params: ListParams = {
        page_size: 100,
    };

    // Filter fields if homepage
    if (options.type === 'homepage') {
        // Only request fields that actually exist.
        // 'city' and 'address' columns do not exist.
        // Must use JSON.stringify for field_names in this SDK/API version.
        params.field_names = JSON.stringify(['location', 'full_address', 'name', 'category']);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - SDK types might mismatch with strict local types, so we cast to unknown then compatible type if needed, but SDK usually accepts object.
    const res = await client.bitable.appTableRecord.list({
        path: {
            app_token: FEISHU_APP_TOKEN,
            table_id: FEISHU_TABLE_ID,
        },
        params: params,
    });

    if (!res.data?.items) {
        return [];
    }

    const places: Place[] = res.data.items
        .map((item) => {
            const fields = item.fields as Record<string, FeishuFieldValue>;

            // Parse Feishu "Location" field
            let lng = 0;
            let lat = 0;
            // Use full_address as the primary source for address
            let address = (fields['full_address'] as string) || '';
            let city = '';

            const locationField = fields['location'] as FeishuLocation | undefined;
            if (locationField && typeof locationField === 'object' && locationField.location) {
                const [lngStr, latStr] = locationField.location.split(',');
                lng = Number(lngStr);
                lat = Number(latStr);

                if (!address && locationField.address) {
                    address = locationField.address;
                }

                // We ignore locationField.cityname as user wants to rely on full_address parsing
                // or we use it as a secondary fallback? 
                // User said "Database has no city column... Extract from full_address".
                // But locationField might have cityname from the map selection.
                // Let's use it if extraction fails.
                if (locationField.cityname) {
                    city = locationField.cityname.replace('市', ''); // Normalize to "上海"
                }
            }

            // Transform: Extract city from full_address
            // Logic: Extract content before "市"
            if (fields['full_address']) {
                const fullAddr = fields['full_address'] as string;
                // Regex to match start of string up to '市'
                // e.g. "上海市..." -> "上海"
                // e.g. "北京市..." -> "北京"
                // e.g. "浙江省杭州市..." -> "杭州" (Need to handle province?)
                // User example: "上海市黄浦区..." -> "上海"

                // Try to match "XX市"
                const cityMatch = fullAddr.match(/([^省]+)市/);
                if (cityMatch) {
                    city = cityMatch[1];
                } else {
                    // Fallback heuristics for major cities if "市" is missing or complex
                    if (fullAddr.includes('上海')) city = '上海';
                    else if (fullAddr.includes('北京')) city = '北京';
                    else if (fullAddr.includes('杭州')) city = '杭州';
                    else if (fullAddr.includes('深圳')) city = '深圳';
                    else if (fullAddr.includes('广州')) city = '广州';
                    else if (fullAddr.includes('成都')) city = '成都';
                }
            }

            // Default fallback
            if (!city) {
                city = '上海';
            }

            let category: PlaceCategory = 'other';
            // Only parse category if we requested it (full mode)
            if (options.type !== 'homepage') {
                const rawCategory = fields['category'] as string;
                if (rawCategory === '餐厅') category = 'restaurant';
                else if (rawCategory === '饮品甜点') category = 'drink';
                else if (rawCategory === '快餐小吃') category = 'snack';
            } else {
                // Even in homepage mode, we requested category, so let's map it if present
                const rawCategory = fields['category'] as string;
                if (rawCategory === '餐厅') category = 'restaurant';
                else if (rawCategory === '饮品甜点') category = 'drink';
                else if (rawCategory === '快餐小吃') category = 'snack';
            }

            return {
                id: item.record_id || '',
                name: (fields['name'] as string) || '',
                category: category,
                location: [lng, lat] as [number, number],
                address: address,
                city: city,
                note: (fields['note'] as string) || '',
                recommended_dishes: (fields['recommended_dishes'] as string) || '',
                avoid_dishes: (fields['avoid_dishes'] as string) || '',
                tags: fields['tags'] ? (Array.isArray(fields['tags']) ? (fields['tags'] as string[]) : [(fields['tags'] as string)]) : [],
                opening_hours: (fields['opening_hours'] as string) || '',
                average_price: (fields['average_price'] as string) || '',
                sub_category: (fields['category_link'] as string) || '',
                business_area: (fields['BusinessArea'] as string) || '',
            };
        })
        .filter((place) => {
            // For homepage, we just need valid city info.
            // But the original filter was `place.name && place.location[0] !== 0`.
            // If we don't request 'name', place.name will be empty.
            // So for homepage, we should relax the name check or request name.
            // Let's request 'name' too just in case, it's small.
            // Actually, for homepage we ONLY need to count cities.
            // So we really only need `location` (for cityname) and `city` (manual override).
            // We can skip name check if type is homepage.
            if (options.type === 'homepage') {
                return place.location[0] !== 0;
            }
            return place.name && place.location[0] !== 0;
        });

    return places;
}
