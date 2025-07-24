//    const { drizzle, } = require("drizzle-orm/mysql2");
//    const { drizzle, } = require("drizzle-orm/pg");
const { drizzle } = require ('drizzle-orm/node-postgres');
const mysql = require("mysql2/promise");
const { Client,Pool } = require('pg');
const { config } = require('./config');
// import { Pool } from 'pg';
        const pgpool = new Pool({
            connectionString: config.DATABASE_URL2,
        });
     
        //use if you are using postgrst
        // await client.connect();
      const db = drizzle(pgpool);


        const pool = mysql.createPool({
  host: config.SQLHOST,      // e.g. 'localhost'
  user: config.SQLUSER,      // e.g. 'root'
  password: config.SQLPASSWORD,  // your MySQL password
  database: config.SQLDATABASE,    // name of the DB you created
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});



// const db = drizzle(pool);


module.exports ={db,pgpool,pool}