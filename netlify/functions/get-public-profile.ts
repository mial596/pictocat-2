// netlify/functions/get-public-profile.ts
import { Handler, HandlerContext } from '@netlify/functions';
import getDb from './db.ts';

export const handler: Handler = async (event, context: HandlerContext) => {
  const { user } = context.clientContext;
  if (!user) {
      return { statusCode: 401, body: 'Unauthorized' };
  }

  const username = event.queryStringParameters?.username;
  if (!username) {
      return { statusCode: 400, body: 'Username is required' };
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection('users');
    const publicPhrasesCollection = db.collection('public_phrases');

    const targetUser = await usersCollection.findOne({ username: username });
    if (!targetUser) {
        return { statusCode: 404, body: 'User not found' };
    }

    const phrasesCursor = publicPhrasesCollection.find({ userId: targetUser._id }).sort({ _id: -1 });
    const phrasesFromDb = await phrasesCursor.toArray();
    
    const publicPhrases = phrasesFromDb.map(p => ({
        publicPhraseId: p._id.toHexString(),
        text: p.text,
        imageUrl: p.imageUrl,
        imageTheme: p.imageTheme
    }));
    
    const profileData = {
        username: targetUser.username,
        isVerified: targetUser.isVerified,
        phrases: publicPhrases
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    };
  } catch (error) {
    console.error('Get public profile error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};