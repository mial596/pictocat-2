// netlify/functions/seed-database.ts
import { Handler } from '@netlify/functions';
import getDb from './db.ts';
import { MASTER_IMAGE_CATALOG_DATA } from './_shared/catalog-data.ts';

interface CatImageSeed {
  id: string;
  url: string;
  theme: string;
}

export const handler: Handler = async () => {
  try {
    const db = await getDb();
    const catsCollection = db.collection('cats');

    const allCatsFromSource: CatImageSeed[] = (Object.values(MASTER_IMAGE_CATALOG_DATA) as CatImageSeed[][]).flat();

    const existingCatsCursor = catsCollection.find({}, { projection: { original_id: 1 } });
    const existingIds = new Set((await existingCatsCursor.toArray()).map(doc => doc.original_id));

    const catsToInsert = allCatsFromSource
        .filter(cat => !existingIds.has(cat.id))
        .map(cat => ({
            original_id: cat.id,
            url: cat.url,
            theme: cat.theme
        }));

    if (catsToInsert.length === 0) {
      const count = await catsCollection.countDocuments();
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Database is already up to date.',
          totalCatsInDB: count
        })
      };
    }
    
    await catsCollection.insertMany(catsToInsert);

    const count = await catsCollection.countDocuments();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          success: true, 
          message: `Successfully inserted ${catsToInsert.length} new cats.`,
          totalCatsInDB: count 
      }),
    };
  } catch (error) {
    console.error('Database seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: `Internal Server Error: ${errorMessage}` })
    };
  }
};