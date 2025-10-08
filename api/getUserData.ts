// api/getUserData.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb.ts';
import { getInitialUserData } from './_shared/data.ts';
import { verifyToken } from './_utils/auth.ts';
import { UserProfile } from '../types.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  
  try {
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.sub;
    
    const db = await getDb();
    const usersCollection = db.collection('users');
    let userFromDb = await usersCollection.findOne({ _id: userId });

    // FIX: If the email claim is missing from the token, create a placeholder to prevent JIT creation from failing.
    // The user can update this later if a profile editing feature is added.
    const userEmail = decodedToken.email || `${userId.replace('|', '_')}@pictocat.local`;

    // Assign admin role if the user's email matches the ADMIN_EMAIL environment variable.
    const isAdmin = process.env.ADMIN_EMAIL && userEmail === process.env.ADMIN_EMAIL;

    if (!userFromDb) {
      console.log(`Profile not found for user ${userId}. Attempting JIT creation.`);
      
      const initialData = getInitialUserData();
      
      const baseUsername = `@${userEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)}`;
      let finalUsername = baseUsername;
      
      let usernameCheck = await usersCollection.findOne({ username: finalUsername });
      while (usernameCheck) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        finalUsername = `${baseUsername.slice(0, 20)}${suffix}`;
        usernameCheck = await usersCollection.findOne({ username: finalUsername });
      }

      const newUserDoc = {
        _id: userId,
        username: finalUsername,
        email: userEmail,
        role: isAdmin ? 'admin' : 'user', // Set role on creation
        isVerified: true,
        ...initialData
      };
      
      await usersCollection.insertOne(newUserDoc);
      userFromDb = newUserDoc;
    } else {
        // For existing users, check if their role needs to be promoted to admin.
        // This allows promoting a user without manual DB edits.
        if (isAdmin && userFromDb.role !== 'admin') {
            await usersCollection.updateOne({ _id: userId }, { $set: { role: 'admin' } });
            userFromDb.role = 'admin'; // Update in-memory object for the current response
        }
    }
    
    // Reconstruct the nested 'data' object for the frontend
    const userProfile: UserProfile = {
      id: userFromDb._id,
      email: userFromDb.username, // Frontend uses 'email' field for the username
      role: userFromDb.role || 'user',
      isVerified: userFromDb.isVerified || false,
      data: {
        coins: userFromDb.coins,
        phrases: userFromDb.phrases,
        unlockedImageIds: userFromDb.unlockedImageIds,
        playerStats: userFromDb.playerStats,
        purchasedUpgrades: userFromDb.purchasedUpgrades,
      }
    };

    return res.status(200).json(userProfile);

  } catch (error) {
    console.error('Get/Create user data error:', error);
    if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ message: 'Internal Server Error', error: errorMessage });
  }
}