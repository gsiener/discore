# Scorebot

A WhatsApp chatbot that automatically tracks ultimate frisbee game scores in real-time, with a web interface for live game updates.

## Features

- **Natural Language Processing**: Recognizes score updates from casual chat messages
  - "goal!" → Records a goal for your team
  - "Jake to Mason 5-3" → Records goal with players and score
  - "Ellis block" → Records defensive block
  - "Cyrus steal" → Records defensive steal
  - "Timeout Tech" → Records timeout for team
  - "Tech starting on O" → Records starting offense/defense
  - "halftime" → Records halftime
  - "game over" → Ends the game

- **Manual Commands**: Explicit commands for precise control
  - `/newgame <our-team> <opponent>` - Start tracking a new game
  - `/goal [us|them]` - Record a goal
  - `/halftime` - Record halftime
  - `/endgame` - End game
  - `/undo` - Undo last event
  - `/score` - Show current score

- **Live Web Interface**: WFDF-style game display at https://score.kcuda.org
  - **Timeline View**: Three-cell layout with colored bars, event details, and scores
  - **Progression Table**: Point-by-point score evolution with visual indicators
  - **Break Detection**: Accurate offensive hold vs break score identification
  - **Defensive Stats**: Display blocks (🛡️) and steals (🏃) in timeline
  - **Timeout Tracking**: Show timeout events with team attribution
  - **Winner Indicators**: Arrows pointing to winning score for finished games
  - **Game Metadata**: Date, time, and field information
  - Auto-refreshing every 3 seconds
  - Mobile-responsive design

## Architecture

Built as a TypeScript monorepo with three packages:

1. **@scorebot/shared** - Shared types and utilities
2. **@scorebot/bot** - Cloudflare Worker API + WhatsApp client
3. **@scorebot/web** - Web interface (static site)

### Technology Stack

- **Backend**: Cloudflare Workers, Durable Objects, D1 (SQLite)
- **Frontend**: TypeScript, Vite, vanilla HTML/CSS
- **WhatsApp**: whatsapp-web.js (Node.js client)
- **Hosting**: Cloudflare Workers & Pages

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)
- WhatsApp account

### Installation

1. Clone and install dependencies:
```bash
git clone <your-repo-url>
cd scorebot
npm install
```

2. Build shared package:
```bash
cd packages/shared
npm run build
cd ../..
```

3. Set up Cloudflare D1 database:
```bash
cd packages/bot

# Create database
npx wrangler d1 create scorebot

# Update wrangler.toml with the database_id from the output

# Run migrations
npx wrangler d1 execute scorebot --local --file=./migrations/0001_initial_schema.sql
```

4. Start the Worker locally:
```bash
npm run dev
# Worker runs on http://localhost:8787
```

5. Set up and start the web interface:
```bash
cd ../web
cp .env.example .env
# Edit .env and set VITE_API_URL=http://localhost:8787

npm run dev
# Web interface runs on http://localhost:3000
```

6. Set up WhatsApp client:
```bash
cd ../bot
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set API_URL=http://localhost:8787

# Start WhatsApp client
npm run whatsapp
# Scan the QR code with WhatsApp on your phone
```

## Usage

### Starting a Game

1. In your WhatsApp group, send:
```
/newgame YourTeam OpponentTeam
```

2. The bot will confirm and start tracking the game

3. Share the web interface URL with your team to follow along

### Tracking Scores

The bot automatically recognizes natural language:
- "Goal!" or "We scored!" → Records a goal for your team
- "Jake to Mason" → Records goal with assist and scorer
- "5-3" → Records the current score
- "Ellis block" → Records defensive block leading to turnover
- "Cyrus steal" → Records defensive steal
- "Timeout Tech" → Records timeout for your team
- "Halftime" → Marks halftime
- "Game over" or "Final" → Ends the game

Or use explicit commands:
- `/goal` → Goal for your team
- `/goal them` → Goal for opponent

