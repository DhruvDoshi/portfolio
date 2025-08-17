import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio_tracker';
const dbName = process.env.MONGODB_DB || 'portfolio_tracker';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase() {
  if (client && db) {
    return { client, db };
  }

  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(dbName);
    
    console.log('Connected to MongoDB Atlas');
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// User interface
export interface User {
  _id?: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

// Portfolio interface
export interface Portfolio {
  _id?: string;
  userId: string;
  name: string;
  currency: 'USD' | 'CAD' | 'INR';
  stocks: {
    symbol: string;
    shares: number;
    avgPrice: number;
    market: 'US' | 'CA' | 'IN';
  }[];
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface
export interface Transaction {
  _id?: string;
  portfolioId: string;
  userId: string;
  stockSymbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  amount: number;
  date: Date;
  market: 'US' | 'CA' | 'IN';
  createdAt: Date;
}

export default connectToDatabase;
