/**
 * WhatsApp client for Scorebot
 * Connects to WhatsApp and processes messages
 *
 * Note: This requires running as a Node.js process, not in Cloudflare Workers
 * Run with: npm run whatsapp
 */

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { MessageParser } from '../parser/MessageParser';
import { EventType } from '@scorebot/shared';
import qrcode from 'qrcode-terminal';

interface Config {
  apiUrl: string;
  chatId?: string; // Optional: Specific chat to monitor
}

export class WhatsAppClient {
  private client: Client;
  private parser: MessageParser;
  private config: Config;
  private activeGames: Map<string, string> = new Map(); // chatId -> gameId

  constructor(config: Config) {
    this.config = config;
    this.parser = new MessageParser();

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // QR code for authentication
    this.client.on('qr', (qr) => {
      console.log('Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      console.log('Listening for messages...');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failure:', msg);
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
    });

    // Message received
    this.client.on('message', async (msg) => {
      await this.handleMessage(msg);
    });
  }

  async start() {
    console.log('Starting WhatsApp client...');
    await this.client.initialize();
  }

  async stop() {
    console.log('Stopping WhatsApp client...');
    await this.client.destroy();
  }

  private async handleMessage(msg: Message) {
    try {
      // Get chat info
      const chat = await msg.getChat();
      const chatId = chat.id._serialized;

      // If we have a specific chat filter, only process that chat
      if (this.config.chatId && chatId !== this.config.chatId) {
        return;
      }

      // Skip messages from self
      if (msg.fromMe) {
        return;
      }

      // Parse the message
      const parsed = this.parser.parse(msg.body);

      // Check if this is a command
      if (msg.body.startsWith('/')) {
        await this.handleCommand(msg, chatId);
        return;
      }

      // If we have a confident parse, process it
      if (parsed.type && parsed.confidence > 0.6) {
        await this.processEvent(chatId, parsed, msg);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleCommand(msg: Message, chatId: string) {
    const parts = msg.body.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case '/newgame':
        case '/start':
          await this.createGame(chatId, args, msg);
          break;

        case '/goal':
          await this.recordGoal(chatId, args, msg);
          break;

        case '/halftime':
          await this.recordHalftime(chatId, msg);
          break;

        case '/endgame':
        case '/end':
          await this.endGame(chatId, msg);
          break;

        case '/undo':
          await this.undoLastEvent(chatId, msg);
          break;

        case '/score':
          await this.showScore(chatId, msg);
          break;

        case '/help':
          await this.showHelp(msg);
          break;

        default:
          await msg.reply('Unknown command. Type /help for available commands.');
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await msg.reply('Sorry, something went wrong processing that command.');
    }
  }

  private async createGame(chatId: string, args: string[], msg: Message) {
    if (args.length < 2) {
      await msg.reply(
        'Usage: /newgame <our-team-name> <opponent-name>\nExample: /newgame "Team Awesome" "Other Team"'
      );
      return;
    }

    const ourTeamName = args[0];
    const opponentName = args.slice(1).join(' ');

    const response = await fetch(`${this.config.apiUrl}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, ourTeamName, opponentName }),
    });

    if (!response.ok) {
      await msg.reply('Failed to create game. Please try again.');
      return;
    }

    const data = await response.json();
    this.activeGames.set(chatId, data.game.id);

    await msg.reply(
      `Game created: ${ourTeamName} vs ${opponentName}\nGame ID: ${data.game.id}\nSay "game on" or "let's start" to begin!`
    );
  }

  private async recordGoal(chatId: string, args: string[], msg: Message) {
    const gameId = this.activeGames.get(chatId);
    if (!gameId) {
      await msg.reply(
        'No active game in this chat. Start one with /newgame'
      );
      return;
    }

    const team = args[0]?.toLowerCase() === 'them' ? 'them' : 'us';

    await this.sendEvent(gameId, {
      type: EventType.GOAL,
      team,
      message: msg.body,
    });

    await msg.reply(`Goal recorded for ${team}!`);
  }

  private async recordHalftime(chatId: string, msg: Message) {
    const gameId = this.activeGames.get(chatId);
    if (!gameId) {
      await msg.reply(
        'No active game in this chat. Start one with /newgame'
      );
      return;
    }

    await this.sendEvent(gameId, {
      type: EventType.HALFTIME,
      message: msg.body,
    });

    await msg.reply('Halftime recorded!');
  }

  private async endGame(chatId: string, msg: Message) {
    const gameId = this.activeGames.get(chatId);
    if (!gameId) {
      await msg.reply(
        'No active game in this chat. Start one with /newgame'
      );
      return;
    }

    await this.sendEvent(gameId, {
      type: EventType.GAME_END,
      message: msg.body,
    });

    await msg.reply('Game ended! Good game!');
    this.activeGames.delete(chatId);
  }

  private async undoLastEvent(chatId: string, msg: Message) {
    const gameId = this.activeGames.get(chatId);
    if (!gameId) {
      await msg.reply(
        'No active game in this chat. Start one with /newgame'
      );
      return;
    }

    const response = await fetch(
      `${this.config.apiUrl}/games/${gameId}/undo`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      await msg.reply('Failed to undo. Maybe no events to undo?');
      return;
    }

    await msg.reply('Last event undone!');
  }

  private async showScore(chatId: string, msg: Message) {
    const gameId = this.activeGames.get(chatId);
    if (!gameId) {
      await msg.reply(
        'No active game in this chat. Start one with /newgame'
      );
      return;
    }

    const response = await fetch(`${this.config.apiUrl}/games/${gameId}`);
    if (!response.ok) {
      await msg.reply('Failed to get game info.');
      return;
    }

    const data = await response.json();
    const game = data.game;

    await msg.reply(
      `${game.teams.us.name}: ${game.score.us}\n${game.teams.them.name}: ${game.score.them}\nStatus: ${game.status}`
    );
  }

  private async showHelp(msg: Message) {
    const help = `
Scorebot Commands:

/newgame <our-team> <opponent> - Start a new game
/goal [us|them] - Record a goal (default: us)
/halftime - Record halftime
/endgame - End the current game
/undo - Undo the last event
/score - Show current score
/help - Show this help message

You can also use natural language:
- "goal!" or "we scored" to record a goal
- "halftime" to record halftime
- "game over" to end the game
    `;

    await msg.reply(help.trim());
  }

  private async processEvent(
    chatId: string,
    parsed: any,
    msg: Message
  ) {
    const gameId = this.activeGames.get(chatId);

    // If no active game and it's a game start, we need to prompt for game creation
    if (!gameId && parsed.type === EventType.GAME_START) {
      await msg.reply(
        'Looks like you want to start a game! Use /newgame <our-team> <opponent> first.'
      );
      return;
    }

    if (!gameId) {
      // We have no game context, ignore
      return;
    }

    // Send event to API
    await this.sendEvent(gameId, {
      type: parsed.type,
      team: parsed.team,
      message: msg.body,
    });

    // Optionally send a confirmation (can be disabled to avoid spam)
    // await msg.react('✅');
  }

  private async sendEvent(gameId: string, eventData: any) {
    const response = await fetch(
      `${this.config.apiUrl}/games/${gameId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send event to API');
    }

    return response.json();
  }
}

// If run directly
if (require.main === module) {
  const apiUrl = process.env.API_URL || 'http://localhost:8787';
  const chatId = process.env.WHATSAPP_CHAT_ID;

  const client = new WhatsAppClient({ apiUrl, chatId });

  client.start().catch((error) => {
    console.error('Failed to start WhatsApp client:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.stop();
    process.exit(0);
  });
}
