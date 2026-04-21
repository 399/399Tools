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

// Instantiate lazily through a Proxy to guarantee process.env is populated by Next.js edge runtime
// Cloudflare Workers leave process.env empty during top-level module scopes
const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        if (!globalThis.prismaGlobal) {
            globalThis.prismaGlobal = prismaClientSingleton()
        }
        const instance = globalThis.prismaGlobal as any
        const value = instance[prop]
        return typeof value === 'function' ? value.bind(instance) : value
    }
})

export default prisma

if (process.env.NODE_ENV !== 'production') {
    // Only set this explicitly in dev environments if needed, but not immediately to avoid eagerness
    // globalThis.prismaGlobal is populated on first query
}
