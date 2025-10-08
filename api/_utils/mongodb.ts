// api/_utils/mongodb.ts
import { MongoClient, Db } from 'mongodb';

// The MongoDB connection string is retrieved from environment variables.
// This is a critical piece of configuration for the application to function.
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  console.log("Attempting to connect to the database...");

  const uri = process.env.PICTOCAT1_MONGODB_URI;
  if (!uri) {
    console.error("PICTOCAT1_MONGODB_URI environment variable is not set.");
    throw new Error('Database connection string is missing.');
  }

  if (cachedClient && cachedDb) {
    console.log("Using cached database connection.");
    return cachedDb;
  }

  console.log("Creating new MongoDB client...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("MongoDB client connected successfully.");

    const db = client.db('pictocat1'); // Or specify your database name
    cachedClient = client;
    cachedDb = db;

    console.log("Database connection established.");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    // Important: Don't cache a failed client attempt.
    cachedClient = null;
    cachedDb = null;
    throw new Error("Could not connect to the database.");
  }
}
