import { PrismaClient } from '@prisma/client/edge'
import { PrismaLibSql } from '@prisma/adapter-libsql/web'
import { PrismaD1 } from '@prisma/adapter-d1'

const prismaClientSingleton = () => {
    // 优先使用 Cloudflare D1 (生产环境)
    if (process.env.d1_data) {
        // @ts-ignore - D1 database object is injected by Cloudflare
        const adapter = new PrismaD1(process.env.d1_data)
        return new PrismaClient({ adapter })
    }

    // 本地开发回退使用 LibSQL / Turso
    let url = process.env.TURSO_DATABASE_URL || 'https://dummy.turso.io'
    if (url.startsWith('libsql://')) {
        url = url.replace('libsql://', 'https://')
    }
    const authToken = process.env.TURSO_AUTH_TOKEN || ''

    const adapter = new PrismaLibSql({
        url,
        authToken
    })

    return new PrismaClient({ adapter })
}

declare global {
    // eslint-disable-next-line no-var
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}
