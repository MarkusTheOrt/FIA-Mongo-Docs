import { MongoClient, Db, Collection } from "mongodb";
import Config from "../Config.js";
import Log from "./Log.js";
import { none, Option, some, unwrap } from "./Option.js";

interface document {
  name: string;
  url: string;
}

interface event {
  name: string;
  year: number;
}

export class Database {
  private client;
  private db: Option<Db> = none;

  private documents: Option<Collection<document>> = none;
  private events: Option<Collection<event>> = none;

  constructor() {
    this.client = new MongoClient(Config.mongoConnection);
  }

  async connect() {
    await this.client.connect();
    Log.Info("Database Connected.");
    this.db = some(this.client.db(Config.dbName));
    const db = unwrap(this.db);
    this.documents = some(db.collection("documents"));
    this.events = some(db.collection("events"));
  }
}

export default new Database();
