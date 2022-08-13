import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import Config from "../Config.js";
import Log from "./Log.js";
import { none, Option, some, unwrap } from "./Option.js";

export interface document {
  _id?: ObjectId;
  title: string;
  url?: string;
  date: number;
  event?: string;
}

export interface dbEvent {
  _id?: ObjectId;
  name: string;
  year: number;
}

export class Database {
  private client;
  private db: Option<Db> = none;

  private documents: Option<Collection<document>> = none;
  private events: Option<Collection<dbEvent>> = none;

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

  get Documents() {
    return unwrap(this.documents);
  }

  get Events() {
    return unwrap(this.events);
  }
}

export default new Database();
