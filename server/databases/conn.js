import mongoose from "mongoose";

import { MongoMemoryServer } from "mongodb-memory-server";

async function connect() {
  const mongodb = await MongoMemoryServer.create();
  const uri = mongodb.getUri();
  console.log(uri)
  mongoose.set('strictQuery', true)
  mongoose.set('debug', true);
  const db = await mongoose.connect(uri);
  console.log("Database connected");
  return db;
}

export default connect;
