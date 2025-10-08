// netlify/functions/saveUserData.ts
import { Handler, HandlerContext } from '@netlify/functions';
import getDb from './db';

export const handler: Handler = async (event, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { user } = context.clientContext;
  if (!user) {
      return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const { data } = JSON.parse(event.body || '{}');

    if (!data) {
      return { statusCode: 400, body: 'User data is required' };
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    await usersCollection.updateOne({ _id: user.sub }, { $set: data });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Save user data error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
