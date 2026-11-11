import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

let database;
let client;

const connectToDb = async (options = {}) => {
  if (database) {
    return database;
  }

  const connectionString = options.connectionString || process.env.MONGODB_URI;
  const databaseName = options.databaseName || process.env.MONGODB_DB_NAME || 'practice';

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  client = new MongoClient(connectionString);
  await client.connect();
  database = client.db(databaseName);
  return database;
};

const connectToMongoose = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const connectionString = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB_NAME || 'practice';

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(connectionString, {
    dbName: databaseName
  });

  console.log(`Mongoose connected to database: ${databaseName}`);

  return mongoose.connection;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

const closeDb = async () => {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
};

export { closeDb, connectToDb, connectToMongoose, getDb };
