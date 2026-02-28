import { schema, table, t, SenderError } from 'spacetimedb/server';
import { WORD_LIST } from './words';

// --- Helper: Seeded PRNG (reducers must be deterministic — no Math.random) ---
function seededRandom(seed: bigint): () => number {
  let s = Number(seed & BigInt(0x7FFFFFFF)) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRoomCode(rng: () => number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(rng() * chars.length)];
  }
  return code;
}

// --- Schema ---

const Game = table(
  { public: true },
  {
    gameId: t.u64().primaryKey().autoInc(),
    roomCode: t.string().unique(),
    status: t.string(),         // "waiting" | "in_progress" | "finished"
    currentTeam: t.string(),    // "red" | "blue"
    currentPhase: t.string(),   // "clue" | "guess"
    clueWord: t.string(),
    clueNumber: t.i32(),        // -1 = no clue, 0 = zero, 99 = unlimited
    guessesRemaining: t.i32(),
    guessesMade: t.i32(),
    winner: t.string(),         // "" | "red" | "blue"
    firstTeam: t.string(),      // "red" | "blue"
    redRemaining: t.u32(),
    blueRemaining: t.u32(),
    createdAt: t.u64(),
  }
);

const Player = table(
  { public: true },
  {
    playerId: t.u64().primaryKey().autoInc(),
    gameId: t.u64(),
    identity: t.identity(),
    name: t.string(),
    team: t.string(),           // "unassigned" | "red" | "blue"
    role: t.string(),           // "unassigned" | "spymaster" | "operative"
    isHost: t.bool(),
    isConnected: t.bool(),
  }
);

const Card = table(
  { public: true },
  {
    cardId: t.u64().primaryKey().autoInc(),
    gameId: t.u64(),
    word: t.string(),
    position: t.u32(),          // 0-24
    cardType: t.string(),       // "red" | "blue" | "bystander" | "assassin"
    isRevealed: t.bool(),
    revealedByTeam: t.string(), // "" | "red" | "blue"
  }
);

const GameEvent = table(
  { public: true },
  {
    eventId: t.u64().primaryKey().autoInc(),
    gameId: t.u64(),
    eventType: t.string(),      // "clue" | "guess" | "turn_end" | "game_start" | "game_end"
    team: t.string(),
    playerName: t.string(),
    detail: t.string(),
    createdAt: t.u64(),
  }
);

const spacetimedb = schema({ Game, Player, Card, GameEvent });
export default spacetimedb;

// --- Helpers ---

function findGameByCode(ctx: any, code: string) {
  return ctx.db.Game.roomCode.find(code);
}

function getPlayersForGame(ctx: any, gameId: bigint) {
  const players = [];
  for (const p of ctx.db.Player.iter()) {
    if (p.gameId === gameId) players.push(p);
  }
  return players;
}

function findPlayerByIdentity(ctx: any, gameId: bigint, senderIdentity: any) {
  for (const p of ctx.db.Player.iter()) {
    if (p.gameId === gameId && p.identity.isEqual(senderIdentity)) {
      return p;
    }
  }
  return null;
}

function getCardsForGame(ctx: any, gameId: bigint) {
  const cards = [];
  for (const c of ctx.db.Card.iter()) {
    if (c.gameId === gameId) cards.push(c);
  }
  return cards;
}

function deleteGameData(ctx: any, gameId: bigint) {
  // Collect IDs first to avoid mutation during iteration
  const playerIds: bigint[] = [];
  for (const p of ctx.db.Player.iter()) {
    if (p.gameId === gameId) playerIds.push(p.playerId);
  }
  playerIds.forEach((id) => ctx.db.Player.playerId.delete(id));

  const cardIds: bigint[] = [];
  for (const c of ctx.db.Card.iter()) {
    if (c.gameId === gameId) cardIds.push(c.cardId);
  }
  cardIds.forEach((id) => ctx.db.Card.cardId.delete(id));

  const eventIds: bigint[] = [];
  for (const e of ctx.db.GameEvent.iter()) {
    if (e.gameId === gameId) eventIds.push(e.eventId);
  }
  eventIds.forEach((id) => ctx.db.GameEvent.eventId.delete(id));

  ctx.db.Game.gameId.delete(gameId);
}

