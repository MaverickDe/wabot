// drizzle.config.ts

import { config } from "./config"

const  { pgpool } = require("./db")

// import type { Config } from "drizzle-kit";
let sql =!(!!pgpool)
console.log(sql)
module.exports = {
  schema: sql?"schema.js":"postschema.js", // path to your schema file
  out:sql? "drizzle":"postdrizzle",             // where to put migrations
  dialect: sql?"mysql":"pg",
  dbCredentials:sql? {
    host: config.SQLHOST,
    port: 3306,
    user: config.SQLUSER,
    password:config.SQLPASSWORD,
    database: config.SQLDATABASE,
  }:{url:config.DATABASE_URL2},
} 
