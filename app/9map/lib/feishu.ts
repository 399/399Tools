export const APP_ID = process.env.FEISHU_APP_ID || '';
export const APP_SECRET = process.env.FEISHU_APP_SECRET || '';
export const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || '';
export const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

export async function getTenantAccessToken() {
    if (!APP_ID || !APP_SECRET) {
        throw new Error('Missing FEISHU_APP_ID or FEISHU_APP_SECRET');
    }
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const data = await res.json();
    if (data.code !== 0) {
        throw new Error(`Feishu auth failed: ${JSON.stringify(data)}`);
    }
    return data.tenant_access_token;
}
