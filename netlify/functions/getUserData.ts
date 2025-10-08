// netlify/functions/getUserData.ts
import { Handler, HandlerContext } from '@netlify/functions';
import getDb from './db.ts';
import { getInitialUserData } from './_shared/data.ts';
import { UserProfile } from '../../types.ts';

export const handler: Handler = async (event, context: HandlerContext) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { user } = context.clientContext;
  if (!user) {
      return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection('users');
    let userFromDb = await usersCollection.findOne({ _id: user.sub });

    if (!userFromDb) {
      console.log(`Profile not found for user ${user.sub}. Attempting JIT creation.`);
      
      if (!user.email) {
        throw new Error(`Cannot create profile JIT: user object for ${user.sub} is missing an email address.`);
      }

      const initialData = getInitialUserData();
      
      const baseUsername = `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)}`;
      let finalUsername = baseUsername;
      
      let usernameCheck = await usersCollection.findOne({ username: finalUsername });
      while (usernameCheck) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        finalUsername = `${baseUsername.slice(0, 20)}${suffix}`;
        usernameCheck = await usersCollection.findOne({ username: finalUsername });
      }

      const newUserDoc = {
        _id: user.sub,
        username: finalUsername,
        email: user.email,
        role: 'user',
        isVerified: true,
        ...initialData
      };
      
      await usersCollection.insertOne(newUserDoc);
      userFromDb = newUserDoc;
    }
    
    const userProfile: UserProfile = {
      id: userFromDb._id,
      email: userFromDb.username,
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfile),
    };
  } catch (error) {
    console.error('Get/Create user data error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};