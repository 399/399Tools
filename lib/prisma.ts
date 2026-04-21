import { PrismaClient } from '@prisma/client/edge'
import { PrismaLibSql } from '@prisma/adapter-libsql/web'

const prismaClientSingleton = () => {
    // Using configuration object directly for PrismaLibSql (requires url and optionally authToken)
    const url = process.env.TURSO_DATABASE_URL || 'libsql://dummy.turso.io'
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
