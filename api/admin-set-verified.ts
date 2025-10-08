// api/admin-set-verified.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb.js';
import { verifyToken } from './_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const db = await getDb();
        const usersCollection = db.collection('users');

        // FIX: Cast user ID to `any` to bypass TypeScript type error.
        // The driver expects an ObjectId, but the application uses string IDs from the auth provider.
        const requestingUser = await usersCollection.findOne({ _id: decodedToken.sub as any });

        if (!requestingUser || requestingUser.role !== 'admin') {
            return res.status(403).send('Forbidden: Admins only.');
        }

        const { userId, isVerified } = req.body;

        if (!userId || typeof isVerified !== 'boolean') {
            return res.status(400).send('userId and isVerified status are required.');
        }

        await usersCollection.updateOne({ _id: userId }, { $set: { isVerified: isVerified } });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Admin set verified status error:', error);
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ message: 'Internal Server Error', error: errorMessage });
    }
}