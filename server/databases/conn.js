import mongoose from "mongoose";

import { MongoMemoryServer } from "mongodb-memory-server";

async function connect() {
  const mongodb = await MongoMemoryServer.create();
  const uri = mongodb.getUri();
  mongoose.set('strictQuery', true)
  const db = await mongoose.connect(uri);
  console.log("Database connected");
  return db;
}

export default connect;
