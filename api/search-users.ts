// api/search-users.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb';
import { verifyToken } from './_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await verifyToken(req.headers.authorization); // Secure the endpoint
    const query = req.query.q as string;

    if (!query || query.length < 2) {
        return res.status(200).json([]);
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    // Using regex for case-insensitive search
    const searchPattern = new RegExp(query, 'i');
    const usersCursor = usersCollection.find(
        { username: { $regex: searchPattern } },
        { projection: { username: 1, isVerified: 1 }, limit: 10 }
    );
    const users = await usersCursor.toArray();

    const searchResults = users.map(u => ({
        username: u.username,
        isVerified: u.isVerified
    }));

    return res.status(200).json(searchResults);
  } catch (error) {
    console.error('Search users error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).send('Unauthorized');
    }
    return res.status(500).send('Internal Server Error');
  }
}
