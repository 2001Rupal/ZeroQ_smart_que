# Virtual QR Queue Platform 🎫

> **Autonomous Agent & Engineering Master Blueprint | Version 1.0.0**  
> A zero-friction, browser-first digital queue platform that replaces paper ticket dispensers and crowded waiting rooms with real-time state synchronization, multi-counter concurrency locking, and omnichannel notifications.

---

## 🚀 Key Architectural Capabilities

- **Zero App Installation**: Customers scan an on-premise physical QR code and receive their live ticket in their mobile browser (`/q/[storeSlug]` ➔ `/ticket/[tokenUuid]`).
- **Sub-100ms State Virtualization**: Dual-screen full-duplex synchronization between Customer Live Tickets, Staff Counter Consoles, and Public TV Lounge Displays powered by **Socket.io**.
- **Multi-Counter Concurrency Lock**: Atomic MongoDB `findOneAndUpdate` guarantees that when Counter 1 and Counter 2 click **[Call Next]** at the exact same millisecond, they never receive the same token.
- **Dynamic Snooze Memory Shifting**: When staff clicks **[Snooze (+2)]**, the queue engine calculates a floating-point `queuePosition` interpolation (`(pos2 + pos3) / 2`) to place the customer precisely 2 slots behind without disrupting existing integer sequences.
- **Omnichannel Turn Alert Pipeline**:
  1. *In-App WebSockets*: Zero-cost real-time visual card & device vibration (`navigator.vibrate`).
  2. *Meta WhatsApp Cloud API (v19.0)*: Primary alert channel leveraging 1,000 free monthly customer conversations per tenant.
  3. *Carrier SMS Fallback (Twilio)*: Automated failover if WhatsApp delivery fails and tenant prepaid wallet has funds ($0.25/SMS).
- **Public TV Lounge Screen with Web Audio Chime**: High-contrast waiting room board (`/display/[storeSlug]`) with synthesized 2-tone melodic chimes and on-screen scan-to-join QR code.

---

## 📂 Monorepo Structure

```
virtual-queue-platform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # Mongoose connection pool
│   │   │   └── environment.js       # Validated environment variables
│   │   ├── models/
│   │   │   ├── Store.js             # Tenant store settings & wallet
│   │   │   ├── Counter.js           # Multi-counter assignments
│   │   │   ├── Token.js             # Token lifecycle & queuePosition
│   │   │   └── DailySequence.js     # Atomic integer counter per store/day
│   │   ├── services/
│   │   │   ├── queueEngine.js       # Atomic dispatch, snooze math & shifts
│   │   │   ├── socketService.js     # Socket.io room management & emitters
│   │   │   ├── whatsappService.js   # Meta Cloud API integration
│   │   │   └── smsService.js        # Twilio fallback provider
│   │   ├── controllers/
│   │   │   ├── customerController.js
│   │   │   ├── staffController.js
│   │   │   └── storeController.js
│   │   ├── routes/
│   │   │   ├── customerRoutes.js
│   │   │   ├── staffRoutes.js
│   │   │   └── storeRoutes.js
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # HTTP server & Socket.io initialization
│   ├── test/
│   │   └── queueEngine.test.js      # Concurrency & algorithm unit tests
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Interactive Home Portal & Simulation Hub
│   │   │   ├── q/[storeSlug]/page.tsx       # Screen 1: Customer QR entry & form
│   │   │   ├── ticket/[tokenUuid]/page.tsx  # Screen 2: Customer live ticket card
│   │   │   ├── staff/[counterId]/page.tsx   # Screen 3: Staff counter operator console
│   │   │   ├── display/[storeSlug]/page.tsx # Screen 4: Public lounge TV view + chime
│   │   │   └── admin/page.tsx               # Screen 5: Standee QR poster & store settings
│   │   ├── components/
│   │   │   ├── CustomerTicketCard.tsx
│   │   │   ├── QueueSlidingWindow.tsx       # 5-Token sliding window
│   │   │   └── CounterControlBar.tsx        # Call, Snooze (+2), Complete, Skip
│   │   ├── hooks/
│   │   │   ├── useSocket.ts                 # Managed WebSocket connection
│   │   │   └── usePersistentTicket.ts       # LocalStorage ticket recovery
│   │   ├── lib/
│   │   │   ├── api.ts                       # Fetch wrappers
│   │   │   └── chime.ts                     # Web Audio API chime synthesizer
│   ├── package.json
│   └── .env.local
├── package.json
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

### 1. Run Automated Algorithmic & Concurrency Tests
Run the test suite to verify atomic sequence generation, multi-counter race condition locking, and 2-slot snooze displacement:
```bash
cd backend
npm test
```
*Output: `🎉 ALL CORE ALGORITHMIC AND CONCURRENCY TESTS PASSED 100%!`*

### 2. Start the Backend API & WebSocket Server
```bash
cd backend
npm run dev
```
- API server runs at: `http://localhost:5000`
- WebSocket server runs at: `ws://localhost:5000`
- Health check: `http://localhost:5000/health`

