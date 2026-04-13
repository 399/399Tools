import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const prismaClientSingleton = () => {
    // Get Turso connection strings, fallback to local dev.db if they are not provided (e.g. initial dev)
    const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db'
    const authToken = process.env.TURSO_AUTH_TOKEN

    // Initialize libSQL client compatible with both remote Serverless Edge and local file scenarios
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
