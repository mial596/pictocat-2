// api/_utils/mongodb.ts
import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  console.log("Attempting to connect to the database...");

  // FIX: Check for both the standard Vercel environment variable `MONGODB_URI` 
  // and the previously used `PICTOCAT1_MONGODB_URI` to avoid configuration issues.
  const uri = process.env.MONGODB_URI || process.env.PICTOCAT1_MONGODB_URI;
  
  if (!uri) {
    console.error("FATAL: Neither MONGODB_URI nor PICTOCAT1_MONGODB_URI environment variable is set.");
    throw new Error('Database connection string is missing.');
  }

  // Reuse existing connection if available and alive
  if (cachedClient && cachedDb) {
    try {
        // Use a lightweight command to check if the connection is still valid.
        await cachedDb.command({ ping: 1 });
        console.log("Using cached and verified database connection.");
        return cachedDb;
    } catch (e) {
        // If ping fails, the connection is likely dead. Clear cache and reconnect.
        console.warn("Cached connection ping failed. Reconnecting...", e);
        cachedClient = null;
        cachedDb = null;
    }
  }

  console.log("Creating new MongoDB client...");
  // Add serverless-friendly connection options
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log("MongoDB client connected successfully.");

    // Dynamically determine the database name from the connection string
    const dbNameFromUri = new URL(uri).pathname.substring(1);
    const dbName = dbNameFromUri || 'pictocat1';
    console.log(`Connecting to database: ${dbName}`);
    const db = client.db(dbName);
    
    cachedClient = client;
    cachedDb = db;

    console.log("Database connection established.");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    // Ensure failed connections are not cached
    cachedClient = null;
    cachedDb = null;
    throw new Error("Could not connect to the database.");
  }
}