# 🚀 ZeroQ Full-Stack Production Deployment Guide

Complete step-by-step instructions to deploy **ZeroQ** to the cloud (100% free tier supported) with persistent WebSocket real-time synchronization, Supabase PostgreSQL, MongoDB Atlas, Twilio SMS, and Gmail SMTP email notifications.

---

## 🏗️ Architecture Overview

| Component | Platform | Free Tier Benefits |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Global Edge CDN, SSL certificate, 100% Next.js 15 native support. |
| **Backend** | [Render](https://render.com) | Persistent Node.js service, WebSockets (Socket.io), 30s background auto-timer worker. |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | 512MB M0 Free Shared Cluster forever. |
| **Realtime Sync** | [Supabase](https://supabase.com) | Realtime PostgreSQL WAL subscriptions (`tokens` table). |
| **SMS / OTP** | [Twilio](https://twilio.com) | Free trial direct SMS delivery. |
| **Email / OTP** | Gmail SMTP | Free transactional OTP & turn notification emails. |

---

## 📋 Step 0: Commit Code to GitHub

Open PowerShell in your project root (`e:\offshore_team_project\QR_Scanner`):

```powershell
# 1. Stage all tracked files (.env and node_modules are automatically excluded by .gitignore)
git add .

# 2. Commit the codebase
git commit -m "feat: complete ZeroQ omnichannel queue management platform"

# 3. Rename branch to main
git branch -M main

# 4. Link your remote GitHub repository (Create a new private or public repository on github.com first)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 5. Push code to GitHub
git push -u origin main
```

---

## 🗄️ Step 1: Set Up Cloud MongoDB (MongoDB Atlas)

Since local `mongodb://127.0.0.1:27017` only exists on your computer, your deployed cloud backend needs a cloud database:

1. Sign in or register at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create Deployment** and choose **M0 Free** (select AWS region, e.g., `Singapore (ap-southeast-1)` or `Mumbai (ap-south-1)`).
3. **Database Access**:
   - Create a database user (e.g. `zeroq_admin`) with a secure password.
4. **Network Access**:
   - Go to **Network Access** ➔ click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud servers (Render) can connect.
5. **Get Connection String**:
   - Go to **Database** ➔ click **Connect** ➔ **Drivers** (Node.js).
   - Copy the URI:
     ```text
     mongodb+srv://zeroq_admin:<password>@cluster0.xxxxx.mongodb.net/virtual_queue?retryWrites=true&w=majority
     ```
   *(Save this URI for Step 2).*

---

## ⚙️ Step 2: Deploy Backend to Render (Free Web Service)

1. Sign in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repo.
4. Configure the service:
   - **Name**: `zeroq-backend` (or custom name)
   - **Region**: Same as your MongoDB (e.g. `Singapore` or `Frankfurt`)
   - **Root Directory**: `backend` *(CRITICAL)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Advanced**:
   - Set **Health Check Path** to `/health`.
6. Add the following **Environment Variables**:

| Variable Key | Value to Paste | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment |
| `PORT` | `5000` | Port |
| `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 1 |
| `SERVER_URL` | `https://zeroq-backend.onrender.com` | Your Render URL (enables 24/7 keep-alive ping) |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | (Update with your Vercel URL after Step 3) |
| `JWT_SECRET` | `your_jwt_secret_key_12345` | JWT secret |
| `SUPABASE_URL` | `https://your-project-id.supabase.co` | Supabase Cloud URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_supabase_service_role_secret_key` | Supabase Service Role Key |
| `SUPABASE_ANON_KEY` | `your_supabase_anon_public_key` | Supabase Anon Key |
| `TWILIO_ACCOUNT_SID` | `your_twilio_account_sid` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | `your_twilio_auth_token` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | `your_twilio_phone_number` | Twilio Phone Number |
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP Host |
| `SMTP_PORT` | `465` | SMTP Port |
| `SMTP_SECURE` | `true` | SSL/TLS enabled |
| `SMTP_USER` | `your_gmail_address@gmail.com` | Your Gmail address |
| `SMTP_PASS` | `your_16_char_google_app_password` | Google App Password |
| `EMAIL_FROM` | `"ZeroQ Virtual Queue" <your_gmail_address@gmail.com>` | Email Sender Header |

7. Click **Create Web Service**.
8. Wait 1–2 minutes. When Render shows **Live**, copy your public backend URL:
   `https://<your-backend-name>.onrender.com`

---

## 💻 Step 3: Deploy Frontend to Vercel (Free Next.js Hosting)

1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select `frontend` *(CRITICAL)*
5. Expand **Environment Variables** and add:

| Variable Key | Value | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://<YOUR-RENDER-BACKEND>.onrender.com/api/v1` | `https://zeroq-backend.onrender.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<YOUR-RENDER-BACKEND>.onrender.com` | `https://zeroq-backend.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_public_key` | Supabase Anon Key |

6. Click **Deploy**.
7. Vercel will build and assign you your live production URL (e.g. `https://zeroq-queue.vercel.app`).
8. **Link back to Backend**:
   - Go back to your [Render Dashboard](https://dashboard.render.com) ➔ `zeroq-backend` ➔ **Environment**.
   - Update `FRONTEND_URL` to your Vercel URL: `https://zeroq-queue.vercel.app`.
   - Click **Save Changes** (Render will auto-reload).

---

## ⚡ Step 4: Keep-Alive (Zero Sleep / Eliminate Cold-Start)

Free tier cloud servers (Render) sleep after 15 minutes of inactivity. ZeroQ has built-in keep-alive protection:

1. Register at [cron-job.org](https://cron-job.org) (100% free) or [UptimeRobot](https://uptimerobot.com).
2. Create a new cron monitor:
   - **Title**: `ZeroQ Keep-Alive`
   - **URL**: `https://<your-backend>.onrender.com/health`
   - **Interval**: Every `10 minutes`
   - **Method**: `GET`
3. Click **Save**.
Your backend will now stay awake 24/7 with zero lag or cold-start freezes!

---

## 📱 Step 5: Test from Any Mobile Device (QR Code Scanning)

1. Open your live Vercel URL in your desktop browser:
   `https://<your-frontend>.vercel.app`
2. Open the QR Check-in Page:
   `https://<your-frontend>.vercel.app/q/express-store`
3. Print or display the QR code on any screen or paper.
4. Scan it using any smartphone camera (iPhone / Android) without installing any app:
   - Enter your name and mobile number or email address.
   - Receive the OTP via SMS or Email.
   - Instant token issuance and live turn tracking!
