
require('dotenv/config');

const { mysqlTable, varchar, primaryKey,timestamp,boolean } = require('drizzle-orm/mysql-core');
// const { pgTable, varchar, boolean, timestamp } = require("drizzle-orm/pg-core");
;

 const groupContacts = mysqlTable("group_contacts", {
  lid: varchar("lid", { length: 255 }).unique().notNull(),
  privateJid: varchar("private_jid", { length: 255 }).unique().notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  groupJid: varchar("group_jid", { length: 255 }),
  phoneGotten: boolean("phone_gotten").default(false),
  lastMessaged: timestamp("last_messaged"),
});

// Timestamp","SenderName","PhoneNumber","Message","GroupName","ChatType
 const groupMessages = mysqlTable("group_messages", {
  lid: varchar("lid", { length: 255 }),
  privateJid: varchar("private_jid", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  chatType: varchar("chatType", { length: 20 }),
  groupName: varchar("groupName", { length: 225 }),
  senderName: varchar("senderName", { length: 225 }),
  message: varchar("message", { length: 225 }),
  groupJid: varchar("group_jid", { length: 255 }),
     intent: varchar("intent", { length: 255 }),
//    intent: "buy",
//   item: "PS5",
//   price: "₦400k",
//   location: "Abuja"
  item: varchar("item", { length: 255 }),
  price: varchar("price", { length: 255 }),
  currency: varchar("currency", { length: 255 }),
  location: varchar("location", { length: 255 }),
//   phoneNumber: boolean("phone_gotten").default(false),
 
  Timestamp: timestamp("Timestamp"),
 });

 module.exports={groupMessages,groupContacts}