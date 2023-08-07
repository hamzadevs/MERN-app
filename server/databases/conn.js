import mongoose from "mongoose";
import ENV from "../config.js";

import { MongoMemoryServer } from "mongodb-memory-server";

async function connect() {
  const mongodb = await MongoMemoryServer.create();
  const uri = ENV.MONGODB_URI; //mongodb.getUri();
  mongoose.set("strictQuery", true);
  //mongoose.set('debug', true);
  const db = await mongoose.connect(uri);
  return db;
}

export default connect;
