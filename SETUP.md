# Scorebot Setup Guide

Follow these steps to get Scorebot running locally or in production.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- A Cloudflare account (free tier is fine)
- WhatsApp on your phone

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# From the root of the project
npm install
```

This will install all dependencies for all packages thanks to npm workspaces.

### 2. Build Shared Package

The shared package contains types used by both the bot and web packages.

```bash
cd packages/shared
npm run build
cd ../..
```

### 3. Set Up Cloudflare D1 Database

```bash
cd packages/bot

# Login to Cloudflare (if not already logged in)
npx wrangler login

# Create a new D1 database
npx wrangler d1 create scorebot
```

You'll see output like:
```
✅ Successfully created DB 'scorebot'

[[d1_databases]]
binding = "DB"
database_name = "scorebot"
database_id = "xxxx-xxxx-xxxx-xxxx-xxxx"
```

Copy the `database_id` value.

### 4. Update Wrangler Configuration

Edit `packages/bot/wrangler.toml` and replace the `database_id` value:

```toml
[[d1_databases]]
binding = "DB"
database_name = "scorebot"
database_id = "your-actual-database-id-here"
```

### 5. Run Database Migrations

```bash
# Still in packages/bot directory

# For local development
npx wrangler d1 execute scorebot --local --file=./migrations/0001_initial_schema.sql

# For production (optional, do this later when deploying)
npx wrangler d1 execute scorebot --file=./migrations/0001_initial_schema.sql
```

### 6. Start the API Worker (Local)

```bash
# Still in packages/bot
npm run dev
```

You should see:
```
⛅️ wrangler 3.x.x
-------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

Keep this terminal open. The API is now running!

### 7. Set Up Web Interface

Open a new terminal:

```bash
cd packages/web

# Copy environment template
cp .env.example .env

# Edit .env and set the API URL
echo "VITE_API_URL=http://localhost:8787" > .env

# Start the development server
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser. The web interface is ready!

### 8. Set Up WhatsApp Client

Open a third terminal:

```bash
cd packages/bot

# Copy environment template
cp .dev.vars.example .dev.vars

# Edit .dev.vars to set API URL
echo "API_URL=http://localhost:8787" > .dev.vars

# Start the WhatsApp client
npm run whatsapp
```

You'll see a QR code in your terminal. Open WhatsApp on your phone:
1. Go to Settings > Linked Devices
2. Tap "Link a Device"
3. Scan the QR code shown in your terminal

Once connected, you'll see:
```
WhatsApp client is ready!
Listening for messages...
```

### 9. Test It Out!

In your WhatsApp (any chat or group):

1. Create a game:
```
/newgame MyTeam OpponentTeam
```

2. Start the game:
```
/start
```
or just say:
```
game on!
```

3. Record some goals:
```
goal!
```
or
```
/goal
```

4. Check the web interface - you should see live updates!

## Production Deployment

### Deploy the API Worker

```bash
cd packages/bot

# Make sure production database is set up
npx wrangler d1 execute scorebot --file=./migrations/0001_initial_schema.sql

# Deploy
npm run deploy
```

Note the deployed URL (e.g., `https://scorebot-api.your-subdomain.workers.dev`)

### Deploy Web Interface

```bash
cd packages/web

# Update .env with production URL
echo "VITE_API_URL=https://scorebot-api.your-subdomain.workers.dev" > .env

# Build
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

Or deploy the `dist` folder to any static host (Netlify, Vercel, GitHub Pages, etc.)

### Run WhatsApp Client on a Server

The WhatsApp client needs to run continuously. On your server:

```bash
# Clone the repo and install dependencies
git clone <your-repo>
cd scorebot
npm install
cd packages/shared && npm run build && cd ../bot

# Set production API URL
echo "API_URL=https://scorebot-api.your-subdomain.workers.dev" > .env

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start "npm run whatsapp" --name scorebot-whatsapp

# Save PM2 configuration
pm2 save

# Set up auto-start on server reboot
pm2 startup
# Follow the instructions shown
```

## Troubleshooting

### "Cannot find module '@scorebot/shared'"

Make sure you built the shared package:
```bash
cd packages/shared && npm run build
```

### WhatsApp QR code won't scan

- Make sure the QR code is fully visible in your terminal
- Try making your terminal window larger
- The QR code expires after 60 seconds - wait for a new one

### API endpoints return 404

- Make sure the Worker is running (`npm run dev` in packages/bot)
- Check that you're using the correct URL (http://localhost:8787 for local)

### Web interface not updating

- Check browser console for errors (F12)
- Verify VITE_API_URL in packages/web/.env
- Make sure the API is running and accessible
- Check for CORS errors (should be handled by the API)

### Database errors

- Make sure you ran the migrations
- Check that wrangler.toml has the correct database_id
- Try deleting `.wrangler/` directory and restart

## Need Help?

Check the [README.md](./README.md) for more details or open an issue on GitHub.
