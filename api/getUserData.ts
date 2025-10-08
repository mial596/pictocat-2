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

  console.log("getUserData function started.");

  let decodedToken;
  try {
    decodedToken = await verifyToken(req.headers.authorization);
    console.log(`Token verified for user: ${decodedToken.sub}`);
  } catch (error) {
    console.error('Token verification failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown auth error';
    return res.status(401).json({ message: 'Unauthorized: ' + errorMessage });
  }
  
  try {
    const userId = decodedToken.sub;
    
    const db = await getDb();
    const usersCollection = db.collection('users');
    console.log(`Database connection successful. Querying for user: ${userId}`);
    let userFromDb = await usersCollection.findOne({ _id: userId as any });

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
      console.log(`Generated new username: ${finalUsername}`);

      const newUserDoc = {
        _id: userId,
        username: finalUsername,
        email: userEmail,
        role: isAdmin ? 'admin' : 'user', // Set role on creation
        isVerified: true,
        ...initialData
      };
      
      await usersCollection.insertOne(newUserDoc);
      console.log(`New user document inserted for ${userId}.`);
      userFromDb = newUserDoc;
    } else {
        console.log(`Found existing profile for user ${userId}.`);
        // For existing users, check if their role needs to be promoted to admin.
        // This allows promoting a user without manual DB edits.
        if (isAdmin && userFromDb.role !== 'admin') {
            await usersCollection.updateOne({ _id: userId as any }, { $set: { role: 'admin' } });
            userFromDb.role = 'admin'; // Update in-memory object for the current response
            console.log(`Promoted user ${userId} to admin.`);
        }
    }
    
    // Reconstruct the nested 'data' object for the frontend
    const userProfile: UserProfile = {
      // FIX: Cast `_id` to string to match the UserProfile type.
      // The MongoDB driver's default typing assumes ObjectId, but we store string IDs.
      id: String(userFromDb._id),
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

    console.log("Successfully prepared user profile. Sending response.");
    return res.status(200).json(userProfile);

  } catch (error) {
    console.error('Error during database operation in getUserData:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ message: 'Internal Server Error: ' + errorMessage });
  }
}