import { MongoClient } from "mongodb";

declare global {
    // eslint-disable-next-line no-var
    var _mongoWebhooksClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
    if (!globalThis._mongoWebhooksClientPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not set");
        globalThis._mongoWebhooksClientPromise = new MongoClient(uri).connect();
    }
    return globalThis._mongoWebhooksClientPromise;
}

/** ldco-lessons: the schedule. */
export async function getLessonsDb() {
    return (await clientPromise()).db(process.env.LESSONS_DB_NAME ?? "ldco-lessons");
}

/** bld: social_posts (decision 19: data only Beyond Line Dance uses). */
export async function getBldDb() {
    return (await clientPromise()).db(process.env.BLD_DB_NAME ?? "bld");
}

/** ldco: venues. */
export async function getMainDb() {
    return (await clientPromise()).db(process.env.MAIN_DB_NAME ?? "ldco");
}

export async function closeDb() {
    if (globalThis._mongoWebhooksClientPromise) {
        await (await globalThis._mongoWebhooksClientPromise).close();
        globalThis._mongoWebhooksClientPromise = undefined;
    }
}
