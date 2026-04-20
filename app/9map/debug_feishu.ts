
import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugFeishu() {
    console.log('Fetching records...');
    try {
        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;
        const appToken = process.env.FEISHU_APP_TOKEN;
        const tableId = process.env.FEISHU_TABLE_ID;

        if (!appId || !appSecret || !appToken || !tableId) {
            console.error('Missing env vars:', { appId: !!appId, appSecret: !!appSecret, appToken: !!appToken, tableId: !!tableId });
            return;
        }

        const client = new lark.Client({
            appId: appId,
            appSecret: appSecret,
        });

        const res = await client.bitable.appTableRecord.list({
            path: {
                app_token: appToken,
                table_id: tableId,
            },
            params: {
                page_size: 1,
            },
        });

        if (res.data?.items && res.data.items.length > 0) {
            const item = res.data.items[0];
            const locationField = item.fields['location'];
            console.log('Full Location Field Object:', JSON.stringify(locationField, null, 2));
        } else {
            console.log('No items found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

debugFeishu();
