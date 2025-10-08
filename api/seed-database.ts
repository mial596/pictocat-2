// api/seed-database.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/mongodb.ts';
import { MASTER_IMAGE_CATALOG_DATA } from './_shared/catalog-data.ts';

interface CatImageSeed {
  id: string;
  url: string;
  theme: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await getDb();
    const catsCollection = db.collection('cats');

    // Find the highest existing numeric_id to ensure new IDs are unique and sequential.
    const lastCat = await catsCollection.find({ numeric_id: { $exists: true, $type: 'number' } }).sort({ numeric_id: -1 }).limit(1).toArray();
    let maxId = 0;
    if (lastCat.length > 0) {
        maxId = lastCat[0].numeric_id;
    }

    const allCatsFromSource: CatImageSeed[] = (Object.values(MASTER_IMAGE_CATALOG_DATA) as CatImageSeed[][]).flat();

    const existingCatsCursor = catsCollection.find({}, { projection: { original_id: 1 } });
    const existingIds = new Set((await existingCatsCursor.toArray()).map(doc => doc.original_id));

    let currentId = maxId;
    const catsToInsert = allCatsFromSource
        .filter(cat => !existingIds.has(cat.id))
        .map(cat => {
            currentId++;
            return {
                original_id: cat.id,
                url: cat.url,
                theme: cat.theme,
                numeric_id: currentId // Add the new stable numeric ID
            };
        });

    if (catsToInsert.length === 0) {
      const count = await catsCollection.countDocuments();
      return res.status(200).json({
          success: true,
          message: 'Database is already up to date.',
          totalCatsInDB: count
      });
    }
    
    await catsCollection.insertMany(catsToInsert);

    const count = await catsCollection.countDocuments();

    return res.status(200).json({ 
          success: true, 
          message: `Successfully inserted ${catsToInsert.length} new cats.`,
          totalCatsInDB: count 
      });
  } catch (error) {
    console.error('Database seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: errorMessage });
  }
}