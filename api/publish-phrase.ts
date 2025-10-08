// api/publish-phrase.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb.js';
import { verifyToken } from './_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }
    
    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const userId = decodedToken.sub;
        const { phrase, image, isPublic } = req.body || {};

        if (!phrase || !phrase.id || !image || !image.url) {
            return res.status(400).send('Invalid phrase data provided.');
        }
        
        const db = await getDb();
        const publicPhrasesCollection = db.collection('public_phrases');
        const usersCollection = db.collection('users');

        // Step 1: Update the public_phrases collection
        if (isPublic) {
            // FIX: Cast `userId` to `any` to bypass TypeScript type error.
            // The driver expects an ObjectId, but the application uses string IDs from the auth provider.
            const user = await usersCollection.findOne({ _id: userId as any }, { projection: { username: 1 }});
            if (!user) {
                return res.status(404).send('User not found.');
            }
            await publicPhrasesCollection.updateOne(
                { userId: userId, phraseId: phrase.id },
                { 
                    $set: {
                        userId: userId,
                        phraseId: phrase.id,
                        username: user.username,
                        text: phrase.text,
                        imageUrl: image.url,
                        imageTheme: image.theme
                    }
                },
                { upsert: true }
            );
        } else {
            await publicPhrasesCollection.deleteOne({ userId: userId, phraseId: phrase.id });
        }

        // Step 2: Update the isPublic flag within the user's data
        await usersCollection.updateOne(
            // FIX: Cast `userId` to `any` to bypass TypeScript type error.
            // The driver expects an ObjectId, but the application uses string IDs from the auth provider.
            { _id: userId as any, 'phrases.id': phrase.id },
            { $set: { 'phrases.$.isPublic': isPublic } }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Publish phrase error:', error);
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ message: 'Internal Server Error', error: errorMessage });
    }
}