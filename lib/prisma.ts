import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client/web'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const prismaClientSingleton = () => {
    // Force web client which acts as purely HTTP fetch, circumventing all local Webpack `.node` errors
    const url = process.env.TURSO_DATABASE_URL || 'libsql://dummy.turso.io'
    const authToken = process.env.TURSO_AUTH_TOKEN || 'dummy'

    const libsql = createClient({
        url,
        authToken
    })

    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
