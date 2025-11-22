# Custom Domain Setup for score.kcuda.org

This guide walks through setting up custom domains for the Scorebot application.

## Overview

- **Web Interface**: `score.kcuda.org` → Cloudflare Pages
- **API**: `api.score.kcuda.org` → Cloudflare Worker

## Step 1: Deploy the Worker

First, deploy the Worker to Cloudflare:

```bash
cd packages/bot
npm run deploy
```

The Worker is configured to automatically route traffic from `api.score.kcuda.org/*` (see wrangler.toml).

## Step 2: Add Custom Domain to Pages

You need to add `score.kcuda.org` as a custom domain to your `scorebot` Pages project via the Cloudflare dashboard:

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Click on the **scorebot** project
4. Go to the **Custom domains** tab
5. Click **Set up a custom domain**
6. Enter: `score.kcuda.org`
7. Click **Continue**
8. Cloudflare will automatically create the DNS records since kcuda.org is already in your account

## Step 3: Deploy the Web Interface

Build and deploy the web interface:

```bash
cd packages/web
npm run deploy
```

The production build will automatically use `https://api.score.kcuda.org` for API calls.

## Step 4: Verify Setup

After deployment and DNS propagation (usually 1-2 minutes for Cloudflare):

1. Visit `https://score.kcuda.org` - you should see the web interface
2. Visit `https://api.score.kcuda.org/health` - you should see API health check
3. Test creating a game and viewing it on the web interface

## DNS Records

Cloudflare automatically creates these DNS records when you add the custom domains:

- `score.kcuda.org` → CNAME to `scorebot.pages.dev`
- `api.score.kcuda.org` → CNAME/A record to Cloudflare Workers

## Troubleshooting

### Custom domain not working for Pages

If the Pages custom domain doesn't work:
1. Check DNS propagation: `dig score.kcuda.org`
2. Verify the domain was added in the Cloudflare dashboard
3. Check SSL/TLS encryption mode is "Full" or "Full (strict)"

### Worker route not working

If the API isn't accessible:
1. Verify the Worker deployed successfully: `wrangler deployments list`
2. Check the route is configured in wrangler.toml
3. Verify DNS for `api.score.kcuda.org` points to Cloudflare

### CORS errors

If you see CORS errors in the browser console, you may need to add CORS headers to the Worker (already configured in the router).
