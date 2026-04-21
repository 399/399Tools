import { PrismaClient } from '@prisma/client/edge'
import { PrismaLibSql } from '@prisma/adapter-libsql/web'

const prismaClientSingleton = () => {
    // Using configuration object directly for PrismaLibSql (requires url and optionally authToken)
    let url = process.env.TURSO_DATABASE_URL || 'https://dummy.turso.io'
    // Force HTTP stateless protocol on Edge to prevent Cloudflare cross-request I/O violations
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
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