function switchTurn(ctx: any, game: any, redRemaining: number, blueRemaining: number) {
  const nextTeam = game.currentTeam === 'red' ? 'blue' : 'red';
  ctx.db.Game.gameId.update({
    ...game,
    currentTeam: nextTeam,
    currentPhase: 'clue',
    clueWord: '',
    clueNumber: -1,
    guessesRemaining: 0,
    guessesMade: 0,
    redRemaining,
    blueRemaining,
  });
  ctx.db.GameEvent.insert({
    eventId: 0n,
    gameId: game.gameId,
    eventType: 'turn_end',
    team: nextTeam,
    playerName: '',
    detail: `${nextTeam} team's turn`,
    createdAt: BigInt(Date.now()),
  });
}

// --- Lifecycle ---

export const onConnect = spacetimedb.clientConnected((_ctx) => {
  // No-op: reconnection handled by joinGame
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  // Collect this sender's connected players first to avoid mutation during iteration
  const senderPlayers: any[] = [];
  for (const player of ctx.db.Player.iter()) {
    if (player.identity.isEqual(ctx.sender) && player.isConnected) {
      senderPlayers.push(player);
    }
  }

  for (const player of senderPlayers) {
    ctx.db.Player.playerId.update({ ...player, isConnected: false });

    // Check if any OTHER players are still connected for this game
    let anyConnected = false;
    for (const p of ctx.db.Player.iter()) {
      if (p.gameId === player.gameId && !p.identity.isEqual(ctx.sender) && p.isConnected) {
        anyConnected = true;
        break;
      }
    }

    // If no one is connected, delete all game data
    if (!anyConnected) {
      deleteGameData(ctx, player.gameId);
    }
  }
});

// --- Reducers ---

export const createGame = spacetimedb.reducer(
  { playerName: t.string() },
  (ctx, { playerName }) => {
    const trimmedName = playerName.trim();
    if (!trimmedName) throw new SenderError('Player name is required');
    if (trimmedName.length > 20) throw new SenderError('Player name must be 20 characters or less');

    // Check if player is already in an active game
    for (const p of ctx.db.Player.iter()) {
      if (p.identity.isEqual(ctx.sender)) {
        const g = ctx.db.Game.gameId.find(p.gameId);
        if (g && g.status !== 'finished') {
          throw new SenderError('You are already in an active game. Leave it first.');
        }
      }
    }

    const rng = seededRandom(BigInt(Date.now()));
    const firstTeam = rng() > 0.5 ? 'red' : 'blue';

    // Generate unique room code
    let roomCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      roomCode = generateRoomCode(rng);
      if (!findGameByCode(ctx, roomCode)) break;
    }

    const gameRow = ctx.db.Game.insert({
      gameId: 0n,
      roomCode,
      status: 'waiting',
      currentTeam: firstTeam,
      currentPhase: 'clue',
      clueWord: '',
      clueNumber: -1,
      guessesRemaining: 0,
      guessesMade: 0,
      winner: '',
      firstTeam,
      redRemaining: firstTeam === 'red' ? 9 : 8,
      blueRemaining: firstTeam === 'blue' ? 9 : 8,
      createdAt: BigInt(Date.now()),
    });

    ctx.db.Player.insert({
      playerId: 0n,
      gameId: gameRow.gameId,
      identity: ctx.sender,
      name: trimmedName,
      team: 'unassigned',
      role: 'unassigned',
      isHost: true,
      isConnected: true,
    });
  }
);

