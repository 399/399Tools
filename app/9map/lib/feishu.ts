import * as lark from '@larksuiteoapi/node-sdk';

export const client = new lark.Client({
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
});

export const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || '';
export const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';
