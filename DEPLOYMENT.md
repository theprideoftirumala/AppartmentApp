# Deployment Guide — The Pride of Tirumala Expense Tracker

## Prerequisites

1. **Node.js 20+** installed
2. **Google Cloud Console** project with:
   - Google Sheets API enabled
   - Google Drive API enabled
   - OAuth 2.0 Client ID configured (Web Application type)
3. **Git** repository set up

---

## Option 1: GitHub Pages (Recommended for Free Hosting)

### Step 1: Repository Setup

```bash
cd AppartmentApp
git add .
git commit -m "Initial commit: TPT Expense Tracker"
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to **Settings** → **Pages** in your GitHub repository
2. Under **Build and deployment**:
   - Source: **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` will auto-deploy on push

### Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - `https://vijayraavi.github.io`
4. Add to **Authorized redirect URIs**:
   - `https://vijayraavi.github.io/AppartmentApp/`

### Step 4: Deploy

```bash
git push origin main
# GitHub Actions will build and deploy automatically
```

**Your app will be live at:** `https://vijayraavi.github.io/AppartmentApp/`

### Root path deployment on GitHub Pages (`/` instead of `/AppartmentApp/`)

GitHub Pages project repos (like `AppartmentApp`) are always served under `/<repo-name>/`.
If you need root URL (`https://theprideoftirumala.github.io/`), use a **User Pages** repo named exactly:

`theprideoftirumala.github.io`

Then build with root base path:

```bash
$env:VITE_BASE_PATH='/'
npm run build
```

OAuth update for root URL:
- Authorized JavaScript origin: `https://theprideoftirumala.github.io`
- Authorized redirect URI: `https://theprideoftirumala.github.io/`

---

## Option 2: Azure Static Web Apps

### Step 1: Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com/)
2. Click **Create a resource** → Search for **Static Web App**
3. Fill in details:
   - **Name**: `tpt-expense-tracker`
   - **Region**: `Central India` (or nearest)
   - **Source**: GitHub
   - **Organization**: your GitHub account
   - **Repository**: `AppartmentApp`
   - **Branch**: `main`
4. Build Details:
   - **Build Preset**: `Custom`
   - **App location**: `/`
   - **Output location**: `dist`
5. Click **Review + Create** → **Create**

### Step 2: Update Vite Config

For Azure SWA root deployment, set the build-time base path to `/`:

```bash
$env:VITE_BASE_PATH='/'
npm run build
```

`vite.config.js` now applies the same base path to PWA scope and start URL automatically.

### Step 3: Configure Google OAuth

Add your Azure domain to the OAuth Client:
- **Authorized JavaScript origins**: `https://your-app-name.azurestaticapps.net`
- **Authorized redirect URIs**: `https://your-app-name.azurestaticapps.net/`

### Step 4: Deploy

Azure automatically deploys via GitHub Actions when you push to main.

---

## Google Cloud Console Setup

### Enable Required Google APIs (Mandatory)

Before first setup, ensure both APIs are enabled in the same Google Cloud project as your OAuth client:

1. Enable Google Drive API:
   - `https://console.cloud.google.com/apis/library/drive.googleapis.com`
2. Enable Google Sheets API:
   - `https://console.cloud.google.com/apis/library/sheets.googleapis.com`
3. Verify billing/project selector is correct in the top bar.
4. Wait 5-10 minutes after enabling (Google propagation delay), then retry setup.

### API Key (Optional but Recommended)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Restrict the key:
   - **Application restrictions**: HTTP referrers
   - Add: `https://vijayraavi.github.io/*`
   - Add: `http://localhost:*`
4. **API restrictions**: Restrict to Google Sheets API and Google Drive API

### OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External**
3. Fill in:
   - App name: `ApartmentApp Web`
   - User support email: your email
   - Developer contact: your email
4. **Scopes**: Add:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. **Test users**: Add all users who will access the app (max 100 in testing mode)

> **Important**: While in "Testing" mode, only test users can sign in. For ≤100 users, you do NOT need to go through Google's verification process.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Add `http://localhost:5173` to OAuth JavaScript origins for local development.

---

## Environment Variables

No `.env` file is needed — all configuration is stored in the Google Sheet's Configuration tab and can be changed at runtime.

The Google Client ID is in `src/config/constants.js`. This is intentionally public (OAuth client IDs for web apps are not secret).

---

## Updating the App

1. Make changes to the code
2. Test locally with `npm run dev`
3. Push to GitHub: `git push origin main`
4. GitHub Actions automatically builds and deploys

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| OAuth popup blocked | Allow popups for your domain in browser settings |
| "Not a verified app" warning | Add users as test users in OAuth consent screen |
| "Google Drive API has not been used in project" | Enable Drive API and Sheets API in Google Cloud, wait 5-10 minutes, retry |
| 404 on page refresh | Ensure `404.html` is in `/public` (GitHub Pages) |
| API quota exceeded | Google Sheets API has 300 requests/min — this is plenty for 10-20 users |
| PWA not installable | Ensure HTTPS (GitHub Pages provides this automatically) |
| Blank page after deploy | Check `base` in `vite.config.js` matches your deployment path |