### Advanced Tracking

For accurate break vs hold detection, specify starting possession:
- "Tech starting on O" → Indicates team started on offense
- "Tech starting on D" → Indicates team started on defense

The system automatically tracks:
- Offensive holds (scoring when expected)
- Break scores (scoring after defensive turnover)
- Defensive plays (blocks and steals)
- Timeouts by team

### Viewing Games

Open https://score.kcuda.org to see:
- **Live score updates** with winner indicators (for finished games)
- **WFDF-style timeline** with event-by-event breakdown
  - Colored bars indicating scoring team (green for your team, orange for opponent)
  - Event types: Offensive Hold, Break Score, Halftime, Timeouts
  - Defensive play indicators (blocks 🛡️ and steals 🏃)
  - Player names for assists and scorers
- **Progression table** showing point-by-point score evolution
  - Bold numbers indicate which team scored
  - Underlined scores indicate break scores
  - Vertical separators for game start, halftime, and final
- **Game metadata**: Date, time, and status
- Auto-refreshes every 3 seconds for live updates

## Deployment

### Deploy Worker API

```bash
cd packages/bot

# Create production D1 database
npx wrangler d1 create scorebot
# Update wrangler.toml with production database_id

# Run migrations
npx wrangler d1 execute scorebot --file=./migrations/0001_initial_schema.sql

# Deploy
npm run deploy

# Deployed to:
# - https://scorebot-api.siener.workers.dev
# - https://api.score.kcuda.org (custom domain)
```

### Deploy Web Interface

```bash
cd packages/web

# Update .env with production Worker URL
echo "VITE_API_URL=https://scorebot-api.siener.workers.dev" > .env

# Build and deploy
npm run build
npm run deploy

# Deployed to: https://score.kcuda.org
```

### Custom Domain Setup

The project uses custom domains for professional URLs:
- API: `api.score.kcuda.org`
- Web: `score.kcuda.org`

See `CUSTOM_DOMAIN_SETUP.md` for configuration details.

### Deploy WhatsApp Client

The WhatsApp client needs to run continuously on a server:

```bash
# On your server
cd packages/bot

# Set production API URL
echo "API_URL=https://scorebot-api.your-subdomain.workers.dev" > .env

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start "npm run whatsapp" --name scorebot-whatsapp
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

## Development

### Project Structure

```
scorebot/
├── packages/
│   ├── shared/          # Shared types and utilities
│   │   └── src/
│   │       ├── types.ts
│   │       └── utils.ts
│   ├── bot/             # Backend API and WhatsApp client
│   │   ├── src/
│   │   │   ├── api/           # API router
│   │   │   ├── db/            # Database service
│   │   │   ├── durable-objects/  # Game state management
│   │   │   ├── parser/        # Message parser
│   │   │   └── whatsapp/      # WhatsApp client
│   │   ├── migrations/        # Database migrations
│   │   └── wrangler.toml      # Cloudflare config
│   └── web/             # Web interface
│       └── src/
│           ├── index.html
│           ├── main.ts
│           └── style.css
├── package.json
└── tsconfig.json
```

### Adding Features

See [CLAUDE.md](./CLAUDE.md) for detailed development guidance.

### Running Tests

```bash
# Test the API
curl -X POST http://localhost:8787/games \
  -H "Content-Type: application/json" \
  -d '{"chatId":"test","ourTeamName":"Team A","opponentName":"Team B"}'
```

## Troubleshooting

### WhatsApp client won't connect
- Make sure you scanned the QR code within 60 seconds
- Delete `.wwebjs_auth/` folder and try again
- Check that port 8787 is accessible

### Web interface not updating
- Verify VITE_API_URL is set correctly
- Check browser console for CORS errors
- Ensure Worker is running and accessible

### Events not being recorded
- Check WhatsApp client logs for parsing confidence
- Try using explicit commands instead of natural language
- Verify game was created with `/newgame`

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
