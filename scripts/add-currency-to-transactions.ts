import { connectToDatabase, Transaction } from '../lib/database';
import { Collection, Db } from 'mongodb';

const MARKET_CURRENCIES: Record<string, string> = {
  'US': 'USD',
  'CA': 'CAD',
  'IN': 'INR',
};

async function migrate() {
  console.log('Starting migration...');
  let client;
  try {
    const { db, client: connectedClient } = await connectToDatabase();
    client = connectedClient;
    const transactionsCollection: Collection<Transaction> = db.collection('transactions');

    const transactionsToUpdate = await transactionsCollection.find({ currency: { $exists: false } }).toArray();

    if (transactionsToUpdate.length === 0) {
      console.log('No transactions to update.');
      return;
    }

    console.log(`Found ${transactionsToUpdate.length} transactions to update.`);

    for (const transaction of transactionsToUpdate) {
      const currency = MARKET_CURRENCIES[transaction.market] || 'USD';
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { currency: currency as any } }
      );
      console.log(`Updated transaction ${transaction._id} with currency ${currency}`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

migrate();
