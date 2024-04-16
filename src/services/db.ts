import { JsonDB, Config } from "node-json-db";

const db = new JsonDB(new Config("videos", true, true));

export { db };
