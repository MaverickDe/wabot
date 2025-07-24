const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  DisconnectReason,
  extractMessageContent,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

require("dotenv").config();
const P = require("pino");
const { eq, sql, or } = require("drizzle-orm");

let sock;
const logger = P({
  transport: {
    target: "pino-pretty",
  },
  hooks: {
    async logMethod(args, method) {
      console.log("\nlog");
      const [msg] = args;
      for (let msg_ of args) {
        let id =
          msg_?.msgAttrs?.participant_pn ||
          msg_?.msgAttrs?.participant ||
          msg_?.msgAttrs?.participant_lid ||
          msg_?.jid ||
          msg_?.participant;
        if (sock && id) {
          await populatejidwithnums({ sock, senderJid: id });
        }
      }

      method.apply(this, args);
    },
  },
});
const { groupContacts, groupMessages } = require("./postschema");
const {
  extractChat,
  isJid,
  isLid,
  extractPhoneNumber,
  getGroupMember,
  getgroupchatmetadata,
  storegroupchatmetadata,
  FILTER_GROUP_NAMES,
  extractMessageContent_,
  sendMessageToJid,
  writeMessageToCSV,
  extractPhoneNumber2,
  populatejidwithnums,
  addGroupMembertomem,
} = require("./utils");
const { redis } = require("./redis");
const { db } = require("./db");
let mylid = "";
let myjid = "";
let myname = "";

let v = async () => {
  await redis.connect();

  async function startBaileys() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on(
      "connection.update",
      async ({ connection, qr, lastDisconnect }) => {
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "close") {
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;
          console.log("connection closed. reconnecting:", shouldReconnect);
          if (shouldReconnect) startBaileys();
        } else if (connection === "open") {
          console.log("✅ Connected to WhatsApp");
        }
      }
    );

    sock.ev.on("creds.update", (cred) => {
      mylid = cred.lid;
      myjid = cred.id;
      myname = cred.name;

      saveCreds(cred);
    });

    // Update contact and chat info manually
    sock.ev.on("contacts.upsert", (newContacts) => {
      for (const contact of newContacts) {
      }
    });

    sock.ev.on("chats.upsert", (newChats) => {
      for (const chat of newChats) {
      }
    });
    sock.ev.on("chats.update", (newChats) => {
      console.log("c-up", newChats);
      for (const chat of newChats) {
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type, ...k }) => {
      if (type !== "notify") {
        const senderJid =
          messages?.participant ||
          messages?.msgAttrs?.participant ||
          messages?.key?.participant ||
          messages?.key?.remoteJid;
        const groupJid =
          messages?.from ||
          messages.msgAttrs?.from ||
          messages?.key?.from ||
          messages?.key?.from;
        const participant_pn = messages?.msgAttrs?.participant_pn;
        if (!senderJid || !participant_pn) {
          return;
        }

        await populatejidwithnums({ sock, senderJid });

        return;
      }

      for (const msg of messages) {
        if (!msg.message) continue;
        console.log(msg, k, msg.key.remoteJid, "pppp");

        const isGroup = msg.key.remoteJid.endsWith("@g.us");
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const groupJid = msg.key.remoteJid;
        let isLid_ = isLid(senderJid);
        let isjid_ = isJid(senderJid);
        console.log(msg.key.participant, msg.key.remoteJid);
        let phoneNumber = isLid_ ? extractPhoneNumber(senderJid) : senderJid;

        let senderName = msg.pushName || msg.verifiedBizName;
        console.log(senderName);

        let member = null;
        let willmessage = false;

        if (isLid_) {
          member = await getGroupMember(senderJid);

          if (!member) {
            await db.insert(groupContacts).values({
              lid: senderJid,
              privateJid: senderJid,

              phoneGotten: false,
            });
            willmessage = true;
          }
        } else if (isjid_) {
          const resolvedContact = await sock.onWhatsApp(senderJid);

          for (const e of resolvedContact) {
            if (e.exists) {
              const phoneNumber_ = extractPhoneNumber(e.jid);

              if (e.lid === senderJid) {
                phoneNumber = phoneNumber_;
              }

              const member = await getGroupMember(e.lid);

              if (member) {
                const needsUpdate = !(
                  member.phoneGotten && member.phoneNumber === phoneNumber_
                );
                if (needsUpdate) {
                  await db
                    .update(groupContacts)
                    .set({
                      phoneNumber: phoneNumber_,
                      phoneGotten: true,
                    })
                    .where(eq(groupContacts.lid, e.lid));
                  addGroupMembertomem(e.lid);
                  await db
                    .update(groupMessages)
                    .set({
                      phoneNumber: phoneNumber_,
                      // phoneGotten: true,
                    })
                    .where(eq(groupMessages.lid, e.lid));
                }
              } else {
                await db.insert(groupContacts).values({
                  lid: e.lid,
                  privateJid: e.jid,
                  phoneNumber: phoneNumber_,
                  phoneGotten: true,
                });

                await db
                  .update(groupMessages)
                  .set({
                    phoneNumber: phoneNumber_,
                    // phoneGotten: true,
                  })
                  .where(
                    or(
                      eq(groupMessages.lid, e.lid),
                      eq(groupMessages.privateJid, e.lid),
                      eq(groupMessages.lid, e.jid),
                      eq(groupMessages.privateJid, e.jid)
                    )
                  );
              }
            }
          }
        }

        const chatMeta = isGroup ? await getgroupchatmetadata(groupJid) : null;
        let groupName = chatMeta?.subject || "";

        if (!groupName && isGroup) {
          const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);

          // store[msg.key.remoteJid] = groupMetadata
          storegroupchatmetadata(groupJid, groupMetadata);
          groupName = groupMetadata.subject || "";
        }

        if (
          FILTER_GROUP_NAMES.length > 0 &&
          !FILTER_GROUP_NAMES.includes(groupName)
        ) {
          continue;
        }

        const messageContent = extractMessageContent_(msg.message);
        const timestamp = new Date(
          (msg.messageTimestamp || 0) * 1000
        ).toLocaleString();

        let market = await extractChat(messageContent);

        const data = {
          timestamp,
          senderName,
          phoneNumber,
          message: messageContent,
          groupName: isGroup ? groupName : "",
          chatType: isGroup ? "Group" : "Private",
        };

        console.log(data);
        if (
          market &&
          (market.intent == "sell" || market.intent == "buy") &&
          isGroup
        ) {
          if (willmessage) {
            sendMessageToJid(
              sock,
              senderJid,
              `Hi you wanna sell a ${market.item || "product"}`
            );
          }
          writeMessageToCSV({ ...data });
          await db
            .insert(groupMessages)
            .values({
              ...market,
              lid: senderJid,
              privateJid: senderJid,
              groupJid,
              phoneNumber: phoneNumber,
              senderName,
              message: messageContent,
              timestamp,
              groupName: isGroup ? groupName : "",
              chatType: isGroup ? "Group" : "Private",
            });
        }
      }
    });
  }

  startBaileys();
};

v();
