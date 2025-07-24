const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, jidNormalizedUser, DisconnectReason, extractMessageContent } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');


// require('dotenv/config');
require('dotenv').config();
const P =  require("pino");
const { eq, sql,or } = require("drizzle-orm");

// const { pgTable, varchar, boolean, timestamp } = require("drizzle-orm/pg-core");
let sock;
const logger = P({
  transport: {
    target: 'pino-pretty'
  },
  hooks: {
     async logMethod(args, method) {
          console.log("\nlog")
          const [msg] = args;
          for (let msg_ of args) {
              let id = msg_?.msgAttrs?.participant_pn ||
                  msg_?.msgAttrs?.participant||
                  msg_?.msgAttrs?.participant_lid ||msg_?.jid
                  || msg_?.participant 
              if (sock && id) {
                  await populatejidwithnums({sock,senderJid:id})
                  
              }
            //   await populatejidwithnums({sock,senderJid})
          }
          console.log(msg,args,method)
    //   if (msg?.msg?.includes('identity changed')) {
    //     console.log('⚠️ Identity change detected:', ...args);
    //     // You can also emit your own event here
    //   }
      method.apply(this, args);
    }
  }
});
const { groupContacts, groupMessages } = require('./postschema');
const { extractChat, isJid, isLid, extractPhoneNumber, getGroupMember, getgroupchatmetadata, storegroupchatmetadata, FILTER_GROUP_NAMES, extractMessageContent_, sendMessageToJid, writeMessageToCSV, extractPhoneNumber2, populatejidwithnums } = require('./utils');
const { redis } = require('./redis');
const { db } = require('./db');
let mylid = "";
let myjid = "";
let myname = "";