### 3. Start the Next.js Frontend
In a new terminal:
```bash
cd frontend
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## 📱 Multi-Screen Simulation Walkthrough

1. **Home Portal (`http://localhost:3000`)**:
   - Access one-click links to all 5 screens.
   - Click **"Reset Demo Queue"** to initialize demo store `express-store` with 3 counters (`Billing 1`, `Billing 2`, `Prescription Pickup`) and 5 demo customers.

2. **Public Lounge TV Display (`http://localhost:3000/display/express-store`)**:
   - High-contrast 1080p/4K board showing real-time clock, active counters, next 5 tokens, and an on-screen QR code.
   - Click the speaker icon to test the synthesized Web Audio chime.

3. **Customer Mobile QR Experience (`http://localhost:3000/q/express-store`)**:
   - Enter name and mobile number.
   - Automatically redirects to `/ticket/[tokenUuid]` showing the large circular badge (`#06`), people ahead, and estimated wait time.

4. **Staff Counter 1 Console (`http://localhost:3000/staff/[counterId]`)**:
   - Operator workspace with 5-token sliding queue window.
   - Click **[Call Next]**: Leading token is claimed atomically, TV announces token, and customer's phone vibrates!
   - Click **[Snooze (+2)]**: If the customer hasn't arrived, token is shifted precisely 2 spots back into the waiting line.
   - Click **[Complete]**: Transaction finishes, counter is freed.

5. **Staff Counter 2 Console**:
   - Open Counter 2 in a separate window to test simultaneous calls. Observe that both counters pull distinct tokens without collisions.

6. **Admin & On-Premise Standee (`http://localhost:3000/admin`)**:
   - Printable QR poster ready for acrylic standees or lobby counter printouts.
   - Configure WhatsApp Cloud API toggles, Twilio SMS fallback, and inspect wallet balance.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/queue/register` | Register customer: `{ storeSlug, name, phone }` |
| `GET` | `/api/v1/queue/status/:tokenUuid` | Customer live ticket status, people ahead, estimated wait |
| `POST` | `/api/v1/queue/cancel` | Cancel customer ticket: `{ tokenUuid }` |
| `POST` | `/api/v1/staff/call-next` | Atomically claim next waiting token: `{ counterId }` |
| `POST` | `/api/v1/staff/snooze` | Shift called token 2 spots back: `{ tokenId }` |
| `POST` | `/api/v1/staff/complete` | Complete token and free counter: `{ tokenId }` |
| `POST` | `/api/v1/staff/skip` | Skip token and free counter: `{ tokenId }` |
| `GET` | `/api/v1/staff/counter/:counterId` | Get counter details and active queue |
| `GET` | `/api/v1/stores` | List all tenant stores |
| `GET` | `/api/v1/stores/:slug` | Fetch store, counters, and queue state |
| `POST` | `/api/v1/stores/seed` | Seed demo store and demo customers |

---

## ⚡ WebSocket Protocol (Socket.io)

### Rooms
- `store:<storeId>`: Joined by Counter Consoles and Public TV Displays.
- `token:<tokenUuid>`: Joined by individual customer mobile browsers.

### Events Emitted
- `QUEUE_STATE_CHANGED`: Emits `activeServing`, `upcomingQueue` (top 5), and `totalWaiting`.
- `TOKEN_CALLED`: Emits `tokenNumber`, `customerName`, `counterName`, `counterNumber` (triggers TV display audio chime).
- `TICKET_UPDATED`: Emits `status`, `peopleAhead`, `assignedCounter`, and `estimatedWaitMinutes`.

---

## 🛡️ Concurrency & Mathematical Verification

- **Atomic Daily Sequence**: MongoDB `$inc` on `{ storeId, dateKey }` guarantees duplicate tokens are never generated.
- **Mutual Exclusion**: Token claiming uses `findOneAndUpdate` with `{ status: 'WAITING' }`, `sort: { queuePosition: 1 }`, and `$set: { status: 'CALLED', assignedCounterId: counterId }`.
- **Snooze Interpolation Formula**:
  - 0 tokens waiting: keep current position.
  - 1 token waiting: `nextWaiting[0].queuePosition + 50`.
  - 2+ tokens waiting: `(secondToken.queuePosition + thirdToken.queuePosition) / 2`.

---

## 📱 Progressive Web App (PWA) & Offline Mode
- Fully installable on Android (Chrome), iOS (Safari), and Desktop.
- Service Worker caching (`/sw.js`) with offline fallback screen (`offline.html`).
- Fast load with Stale-While-Revalidate caching.

---

## 🚀 Cloud Deployment & Zero-Idle Protection
- **Render / Railway / Glitch Cold-Start Defense**: Self-ping keep-alive service (`keepAliveService.js`) pings `/health` every 12 mins.
- **Instant Frontend SWR Cache**: `<ServerWarmingIndicator />` detects instance wakeups gracefully while the UI loads in <10ms from cache.
- **Step-by-Step Deployment Guide**: See [DEPLOYMENT_GUIDE.md](file:///e:/offshore_team_project/QR_Scanner/DEPLOYMENT_GUIDE.md) for 1-click Render and Vercel deployments.