export const joinGame = spacetimedb.reducer(
  { roomCode: t.string(), playerName: t.string() },
  (ctx, { roomCode, playerName }) => {
    const trimmedName = playerName.trim();
    if (!trimmedName) throw new SenderError('Player name is required');
    if (trimmedName.length > 20) throw new SenderError('Player name must be 20 characters or less');

    const code = roomCode.toUpperCase().trim();
    const game = findGameByCode(ctx, code);
    if (!game) throw new SenderError('Game not found. Check your room code.');
    if (game.status === 'finished') throw new SenderError('This game has already ended.');

    // Check reconnection
    const existing = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (existing) {
      ctx.db.Player.playerId.update({ ...existing, isConnected: true, name: trimmedName });
      return;
    }

    // Count players
    const gamePlayers = getPlayersForGame(ctx, game.gameId);
    if (gamePlayers.length >= 10) throw new SenderError('Game is full (max 10 players).');

    // If game is in progress, auto-assign to the team with fewer members (or random if equal)
    let team = 'unassigned';
    let role = 'unassigned';
    if (game.status === 'in_progress') {
      const redCount = gamePlayers.filter((p) => p.team === 'red').length;
      const blueCount = gamePlayers.filter((p) => p.team === 'blue').length;
      if (redCount < blueCount) {
        team = 'red';
      } else if (blueCount < redCount) {
        team = 'blue';
      } else {
        const rng = seededRandom(BigInt(Date.now()));
        team = rng() > 0.5 ? 'red' : 'blue';
      }
      role = 'spectator';
    }

    ctx.db.Player.insert({
      playerId: 0n,
      gameId: game.gameId,
      identity: ctx.sender,
      name: trimmedName,
      team,
      role,
      isHost: false,
      isConnected: true,
    });
  }
);

export const joinTeam = spacetimedb.reducer(
  { roomCode: t.string(), team: t.string() },
  (ctx, { roomCode, team }) => {
    if (team !== 'red' && team !== 'blue') throw new SenderError('Team must be red or blue');

    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'waiting') throw new SenderError('Game already started');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');

    ctx.db.Player.playerId.update({
      ...player,
      team,
      role: 'spectator',
    });
  }
);

export const setRole = spacetimedb.reducer(
  { roomCode: t.string(), role: t.string() },
  (ctx, { roomCode, role }) => {
    if (role !== 'spymaster' && role !== 'operative' && role !== 'spectator') {
      throw new SenderError('Role must be spymaster, operative, or spectator');
    }

    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'waiting') throw new SenderError('Game already started');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');
    if (player.team === 'unassigned') throw new SenderError('Join a team first');

    const gamePlayers = getPlayersForGame(ctx, game.gameId);

    // Only one spymaster per team
    if (role === 'spymaster') {
      for (const p of gamePlayers) {
        if (p.team === player.team && p.role === 'spymaster' && !p.identity.isEqual(ctx.sender)) {
          throw new SenderError(`${player.team} team already has a Spymaster`);
        }
      }
    }

    // Only one operative per team
    if (role === 'operative') {
      for (const p of gamePlayers) {
        if (p.team === player.team && p.role === 'operative' && !p.identity.isEqual(ctx.sender)) {
          throw new SenderError(`${player.team} team already has an Operative`);
        }
      }
    }

    ctx.db.Player.playerId.update({ ...player, role });
  }
);

