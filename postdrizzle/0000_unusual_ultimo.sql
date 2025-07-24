CREATE TABLE "group_messages" (
	"lid" varchar(255),
	"private_jid" varchar(255),
	"phone_number" varchar(20),
	"chatType" varchar(20),
	"groupName" varchar(225),
	"senderName" varchar(225),
	"message" varchar(225),
	"group_jid" varchar(255),
	"intent" varchar(255),
	"item" varchar(255),
	"price" varchar(255),
	"currency" varchar(255),
	"location" varchar(255),
	"Timestamp" timestamp
);
--> statement-breakpoint
CREATE TABLE "group_contacts" (
	"lid" varchar(255) NOT NULL,
	"private_jid" varchar(255) NOT NULL,
	"phone_number" varchar(20),
	"group_jid" varchar(255),
	"phone_gotten" boolean DEFAULT false,
	"last_messaged" timestamp,
	CONSTRAINT "group_contacts_lid_unique" UNIQUE("lid"),
	CONSTRAINT "group_contacts_private_jid_unique" UNIQUE("private_jid")
);
