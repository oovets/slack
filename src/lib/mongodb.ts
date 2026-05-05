import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

let uri = process.env.MONGODB_URI;

if (uri[uri.length - 1] === 'm') {
  uri = uri.slice(0, -1);
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
// Export the database instance using the MONGODB_DB_NAME environment variable
export const database = client.db();

// Export a client promise for NextAuth adapter
export const clientPromise = client.connect().then(() => client);

// Export a promise-based database instance for async operations
export const databasePromise = clientPromise.then((client) => client.db());

// Export client for direct access if needed
export { client };

// Helper function to get database (for backward compatibility)
export async function getDatabase() {
  return databasePromise;
}

