const  OpenAI = require('openai');
require('dotenv').config();
const { db } = require("./db");
const { redis } = require("./redis");
const { groupContacts, groupMessages } = require("./postschema");
const fs = require('fs');
const path = require('path');
const { eq,or } = require("drizzle-orm");
const { config } = require('./config');

const openai = new OpenAI({
  apiKey: config.OPENAIKEY
});
let GPT = true
const REDIS_EXPIRATION = 60 * 60; // 1 hour

function extractMarketInfo(message) {
  const lower = message.toLowerCase();

  // Step 1: Detect intent
  let intent= 'unknown';
  if (/(\b(wan\s*sell|want\s*sell|want\s*to\s*sell|for\s*sale|selling|i\s*dey\s*sell))\b/.test(lower)) {
    intent = 'sell';
  } else if (/(\b(wan\s*buy|looking\s*for|need|i\s*dey\s*find))\b/.test(lower)) {
    intent = 'buy';
  }

  // Step 2: Extract price and currency
  const priceMatch = message.match(/(₦|\$|€|£)?\s?(\d{1,3}(?:[,.\d]*)(k|K)?)/);
  let price  = null;
  let currency  = null;
  if (priceMatch) {
    currency = priceMatch[1] || null;
    price = priceMatch[2].replace(/[,]/g, '');
    if (priceMatch[3]?.toLowerCase() === 'k') {
      price = String(Number(price) * 1000);
    }
  }

  // Step 3: Extract location
  const locationMatch = message.match(/\b(?:in|at|around|from)\s+([A-Za-z ]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : null;

  // Step 4: Extract item
  let item = message;
  item = item.replace(/(wan\s*sell|for\s*sale|selling|i\s*dey\s*sell|wan\s*buy|looking\s*for|need|i\s*dey\s*find)/gi, '');
  item = item.replace(priceMatch ? priceMatch[0] : '', '');
  item = item.replace(locationMatch ? locationMatch[0] : '', '');
  item = item.replace(/[^a-zA-Z0-9\s]/g, '').trim();

  // Step 5: Final fallback for random/unrelated message
  if (intent === 'unknown' && !price && !location) {
    return {
      intent: 'unknown',
      item: null,
      price: null,
      currency: null,
      location: null,
    };
  }

  return {
    intent,
    item: item || null,
    price,
    currency,
    location,
  };
}


async function extractInfoWithChatGPT(message) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `"You are an assistant that extracts market info from messages.

If the message is about buying or selling something, return structured JSON:
{
  intent: 'buy' | 'sell',
  item: string,
  price: string | null,
  currency: 'NGN' | 'USD' | 'EUR' | null,
  location: string | null
}

If the message is not related to buying/selling (like greetings, jokes, random talk), return:
{
  intent: 'none',
  item: null,
  price: null,
  currency: null,
  location: null
}

Use context clues to detect currency (₦, k, naira = NGN, $ or USD = USD, etc)."
`
      },
      {
        role: 'user',
        content: message
      }
    ],
    temperature: 0.2
  });

  const text = res.choices[0].message.content;
  console.log("text","dgdgdgdgdgdgdgdgdggd",text,res)
  try {
    return JSON.parse(text);
  } catch {
    console.error('Could not parse GPT response:', text);
    return null;
  }
}

// Example usage


const extractChat = (message) => {
    if (GPT) {
        return extractInfoWithChatGPT(message)
    }

    return extractMarketInfo(message)
    
};



 async function getGroupMember(lid) {
//   const redisKey = `group:${groupLid}`;
  const redisKey = `mem:${lid}`;

  // Try Redis
//   const cached = await redis.get(redisKey);
//   if (cached) {
//     console.log('✅ From Redis');
//     return JSON.parse(cached);
//   }

  // Fallback to Supabase (via Drizzle)
  console.log('❌ Redis Miss — Fetching from DB',lid);
  const result = await db
    .select()
    .from(groupContacts)
    .where(eq(groupContacts.lid, lid));
  console.log('  DB result',result,result[0]);
  // Save back to Redis
  if (result.length > 0) {
    await redis.set(redisKey, JSON.stringify(result[0]), {
      EX: REDIS_EXPIRATION,
    });
    return result[0] ;
  }
return null
}

        
        let getgroupchatmetadata =async (id) => {
            const redisKey = `groupmetadata:${id}`;

//   Try Redis
  const cached = await redis.get(redisKey);
  if (cached) {
    console.log('✅ From Redis');
    return JSON.parse(cached);
  }

        }
        let storegroupchatmetadata =async (id,metadata) => {
            const redisKey = `groupmetadata:${id}`;

//   Try Redis
    await redis.set(redisKey, JSON.stringify(metadata), {
      EX: REDIS_EXPIRATION,
    });

        }

