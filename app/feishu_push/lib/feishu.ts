
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = process.env.FEISHU_TABLE_ID;

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

export async function checkDuplicate(accessToken: string, shopName: string, address: string) {
    if (!BASE_TOKEN || !TABLE_ID) {
        throw new Error('Missing FEISHU_BASE_TOKEN or FEISHU_TABLE_ID');
    }

    const filter = `AND(CurrentValue.[name] = "${shopName}", CurrentValue.[full_address] = "${address}")`;
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records?filter=${encodeURIComponent(filter)}`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    const data = await res.json();
    if (data.code !== 0) {
        throw new Error(`Check duplicate failed: ${JSON.stringify(data)}`);
    }

    if (data.data.items && data.data.items.length > 0) {
        return data.data.items[0];
    }
    return null;
}

export async function createRecord(accessToken: string, fields: any) {
    if (!BASE_TOKEN || !TABLE_ID) {
        throw new Error('Missing FEISHU_BASE_TOKEN or FEISHU_TABLE_ID');
    }

    const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });

    const data = await res.json();
    if (data.code !== 0) {
        throw new Error(`Create record failed: ${data.msg}`);
    }
    return data.data;
}

export async function updateRecord(accessToken: string, recordId: string, fields: any) {
    if (!BASE_TOKEN || !TABLE_ID) {
        throw new Error('Missing FEISHU_BASE_TOKEN or FEISHU_TABLE_ID');
    }

    const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });

    const data = await res.json();
    if (data.code !== 0) {
        throw new Error(`Update record failed: ${data.msg}`);
    }
    return data.data;
}
