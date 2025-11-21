# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scorebot is a WhatsApp chatbot that monitors group chat messages to automatically track ultimate frisbee game scores in real-time. The system includes a web interface where people can follow along with live game updates.

## Architecture

The project is organized as a TypeScript monorepo with three main packages:

### packages/shared
Core types and utilities shared across all packages. Key exports:
- Type definitions: `Game`, `GameEvent`, `EventType`, `GameStatus`, `TeamSide`, `Score`
- Utility functions: `generateId()`, `parseScore()`, `formatScore()`, `calculateScoreFromEvents()`

### packages/bot
Cloudflare Workers application with Durable Objects for real-time game state and D1 for persistent storage.

**Key components:**
- `src/durable-objects/GameState.ts` - Durable Object managing in-memory game state with methods for game lifecycle (init, start, addEvent, end, undo)
- `src/parser/MessageParser.ts` - Natural language parser that recognizes game events from chat messages (goals, halftime, game start/end)
- `src/api/router.ts` - HTTP API router handling REST endpoints
- `src/db/database.ts` - D1 database service for persistent storage
- `src/whatsapp/client.ts` - WhatsApp client (runs separately as Node.js process, not in Workers)

**Data flow:**
1. WhatsApp messages → MessageParser → Event detection
2. Events sent to Worker API → Durable Object (real-time state) → D1 (persistence)
3. Web interface polls API → reads from Durable Object or D1

### packages/web
Static web interface built with Vite, vanilla TypeScript, and HTML/CSS. Polls the API every 3 seconds for updates and displays a timeline view of game events.

## Development Commands

### Initial Setup
```bash
# Install all dependencies
npm install

# Build shared package first (required by others)
cd packages/shared && npm run build
cd ../..
```

### Bot/API (Cloudflare Workers)
```bash
cd packages/bot

# Create D1 database (first time only)
npx wrangler d1 create scorebot
# Copy the database_id to wrangler.toml

# Run migrations
npx wrangler d1 execute scorebot --local --file=./migrations/0001_initial_schema.sql

# Start local development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Web Interface
```bash
cd packages/web

# Create .env file with API URL
cp .env.example .env
# Edit .env and set VITE_API_URL to your Worker URL

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

### WhatsApp Client (separate Node.js process)
```bash
cd packages/bot

# Set up environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set API_URL to your Worker URL

# Install WhatsApp client dependencies
npm install whatsapp-web.js qrcode-terminal

# Start WhatsApp client (will show QR code to scan)
npm run whatsapp
# Or: node -r ts-node/register src/whatsapp/client.ts
```

## Common Development Tasks

### Adding a New Event Type
1. Add the event type to `EventType` enum in `packages/shared/src/types.ts`
2. Update `MessageParser.ts` to recognize the new event pattern
3. Update `GameState.ts` to handle the new event type
4. Update the web interface to display the new event type

### Modifying the Message Parser
The parser uses regex patterns with confidence scores (0-1). To add new patterns:
- Edit `packages/bot/src/parser/MessageParser.ts`
- Add patterns to the appropriate `parse*` method
- Patterns are tried in order of specificity
- Only events with confidence > 0.6 are processed

### Working with Durable Objects
Each chat has its own Durable Object instance (identified by chatId). The Durable Object maintains game state in memory for fast access and syncs to D1 for persistence. Access via:
```typescript
const id = env.GAME_STATE.idFromName(chatId);
const stub = env.GAME_STATE.get(id);
const response = await stub.fetch(request);
```

### Database Schema Changes
1. Create new migration file in `packages/bot/migrations/`
2. Use naming convention: `XXXX_description.sql`
3. Test locally: `npx wrangler d1 execute scorebot --local --file=./migrations/XXXX_description.sql`
4. Apply to production: `npx wrangler d1 execute scorebot --file=./migrations/XXXX_description.sql`

## WhatsApp Integration

The WhatsApp client runs separately from the Cloudflare Worker because it requires a persistent WebSocket connection. It:
- Authenticates via QR code (one-time setup)
- Stores auth session in `.wwebjs_auth/` directory
- Listens to all messages in monitored chats
- Parses messages and sends events to the Worker API

**Available commands:**
- `/newgame <our-team> <opponent>` - Create and start tracking a game
- `/goal [us|them]` - Record a goal
- `/halftime` - Record halftime
- `/endgame` - End game tracking
- `/undo` - Undo last event
- `/score` - Show current score

**Natural language support:**
The parser recognizes casual phrases like "goal!", "we scored", "halftime", "game over" without needing commands.

## Testing

To test the full system locally:
1. Start the Worker: `cd packages/bot && npm run dev`
2. Start the web interface: `cd packages/web && npm run dev`
3. Start the WhatsApp client: `cd packages/bot && npm run whatsapp`
4. Send messages in your WhatsApp group to test parsing

You can also test the API directly with curl:
```bash
# Create a game
curl -X POST http://localhost:8787/games \
  -H "Content-Type: application/json" \
  -d '{"chatId":"test123","ourTeamName":"Team A","opponentName":"Team B"}'

# Get game
curl http://localhost:8787/games/{gameId}

# Add event
curl -X POST http://localhost:8787/games/{gameId}/events \
  -H "Content-Type: application/json" \
  -d '{"type":"goal","team":"us","message":"Goal!"}'
```

## Deployment Checklist

1. Deploy Worker: `cd packages/bot && npm run deploy`
2. Note the Worker URL (e.g., `https://scorebot-api.your-subdomain.workers.dev`)
3. Update `packages/web/.env` with the Worker URL
4. Deploy web interface: `cd packages/web && npm run deploy`
5. Set up WhatsApp client on a server/computer that stays online
6. Configure WhatsApp client with production Worker URL

## Project Structure Notes

- All TypeScript files use ES modules (`.js` extensions in imports)
- The shared package must be built before other packages can use it
- Durable Objects provide consistency per chat but don't share state across chats
- The web interface is fully static and can be hosted anywhere (not just Cloudflare Pages)
- WhatsApp client needs to run continuously; consider using PM2 or similar for production