export const startGame = spacetimedb.reducer(
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'waiting') throw new SenderError('Game already started');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player || !player.isHost) throw new SenderError('Only the host can start the game');

    // Validate teams
    const gamePlayers = getPlayersForGame(ctx, game.gameId);
    let redSpymaster = false, redOperative = false;
    let blueSpymaster = false, blueOperative = false;

    for (const p of gamePlayers) {
      if (p.team === 'red' && p.role === 'spymaster') redSpymaster = true;
      if (p.team === 'red' && p.role === 'operative') redOperative = true;
      if (p.team === 'blue' && p.role === 'spymaster') blueSpymaster = true;
      if (p.team === 'blue' && p.role === 'operative') blueOperative = true;
    }

    if (!redSpymaster || !redOperative) {
      throw new SenderError('Red team needs a Spymaster and at least one Operative');
    }
    if (!blueSpymaster || !blueOperative) {
      throw new SenderError('Blue team needs a Spymaster and at least one Operative');
    }

    // Generate board
    const rng = seededRandom(BigInt(Date.now()) + game.gameId);
    const selectedWords = shuffleArray(WORD_LIST, rng).slice(0, 25);

    const firstTeam = game.firstTeam;
    const types: string[] = [];
    for (let i = 0; i < 9; i++) types.push(firstTeam);
    for (let i = 0; i < 8; i++) types.push(firstTeam === 'red' ? 'blue' : 'red');
    for (let i = 0; i < 7; i++) types.push('bystander');
    types.push('assassin');

    const shuffledTypes = shuffleArray(types, rng);

    for (let i = 0; i < 25; i++) {
      ctx.db.Card.insert({
        cardId: 0n,
        gameId: game.gameId,
        word: selectedWords[i],
        position: i,
        cardType: shuffledTypes[i],
        isRevealed: false,
        revealedByTeam: '',
      });
    }

    ctx.db.Game.gameId.update({
      ...game,
      status: 'in_progress',
      currentPhase: 'clue',
    });

    ctx.db.GameEvent.insert({
      eventId: 0n,
      gameId: game.gameId,
      eventType: 'game_start',
      team: firstTeam,
      playerName: '',
      detail: `Game started! ${firstTeam} team goes first.`,
      createdAt: BigInt(Date.now()),
    });
  }
);

export const giveClue = spacetimedb.reducer(
  { roomCode: t.string(), clueWord: t.string(), clueNumber: t.i32() },
  (ctx, { roomCode, clueWord, clueNumber }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'in_progress') throw new SenderError('Game is not in progress');
    if (game.currentPhase !== 'clue') throw new SenderError('Not in clue phase');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');
    if (player.role !== 'spymaster') throw new SenderError('Only the Spymaster can give clues');
    if (player.team !== game.currentTeam) throw new SenderError("It is not your team's turn");

    const word = clueWord.trim().toUpperCase();
    if (!word || word.includes(' ')) throw new SenderError('Clue must be a single word');

    // Check clue is not a board word
    const gameCards = getCardsForGame(ctx, game.gameId);
    for (const card of gameCards) {
      if (!card.isRevealed && card.word.toUpperCase() === word) {
        throw new SenderError('Clue cannot be a word on the board');
      }
    }

    if (clueNumber < 0) throw new SenderError('Invalid clue number');

    // 0 = "none relate" => unlimited, 99 = "unlimited" => unlimited
    const guessesRemaining = (clueNumber === 0 || clueNumber === 99) ? 99 : clueNumber + 1;

    ctx.db.Game.gameId.update({
      ...game,
      currentPhase: 'guess',
      clueWord: word,
      clueNumber,
      guessesRemaining,
      guessesMade: 0,
    });

    const displayNumber = clueNumber === 99 ? 'Unlimited' : String(clueNumber);
    ctx.db.GameEvent.insert({
      eventId: 0n,
      gameId: game.gameId,
      eventType: 'clue',
      team: game.currentTeam,
      playerName: player.name,
      detail: `${word}, ${displayNumber}`,
      createdAt: BigInt(Date.now()),
    });
  }
);