const FILTER_GROUP_NAMES = []; // Add allowed group names here, or leave empty to allow all

// Store contacts and chat metadata manually
const store = {
    contacts: {},
    chats: {}
};

// Extract plain message text
function extractMessageContent(message) {
    if (!message) return '';
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    return '[Unsupported message type]';
}
async function sendMessageToNumber(sock, number, message) {
    const jid = number + '@s.whatsapp.net'; // format for private chats
    await sock.sendMessage(jid, { text: message });
}
async function sendMessageToJid(sock, jid, message) {
    // const jid = number + '@s.whatsapp.net'; // format for private chats
    await sock.sendMessage(jid, { text: message });
}

async function sendMessageToGroup(sock, groupId, message) {
    await sock.sendMessage(groupId, { text: message }); // groupId must be like `12345-67890@g.us`
}
function extractMessageContent_(message) {
    const type = Object.keys(message)[0];
    const content = message[type];

    if (type === 'conversation') return content;
    if (type === 'extendedTextMessage') return content.text;
    if (type === 'imageMessage') return '[Image]';
    if (type === 'videoMessage') return '[Video]';
    if (type === 'documentMessage') return '[Document]';
    if (type === 'audioMessage') return '[Audio]';
    if (type === 'stickerMessage') return '[Sticker]';
    return '[Unknown Type]';
}

// Extract phone number from JID
function extractPhoneNumber(jid) {
    console.log(jid)
    return jid.split('@')[0] ||"";
}
function extractPhoneNumber2(jid) {
    console.log(jid)
    return jid.replace(/@s\.whatsapp\.net$/, "") ||"";
        }
        

        function isJid(string) {
            return string.includes("@s.whatsapp.net")
        }
        function isLid(string) {
            return string.includes("@lid")
        }

// Write message to CSV
function writeMessageToCSV(data) {
    const filePath = path.join(__dirname, 'messages.csv');
    const exists = fs.existsSync(filePath);

    const row = `"${data.timestamp}","${data.senderName}","${data.phoneNumber}","${data.message.replace(/"/g, '""')}","${data.groupName}","${data.chatType}"\n`;

    if (!exists) {
        const header = `"Timestamp","Sender Name","Phone Number","Message","Group Name","Chat Type"\n`;
        fs.writeFileSync(filePath, header + row);
    } else {
        fs.appendFileSync(filePath, row);
    }
}


let populatejidwithnums = async ({ sock, isLid_, isjid_, senderJid, }) => {
  console.log("sendj",senderJid)
  if (typeof senderJid != "string") {
    return
  }
             isLid_ =isLid_ || isLid(senderJid)
  isjid_ = isjid_ || isJid(senderJid)
  if (!isLid_ && !isjid_) {
    return
  }
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
                      // willmessage=true
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
  
      // if (e.lid === senderJid) {
      //   phoneNumber = phoneNumber_;
      // }
  
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
  
           
  }
}

module.exports = { populatejidwithnums, extractMessageContent, sendMessageToJid, getGroupMember, extractChat, writeMessageToCSV, extractPhoneNumber2, extractPhoneNumber, isJid, isLid, extractMessageContent_, sendMessageToGroup, sendMessageToNumber, extractMessageContent, FILTER_GROUP_NAMES, getgroupchatmetadata, storegroupchatmetadata }

