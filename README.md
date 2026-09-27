# ProSmart Dashboard - Smart Living, Simplified

A modern, responsive smart home web dashboard for **Tuya Smart** and **Smart Life** devices, featuring real-time device control, instant synchronization, and status monitoring.

---

## 🚀 Quick Start (Run Locally on Your Machine)

To run the dashboard on your computer with direct access to your real devices:

```bash
# 1. Clone your repository
git clone https://github.com/Prosmart2025/Prosmart-Dashboard.git
cd Prosmart-Dashboard

# 2. Start the local server
npm start
# or: node server.js
```

Open your browser at `http://localhost:3000`.

---

## ☁️ Deploy to Vercel (1-Click Cloud Hosting)

This repository is pre-configured for instant zero-configuration deployment on Vercel:

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Select `Prosmart-Dashboard` and click **Deploy**.
4. Your dashboard will be live at `https://your-dashboard.vercel.app` with full, uninterrupted live access to Tuya Cloud!

---

## 📱 How to Link Your Smart Life / Tuya Mobile App to Real Devices

1. **Open Tuya IoT Platform**:
   - Go to [iot.tuya.com](https://iot.tuya.com) and log into your developer account.
   - Go to **Cloud** &rarr; **Development** &rarr; open your Cloud Project.
   - Ensure **Central Europe Data Center** is enabled in your project overview.

2. **Scan the Official QR Code**:
   - In your project, go to **Devices** &rarr; **Link Tuya App Account**.
   - Click **Add App Account**. Tuya will display the official pairing QR code.
   - Open **Smart Life** or **Tuya Smart** on your phone &rarr; **Me** &rarr; tap **Scan (⛶)** in the top right &rarr; scan and confirm.

3. **Copy Your App User ID (UID)**:
   - In the linked accounts table right below the QR code, copy your **UID** (e.g. `eu1745...`).

4. **Connect in ProSmart**:
   - Open your ProSmart Dashboard &rarr; **Account & Keys**.
   - Paste your **UID**, **Access ID (Client ID)**, and **Access Secret**.
   - Click **Save & Sync Real Devices**. All your live switches, lights, and appliances will load!