export const revealCard = spacetimedb.reducer(
  { roomCode: t.string(), position: t.u32() },
  (ctx, { roomCode, position }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'in_progress') throw new SenderError('Game is not in progress');
    if (game.currentPhase !== 'guess') throw new SenderError('Not in guess phase');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');
    if (player.role !== 'operative') throw new SenderError('Only Operatives can reveal cards');
    if (player.team !== game.currentTeam) throw new SenderError("It is not your team's turn");

    // Find card
    let card: any = null;
    for (const c of ctx.db.Card.iter()) {
      if (c.gameId === game.gameId && c.position === position) {
        card = c;
        break;
      }
    }
    if (!card) throw new SenderError('Card not found');
    if (card.isRevealed) throw new SenderError('Card already revealed');

    // Reveal card
    ctx.db.Card.cardId.update({
      ...card,
      isRevealed: true,
      revealedByTeam: game.currentTeam,
    });

    const currentTeam = game.currentTeam;
    const opponentTeam = currentTeam === 'red' ? 'blue' : 'red';

    let redRemaining = game.redRemaining;
    let blueRemaining = game.blueRemaining;
    if (card.cardType === 'red') redRemaining--;
    if (card.cardType === 'blue') blueRemaining--;

    // Log guess
    ctx.db.GameEvent.insert({
      eventId: 0n,
      gameId: game.gameId,
      eventType: 'guess',
      team: currentTeam,
      playerName: player.name,
      detail: `Revealed "${card.word}" (${card.cardType})`,
      createdAt: BigInt(Date.now()),
    });

    // ASSASSIN => current team loses
    if (card.cardType === 'assassin') {
      ctx.db.Game.gameId.update({
        ...game,
        status: 'finished',
        winner: opponentTeam,
        redRemaining,
        blueRemaining,
      });
      ctx.db.GameEvent.insert({
        eventId: 0n,
        gameId: game.gameId,
        eventType: 'game_end',
        team: opponentTeam,
        playerName: '',
        detail: `${currentTeam} hit the Assassin! ${opponentTeam} wins!`,
        createdAt: BigInt(Date.now()),
      });
      return;
    }

    // Check win conditions
    if (redRemaining === 0) {
      ctx.db.Game.gameId.update({ ...game, status: 'finished', winner: 'red', redRemaining: 0, blueRemaining });
      ctx.db.GameEvent.insert({ eventId: 0n, gameId: game.gameId, eventType: 'game_end', team: 'red', playerName: '', detail: 'Red team found all agents! Red wins!', createdAt: BigInt(Date.now()) });
      return;
    }
    if (blueRemaining === 0) {
      ctx.db.Game.gameId.update({ ...game, status: 'finished', winner: 'blue', redRemaining, blueRemaining: 0 });
      ctx.db.GameEvent.insert({ eventId: 0n, gameId: game.gameId, eventType: 'game_end', team: 'blue', playerName: '', detail: 'Blue team found all agents! Blue wins!', createdAt: BigInt(Date.now()) });
      return;
    }

    // Check if turn continues or ends
    const newGuessesMade = game.guessesMade + 1;
    const newGuessesRemaining = game.guessesRemaining === 99 ? 99 : game.guessesRemaining - 1;

    if (card.cardType === currentTeam) {
      // Correct guess
      if (newGuessesRemaining <= 0 && game.guessesRemaining !== 99) {
        switchTurn(ctx, game, redRemaining, blueRemaining);
      } else {
        ctx.db.Game.gameId.update({
          ...game,
          guessesRemaining: newGuessesRemaining,
          guessesMade: newGuessesMade,
          redRemaining,
          blueRemaining,
        });
      }
    } else {
      // Wrong guess (opponent or bystander) => turn ends
      switchTurn(ctx, game, redRemaining, blueRemaining);
    }
  }
);

export const endTurn = spacetimedb.reducer(
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'in_progress') throw new SenderError('Game is not in progress');
    if (game.currentPhase !== 'guess') throw new SenderError('Not in guess phase');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');
    if (player.role !== 'operative') throw new SenderError('Only Operatives can end the turn');
    if (player.team !== game.currentTeam) throw new SenderError("It is not your team's turn");

    if (game.guessesMade < 1) {
      throw new SenderError('You must make at least one guess before ending your turn');
    }

    switchTurn(ctx, game, game.redRemaining, game.blueRemaining);
  }
);

export const leaveGame = spacetimedb.reducer(
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player) throw new SenderError('You are not in this game');

    if (game.status === 'waiting') {
      const wasHost = player.isHost;
      ctx.db.Player.playerId.delete(player.playerId);

      // Transfer host
      if (wasHost) {
        const remaining = getPlayersForGame(ctx, game.gameId);
        if (remaining.length > 0) {
          ctx.db.Player.playerId.update({ ...remaining[0], isHost: true });
        }
      }
    } else {
      ctx.db.Player.playerId.update({ ...player, isConnected: false });
    }
  }
);

