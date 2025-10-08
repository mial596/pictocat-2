// api/admin-get-users.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb.ts';
import { verifyToken } from './_utils/auth.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

        const usersCursor = usersCollection.find({}, {
            projection: { _id: 1, username: 1, role: 1, isVerified: 1 },
            sort: { username: 1 }
        });

        const users = await usersCursor.toArray();

        const result = users.map(u => ({
            id: u._id,
            email: u.username, // Maintain frontend contract
            role: u.role,
            isVerified: u.isVerified
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('Admin get users error:', error);
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ message: 'Internal Server Error', error: errorMessage });
    }
}