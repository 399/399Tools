
import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugFields() {
    const client = new lark.Client({
        appId: process.env.FEISHU_APP_ID || '',
        appSecret: process.env.FEISHU_APP_SECRET || '',
    });

    try {
        const res = await client.bitable.appTableRecord.list({
            path: {
                app_token: process.env.FEISHU_APP_TOKEN || '',
                table_id: process.env.FEISHU_TABLE_ID || '',
            },
            params: { page_size: 1 }
        });

        if (res.data?.items && res.data.items.length > 0) {
            console.log('Fields:', Object.keys(res.data.items[0].fields));
            console.log('Sample Record:', JSON.stringify(res.data.items[0].fields, null, 2));
        } else {
            console.log('No items found.');
        }
    } catch (e) {
        console.error(e);
    }
}

debugFields();
