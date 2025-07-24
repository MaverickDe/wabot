
---

# WhatsApp Market Scraper / Trading Bot

This project is a Node.js-based tool designed to **monitor WhatsApp group chats**, **extract market-related intent**, and **store structured data** like items for sale, their prices, locations, and sellers. The system can be extended to build a marketplace powered by social conversations.

---

## Features

* Extracts **buy/sell intent** from natural language messages.
* Detects **items**, **price (with currency)**, and **locations**.
* Saves to a database for future listing, discovery, or analytics.
* Extensible message parser and modular design.
* Built-in **Bailey integration** using `@whiskeysockets/baileys` for WhatsApp access.

---

## ⚙️ Tech Stack

| Component    | Tech Used                                            |
| ------------ | ---------------------------------------------------- |
| WhatsApp Bot | [Baileys](https://github.com/WhiskeySockets/Baileys) |
| Runtime      | Node.js (TypeScript)                                 |
| Database     | SQL or PostgreSQL (via Drizzle)                    |
| Parser Logic | Custom NLP-style regex logic    or chatgpt                      |
| Storage ORM  | drizzle                                               |
| Deployment   | PM2 / Docker / Railway / Render                      |

---

## 📁 Project Structure

```
whatsapp-market-bot/
├── prisma/                  # Prisma DB schema
│   └── schema.prisma
├── src/
│   ├── bot/                 # WhatsApp bot using Baileys
│   ├── parser/              # Intent and info extractor
│   ├── db/                  # Prisma client + init
│   ├── types/               # TypeScript types
│   └── index.ts             # App entry
├── .env                     # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## Bailey Setup (WhatsApp Bot)

Baileys is a lightweight TypeScript library to connect to WhatsApp Web.

### 🔧 WhatsApp Connection Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Scan QR code:

   ```bash
   node baily.js
   ```

   * Open WhatsApp on your phone.
   * Tap “Linked Devices” → “Link a device”.
   * Scan the QR code printed in your terminal.

3. Now you’re connected and receiving messages in real time.

---

## 🛠️ Requirements

### ✅ Prerequisites

* Node.js >= 20.x
* SQL (default) or PostgreSQL (optional)
* WhatsApp account
* A WhatsApp group with real conversation

### 📦 Install Dependencies

```bash
npm install
```

### 🧪 Environment Setup

Create a `.env` file:

```env
DATABASE_URL2="file:./dev.db" # or use PostgreSQL

```

---

## Database Setup

We use Drizzle for ORM.



### Migrate

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

---

## Bailey Message Handler (Core Bot)

When a new message is received, the flow is:

1. Message is passed to `extractMarketInfo(message)`.
2. It detects:

   * **Intent** (`buy`, `sell`, `unknown`)
   * **Item**
   * **Price + Currency**
   * **Location**
3. If relevant, store it in the database.

```ts
const marketInfo = extractMarketInfo(msg);
if (marketInfo.intent !== 'unknown') {
//  store in db
}
```

---

## Message Parser Logic

Located at `src/parser/extractMarketInfo.ts`

Handles:

* Slangs: `wan sell`, `dey find`, `for sale`
* Currency: ₦, \$, £, €
* Price: `450k`, `1,000,000`
* Location: `in Lagos`, `from Abuja`

Handles noise and filters unrelated text.

---

## Sample Test Message

```ts
extractMarketInfo("I wan sell iPhone 11 ₦250k from Abuja");
```

Returns:

```ts
{
  intent: "sell",
  item: "iPhone 11",
  price: "250000",
  currency: "₦",
  location: "Abuja"
}
```

---

## Extending the Bot

* 💬 Auto-reply to market messages
* 🛒 Create listings dashboard
* 🕵️ Admin panel to approve deals
* 📦 Group up similar listings
* 🔔 Alert users on new posts

---

## Run the Bot

```bash
node baily.js
```








## Tips

* Use `pm2` for production uptime.
* You can save session credentials (`auth_info.json`) to avoid rescan.
* Rate-limit messages to avoid WhatsApp ban.

---