export const forceEndGame = spacetimedb.reducer(
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player || !player.isHost) throw new SenderError('Only the host can end the game');

    deleteGameData(ctx, game.gameId);
  }
);

export const randomizeTeams = spacetimedb.reducer(
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const game = findGameByCode(ctx, roomCode.toUpperCase().trim());
    if (!game) throw new SenderError('Game not found');
    if (game.status !== 'waiting') throw new SenderError('Game already started');

    const player = findPlayerByIdentity(ctx, game.gameId, ctx.sender);
    if (!player || !player.isHost) throw new SenderError('Only the host can randomize teams');

    const gamePlayers = getPlayersForGame(ctx, game.gameId);
    if (gamePlayers.length < 4) throw new SenderError('Need at least 4 players to randomize teams');

    const rng = seededRandom(BigInt(Date.now()));

    // Separate players with pre-set roles from those without
    const spymasters = gamePlayers.filter((p) => p.role === 'spymaster');
    const operatives = gamePlayers.filter((p) => p.role === 'operative');
    const rest = gamePlayers.filter((p) => p.role !== 'spymaster' && p.role !== 'operative');

    // Shuffle each group
    const shuffledSpymasters = shuffleArray(spymasters, rng);
    const shuffledOperatives = shuffleArray(operatives, rng);
    const shuffledRest = shuffleArray(rest, rng);

    // Assign spymasters: first to red, second to blue, extras demoted
    const redTeam: { player: any; role: string }[] = [];
    const blueTeam: { player: any; role: string }[] = [];
    let hasRedSpy = false;
    let hasBlueSpy = false;

    for (const p of shuffledSpymasters) {
      if (!hasRedSpy) {
        redTeam.push({ player: p, role: 'spymaster' });
        hasRedSpy = true;
      } else if (!hasBlueSpy) {
        blueTeam.push({ player: p, role: 'spymaster' });
        hasBlueSpy = true;
      } else {
        // Extra spymasters go to the pool as unroled
        shuffledRest.push(p);
      }
    }

    // Assign operatives: first to red, second to blue, extras demoted
    let hasRedOp = false;
    let hasBlueOp = false;

    for (const p of shuffledOperatives) {
      if (!hasRedOp) {
        redTeam.push({ player: p, role: 'operative' });
        hasRedOp = true;
      } else if (!hasBlueOp) {
        blueTeam.push({ player: p, role: 'operative' });
        hasBlueOp = true;
      } else {
        shuffledRest.push(p);
      }
    }

    // Distribute remaining players evenly
    const reshuffledRest = shuffleArray(shuffledRest, rng);
    for (const p of reshuffledRest) {
      if (redTeam.length <= blueTeam.length) {
        redTeam.push({ player: p, role: '' }); // role TBD
      } else {
        blueTeam.push({ player: p, role: '' });
      }
    }

    // Fill missing roles per team, then assign spectator to the rest
    function finalizeTeam(team: { player: any; role: string }[], needSpy: boolean, needOp: boolean) {
      for (const entry of team) {
        if (entry.role !== '') continue;
        if (needSpy) {
          entry.role = 'spymaster';
          needSpy = false;
        } else if (needOp) {
          entry.role = 'operative';
          needOp = false;
        } else {
          entry.role = 'spectator';
        }
      }
    }

    finalizeTeam(redTeam, !hasRedSpy, !hasRedOp);
    finalizeTeam(blueTeam, !hasBlueSpy, !hasBlueOp);

    // Apply updates
    for (const { player: p, role: r } of redTeam) {
      ctx.db.Player.playerId.update({ ...p, team: 'red', role: r });
    }
    for (const { player: p, role: r } of blueTeam) {
      ctx.db.Player.playerId.update({ ...p, team: 'blue', role: r });
    }
  }
);