let v = async () => {

// await db.connect();
    

await redis.connect();



async function startBaileys() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

     sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
        console.log("gvvvvv")
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed. reconnecting:', shouldReconnect);
            if (shouldReconnect) startBaileys();
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp');
        }
    });

    sock.ev.on('creds.update', (cred) => {
        //    id: '2348160101820:66@s.whatsapp.net',
        //     lid: '267073951404079:66@lid',
        mylid =cred.lid
        myjid = cred.id
        myname = cred.name
        console.log("ghghgh",cred)
        
        saveCreds(cred)
    });

    // Update contact and chat info manually
    sock.ev.on('contacts.upsert', (newContacts) => {
        console.log("ccccccccc")
        for (const contact of newContacts) {
            // store.contacts[contact.id] = contact;
        }
    });

    sock.ev.on('chats.upsert', (newChats) => {
            console.log("c-us",newChats)
        for (const chat of newChats) {
            // store.chats[chat.id] = chat;
            // storegroupchatmetadata()
        }
    });
    sock.ev.on('chats.update', (newChats) => {
        console.log("c-up",newChats)
        for (const chat of newChats) {
            // store.chats[chat.id] = chat;
            // storegroupchatmetadata()
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type, ...k }) => {
console.log("fhfhfhfhfh")
        
        if (type !== 'notify') {
            console.log("Ddddddddddfff",messages)
            
            const senderJid = messages?.participant ||messages?.msgAttrs?.participant || messages?.key?.participant || messages?.key?.remoteJid;
            const groupJid = messages?.from ||messages.msgAttrs?.from || messages?.key?.from || messages?.key?.from;
            const participant_pn = messages?.msgAttrs?.participant_pn;
            if (!senderJid ||!participant_pn) {
                return
            }
        let phoneNumber = extractPhoneNumber2(participant_pn)
            //  const senderJid =  msg.key.participant || msg.key.remoteJid;
                //   if ( senderName=="M") {
                let existing =await  getGroupMember(senderJid)
     
await populatejidwithnums({sock,senderJid})
  
    //   if (!existing || existing?.phoneGotten) {
    //   // Save initial row
    //   await db.insert(groupContacts).values({
    //     lid:senderJid,
    //     groupJid:groupJid,
    //     phoneNumber,
    //     phoneGotten: true,
    //     lastMessaged: new Date(),
    //   });
   
    // }
 
    //               else {

    //             if (existing?.phoneGotten) return;
    //             const phoneNumber = extractPhoneNumber2(participant_pn);
    //             console.log("phoneNumberrrrrrr",phoneNumber)
    //             if (data.phoneNumber != phoneNumber) {
                    
    //                 await db
    //                   .update(groupContacts)
    //                   .set({
    //                     privateJid: senderJid,
    //                     phoneNumber,
    //                     phoneGotten: true,
    //                   })
    //                   .where(eq(groupContacts.lid, row.lid));
    //             }





    //         }
            
            
            
            return
        };

        for (const msg of messages) {
            if (!msg.message) continue;
            console.log(msg,k,msg.key.remoteJid,"pppp")

            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            const senderJid =  msg.key.participant || msg.key.remoteJid;
            const groupJid = msg.key.remoteJid;
            let isLid_ = isLid(senderJid)
let isjid_ = isJid(senderJid)
            console.log(msg.key.participant , msg.key.remoteJid)
            let phoneNumber =isLid_? extractPhoneNumber(senderJid):senderJid;
  
            // const contact = store.contacts[senderJid] || {};
            let senderName = msg.pushName || msg.verifiedBizName ;
            console.log(senderName)



            let member = null
          let   willmessage =false

            if (isLid_) {
                console.log("lidddd")
                 member = await getGroupMember(senderJid)
                console.log("member",member)
                if (!member) {
                     await db.insert(groupContacts).values({
    lid: senderJid,
    privateJid: senderJid,
    // phoneNumber,
    phoneGotten: false,
                     });
                    willmessage=true
                    // if () {
                        
                    //     // send message to retreive number
                    // }
                }
    
            } else if(isjid_) {
                                 const resolvedContact = await sock.onWhatsApp(senderJid);
                console.log(resolvedContact, "machiii");  
                for (const e of resolvedContact) {
  if (e.exists) {
    const phoneNumber_ = extractPhoneNumber(e.jid);

    if (e.lid === senderJid) {
      phoneNumber = phoneNumber_;
    }

    const member = await getGroupMember(e.lid);

    if (member) {
      const needsUpdate = !(member.phoneGotten && member.phoneNumber === phoneNumber_);
      if (needsUpdate) {
        await db
          .update(groupContacts)
          .set({
            phoneNumber: phoneNumber_,
            phoneGotten: true,
          })
          .where(eq(groupContacts.lid, e.lid));
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

//                 resolvedContact.forEach(async (e) => {
//                     if (e.exists) {
                        
//                         let phoneNumber_ = extractPhoneNumber(e.jid);

//                         if (e.lid == senderJid) {
//                             phoneNumber =phoneNumber_
//                         }
//                       member = await getGroupMember(e.lid)
//                         if (member) {
//                             if (!(member.phoneGotten && member.phoneNumber == phoneNumber_)) {
                            
//                                 await db
//        .update(groupContacts)
//        .set({
//        //   privateJid: senderJid,
//          phoneNumber:phoneNumber_,
//          phoneGotten: true,
//        })
//        .where(eq(groupContacts.lid, e.lid));
//                             }
//                         } else {
//                              await db.insert(groupContacts).values({
//     lid: e.lid,
//     privateJid: e.jid,
//     phoneNumber:phoneNumber_,
//     phoneGotten: true,
//   });
//                         }

//                     }
        
//     })            
}
            



// if (msg.message.key.remoteJid.endsWith('@g.us')) {
//     const groupMetadata = await sock.groupMetadata(msg.message.key.remoteJid);
//     groupName = groupMetadata.subject;
//   const result = await sock.groupRequestParticipantsList(msg.key.remoteJid);
//   console.log( '=>', result);
//     senderName = `${senderName} (from ${groupName})`;
// }
            const chatMeta = isGroup ? await getgroupchatmetadata(groupJid) : null;
            let groupName = chatMeta?.subject || '';
            console.log("groupName","ggggggggg",groupName)
            if (!groupName && isGroup) {
                
                const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                // console.log(groupName)
                console.log(groupMetadata,"metaaaavvvv")
                // store[msg.key.remoteJid] = groupMetadata
                storegroupchatmetadata(groupJid,groupMetadata)
                groupName = groupMetadata.subject ||""
            }

            if (FILTER_GROUP_NAMES.length > 0 && !FILTER_GROUP_NAMES.includes(groupName)) {
                continue;
            }

            const messageContent = extractMessageContent_(msg.message);
            const timestamp = new Date((msg.messageTimestamp || 0) * 1000).toLocaleString();


            //  let memberr = member || await getGroupMember(senderJid)
            let market = extractChat(messageContent)

            console.log("market",market)
            const data = {
                timestamp,
                senderName,
                phoneNumber,
                message: messageContent,
                groupName: isGroup ? groupName : '',
                chatType: isGroup ? 'Group' : 'Private'
            };

            console.log(data);
            if ((market.intent == "sell" || market.intent == "buy") &&isGroup) {
                if (willmessage) {
                    sendMessageToJid(sock,senderJid,`Hi you wanna sell a ${market.item||"product"}`)
                }
                writeMessageToCSV({ ...data, });
                  await db.insert(groupMessages).values({...market,
        lid: senderJid,
                      privateJid: senderJid,
        groupJid,
                      phoneNumber: phoneNumber,
                      senderName,
         message: messageContent,
                      timestamp,
                      groupName: isGroup ? groupName : '',
         chatType: isGroup ? 'Group' : 'Private'
      });
            }
        }
    });
}

startBaileys();
}

v()