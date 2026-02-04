import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as bcrypt from "npm:bcryptjs";

const app = new Hono();

// Initialize admin user on startup
const initializeAdmin = async () => {
  const adminUsername = "root";
  const existingAdmin = await kv.get(`user:${adminUsername}`);
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("drchuck", 10);
    const adminUser = {
      username: adminUsername,
      password: hashedPassword,
      balance: 999999,
      isAdmin: true,
      stats: {
        lastLogin: new Date().toISOString(),
        totalLogins: 0,
        totalTimeSpent: 0,
        gamesPlayed: 0,
        coinsWon: 0,
        coinsLost: 0,
        coinsAwarded: 0,
      },
      createdAt: new Date().toISOString(),
    };
    await kv.set(`user:${adminUsername}`, adminUser);
    console.log("Admin user 'root' initialized");
  }
};

// Initialize admin on server startup
initializeAdmin();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-519349c9/health", (c) => {
  return c.json({ status: "ok" });
});

// User signup endpoint
app.post("/make-server-519349c9/signup", async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    if (username.length < 3) {
      return c.json({ error: "Username must be at least 3 characters" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Check if user already exists
    const existingUser = await kv.get(`user:${username}`);
    if (existingUser) {
      return c.json({ error: "Username already exists" }, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      username,
      password: hashedPassword,
      balance: 10,
      isAdmin: false,
      stats: {
        lastLogin: new Date().toISOString(),
        totalLogins: 1,
        totalTimeSpent: 0,
        gamesPlayed: 0,
        coinsWon: 0,
        coinsLost: 0,
        coinsAwarded: 0,
      },
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${username}`, user);

    // Create session token
    const token = btoa(`${username}:${Date.now()}:${Math.random()}`);
    await kv.set(`session:${token}`, { username, loginTime: new Date().toISOString() });

    console.log(`User signup successful: ${username}`);
    return c.json({ token, username, balance: 10, isAdmin: false }, 201);
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// User login endpoint
app.post("/make-server-519349c9/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    console.log(`Login attempt for user: ${username}`);

    // Check for admin account (hardcoded)
    if (username === "root" && password === "drchuck") {
      // Get or create root admin user
      let rootUser = await kv.get(`user:root`);
      if (!rootUser) {
        console.log("Creating root admin user in KV store");
        const hashedPassword = await bcrypt.hash("drchuck", 10);
        rootUser = {
          username: "root",
          password: hashedPassword,
          balance: 999999,
          isAdmin: true,
          stats: {
            lastLogin: new Date().toISOString(),
            totalLogins: 1,
            totalTimeSpent: 0,
            gamesPlayed: 0,
            coinsWon: 0,
            coinsLost: 0,
            coinsAwarded: 0,
          },
          createdAt: new Date().toISOString(),
        };
        await kv.set(`user:root`, rootUser);
      } else {
        // Update login stats
        rootUser.stats = rootUser.stats || {};
        rootUser.stats.lastLogin = new Date().toISOString();
        rootUser.stats.totalLogins = (rootUser.stats.totalLogins || 0) + 1;
        await kv.set(`user:root`, rootUser);
      }
      
      // Create session token with longer expiry
      const token = btoa(`root:${Date.now()}:${Math.random()}`);
      await kv.set(`session:${token}`, { username: "root", loginTime: new Date().toISOString() });

      console.log("Admin login successful: root");
      return c.json({ token, username: "root", balance: 999999, isAdmin: true }, 200);
    }

    // Get user
    const user = await kv.get(`user:${username}`);
    if (!user) {
      console.log(`User not found: ${username}`);
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`Invalid password for user: ${username}`);
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Update user stats
    user.stats = user.stats || {};
    user.stats.lastLogin = new Date().toISOString();
    user.stats.totalLogins = (user.stats.totalLogins || 0) + 1;
    await kv.set(`user:${username}`, user);

    // Create session token
    const token = btoa(`${username}:${Date.now()}:${Math.random()}`);
    await kv.set(`session:${token}`, { username, loginTime: new Date().toISOString() });

    console.log(`User login successful: ${username}, balance: ${user.balance}`);
    return c.json({ token, username, balance: user.balance || 0, isAdmin: user.isAdmin || false }, 200);
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Failed to login" }, 500);
  }
});

// Middleware to require authentication
const requireAuth = async (c: any, next: any) => {
  // Try custom header first (for our custom auth)
  let token = c.req.header("X-Session-Token");
  
  // Fallback to Authorization header for backwards compatibility
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }
  
  if (!token) {
    console.log("Auth failed: No session token");
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log(`Validating token: ${token.substring(0, 20)}...`);
  
  // Check if session exists
  const session = await kv.get(`session:${token}`);
  
  if (!session) {
    console.log(`Auth failed: Session not found for token ${token.substring(0, 20)}...`);
    return c.json({ error: "Invalid session" }, 401);
  }

  console.log(`Auth successful for user: ${session.username}`);
  c.set("username", session.username);
  await next();
};

// Middleware to require admin
const requireAdmin = async (c: any, next: any) => {
  const username = c.get("username");
  const user = await kv.get(`user:${username}`);
  
  if (!user || !user.isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
};

// Get user balance endpoint
app.get("/make-server-519349c9/balance", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    console.log(`Balance request for user: ${username}`);
    
    const user = await kv.get(`user:${username}`);
    
    if (!user) {
      console.log(`User not found in KV store: ${username}`);
      return c.json({ error: "User not found" }, 404);
    }

    console.log(`Balance for ${username}: ${user.balance || 0}`);
    return c.json({ balance: user.balance || 0 }, 200);
  } catch (error) {
    console.error("Get balance error:", error);
    return c.json({ error: "Failed to get balance" }, 500);
  }
});

// Logout endpoint
app.post("/make-server-519349c9/logout", requireAuth, async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.split(" ")[1];
    
    if (token) {
      await kv.del(`session:${token}`);
    }

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ error: "Failed to logout" }, 500);
  }
});

// Track session activity (for time spent tracking)
app.post("/make-server-519349c9/track-activity", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const { sessionDuration } = await c.req.json();

    const user = await kv.get(`user:${username}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (!user.stats) {
      user.stats = {
        lastLogin: null,
        totalLogins: 0,
        totalTimeSpent: 0,
        gamesPlayed: 0,
        coinsWon: 0,
        coinsLost: 0,
      };
    }

    // Add to total time spent (in seconds)
    user.stats.totalTimeSpent = (user.stats.totalTimeSpent || 0) + (sessionDuration || 0);
    await kv.set(`user:${username}`, user);

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Track activity error:", error);
    return c.json({ error: "Failed to track activity" }, 500);
  }
});

// Admin endpoint to get all users
app.get("/make-server-519349c9/admin/users", requireAuth, requireAdmin, async (c) => {
  try {
    const allKeys = await kv.getByPrefix("user:");
    console.log(`Admin fetching users, found ${allKeys.length} users`);
    
    // Filter out root user and transform data
    const users = allKeys
      .filter(user => user.username !== "root")
      .map(user => ({
        username: user.username,
        balance: user.balance || 0,
        lastLogin: user.stats?.lastLogin || null,
        totalLogins: user.stats?.totalLogins || 0,
        totalTimeSpent: user.stats?.totalTimeSpent || 0,
        gamesPlayed: user.stats?.gamesPlayed || 0,
        coinsWon: user.stats?.coinsWon || 0,
        coinsLost: user.stats?.coinsLost || 0,
        coinsAwarded: user.stats?.coinsAwarded || 0,
        createdAt: user.createdAt,
      }))
      .sort((a, b) => new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime());

    return c.json(users, 200);
  } catch (error) {
    console.error("Admin get users error:", error);
    return c.json({ error: "Failed to get users" }, 500);
  }
});

// User endpoint to get own stats
app.get("/make-server-519349c9/user/stats", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const user = await kv.get(`user:${username}`);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const stats = {
      username: user.username,
      balance: user.balance || 0,
      lastLogin: user.stats?.lastLogin || null,
      totalLogins: user.stats?.totalLogins || 0,
      totalTimeSpent: user.stats?.totalTimeSpent || 0,
      gamesPlayed: user.stats?.gamesPlayed || 0,
      coinsWon: user.stats?.coinsWon || 0,
      coinsLost: user.stats?.coinsLost || 0,
      createdAt: user.createdAt,
    };

    console.log(`User ${username} fetched their stats`);
    return c.json(stats, 200);
  } catch (error) {
    console.error("Get user stats error:", error);
    return c.json({ error: "Failed to get user stats" }, 500);
  }
});

// Admin endpoint to send message to user
app.post("/make-server-519349c9/admin/message", requireAuth, requireAdmin, async (c) => {
  try {
    const { username, title, message, coinAmount } = await c.req.json();

    if (!username || !title || !message) {
      return c.json({ error: "Username, title, and message are required" }, 400);
    }

    // Check if user exists
    const user = await kv.get(`user:${username}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Create message ID and store message
    const messageId = crypto.randomUUID();
    const messageData = {
      id: messageId,
      username: username,
      title: title,
      message: message,
      coinAmount: coinAmount || null, // Store coin amount if provided
      createdAt: new Date().toISOString(),
      read: false,
    };

    await kv.set(`message:${username}:${messageId}`, messageData);
    console.log(`Admin sent message to ${username}: ${title}${coinAmount ? ` with ${coinAmount} coins` : ''}`);

    return c.json({ success: true, message: "Message sent successfully" }, 200);
  } catch (error) {
    console.error("Send admin message error:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Admin endpoint to adjust user coins
app.post("/make-server-519349c9/admin/adjust-coins", requireAuth, requireAdmin, async (c) => {
  try {
    const { username, amount } = await c.req.json();

    if (!username || amount === undefined || amount === 0) {
      return c.json({ error: "Username and non-zero amount are required" }, 400);
    }

    // Get user
    const user = await kv.get(`user:${username}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Adjust balance
    const newBalance = (user.balance || 0) + amount;
    
    // Don't allow negative balance
    if (newBalance < 0) {
      return c.json({ error: "Cannot reduce balance below 0" }, 400);
    }

    user.balance = newBalance;

    // Update stats - track separately as admin-awarded coins
    if (!user.stats) {
      user.stats = {};
    }
    
    // Track admin coin adjustments separately from game winnings
    user.stats.coinsAwarded = (user.stats.coinsAwarded || 0) + amount;

    await kv.set(`user:${username}`, user);
    console.log(`Admin adjusted ${username}'s balance by ${amount}. New balance: ${newBalance}`);

    return c.json({ 
      success: true, 
      newBalance: newBalance,
      message: `Balance adjusted by ${amount}` 
    }, 200);
  } catch (error) {
    console.error("Adjust coins error:", error);
    return c.json({ error: "Failed to adjust coins" }, 500);
  }
});

// Get user messages (for displaying admin messages to users)
app.get("/make-server-519349c9/messages", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const allMessages = await kv.getByPrefix(`message:${username}:`);
    
    // Filter out read messages and sort by date
    const unreadMessages = allMessages
      .filter(msg => !msg.read)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json(unreadMessages, 200);
  } catch (error) {
    console.error("Get messages error:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

// Mark message as read
app.post("/make-server-519349c9/messages/:id/read", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const messageId = c.req.param("id");
    
    const message = await kv.get(`message:${username}:${messageId}`);
    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    message.read = true;
    await kv.set(`message:${username}:${messageId}`, message);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Mark message as read error:", error);
    return c.json({ error: "Failed to mark message as read" }, 500);
  }
});

// Get all games
app.get("/make-server-519349c9/games", requireAuth, async (c) => {
  try {
    const allGames = await kv.getByPrefix("game:");
    return c.json(allGames, 200);
  } catch (error) {
    console.error("Get games error:", error);
    return c.json({ error: "Failed to get games" }, 500);
  }
});

// Host a new game
app.post("/make-server-519349c9/games", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const { name, gameType, stake, lobbyDuration, customDuration } = await c.req.json();

    if (!name || !gameType || !stake) {
      return c.json({ error: "Game name, type and stake are required" }, 400);
    }

    // Validate balance for non-fun stakes
    if (stake !== "Fun") {
      const user = await kv.get(`user:${username}`);
      const stakeAmount = stake === "5+" ? 5 : parseInt(stake);
      
      if ((user.balance || 0) < stakeAmount) {
        return c.json({ error: "Insufficient balance" }, 400);
      }
    }

    // Calculate expiry time based on lobby duration
    let durationHours = 1; // default
    if (lobbyDuration === "2h") durationHours = 2;
    else if (lobbyDuration === "1d") durationHours = 24;
    else if (lobbyDuration === "custom" && customDuration) {
      durationHours = parseFloat(customDuration);
      // Validate custom duration
      if (durationHours < 1 || durationHours > 168) {
        return c.json({ error: "Custom duration must be between 1 and 168 hours" }, 400);
      }
    }

    const expiryTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    const gameId = crypto.randomUUID();
    const game = {
      id: gameId,
      name,
      gameType,
      host: username,
      stake,
      status: "waiting",
      currentPlayers: 1,
      maxPlayers: gameType === "Blackjack" ? 2 : 6, // Blackjack is 1v1, other games can have 6 players
      createdAt: new Date().toISOString(),
      expiryTime: expiryTime,
    };

    await kv.set(`game:${gameId}`, game);

    console.log(`Game created: ${gameId} by ${username}, name: ${name}, expires at ${expiryTime}`);
    return c.json(game, 201);
  } catch (error) {
    console.error("Create game error:", error);
    return c.json({ error: "Failed to create game" }, 500);
  }
});

// Join a game
app.post("/make-server-519349c9/games/:id/join", requireAuth, async (c) => {
  try {
    const gameId = c.req.param("id");
    const username = c.get("username");

    const game = await kv.get(`game:${gameId}`);
    
    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    // Prevent users from joining their own games
    if (game.host === username) {
      return c.json({ error: "You cannot join your own game" }, 400);
    }

    if (game.status === "full" || game.status === "in-progress") {
      return c.json({ error: "Game is full" }, 400);
    }

    game.currentPlayers += 1;
    
    // For Blackjack (max 2 players), when second player joins, set to in-progress
    if (game.gameType === "Blackjack" && game.currentPlayers >= 2) {
      game.status = "in-progress";
    } else if (game.currentPlayers >= game.maxPlayers) {
      game.status = "full";
    }

    await kv.set(`game:${gameId}`, game);

    console.log(`User ${username} joined game ${gameId}. Status: ${game.status}, Players: ${game.currentPlayers}/${game.maxPlayers}`);
    return c.json(game, 200);
  } catch (error) {
    console.error("Join game error:", error);
    return c.json({ error: "Failed to join game" }, 500);
  }
});

// Get all posts
app.get("/make-server-519349c9/posts", requireAuth, async (c) => {
  try {
    const allPosts = await kv.getByPrefix("post:");
    // Sort by vote count (descending)
    const sortedPosts = allPosts.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return c.json(sortedPosts, 200);
  } catch (error) {
    console.error("Get posts error:", error);
    return c.json({ error: "Failed to get posts" }, 500);
  }
});

// Create a new post
app.post("/make-server-519349c9/posts", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const { content } = await c.req.json();

    if (!content || content.trim().length === 0) {
      return c.json({ error: "Post content is required" }, 400);
    }

    if (content.length > 500) {
      return c.json({ error: "Post content must be 500 characters or less" }, 400);
    }

    const postId = crypto.randomUUID();
    const post = {
      id: postId,
      author: username,
      content: content.trim(),
      votes: 0,
      voters: [], // Track who voted to prevent duplicate votes
      createdAt: new Date().toISOString(),
    };

    await kv.set(`post:${postId}`, post);

    console.log(`Post created: ${postId} by ${username}`);
    return c.json(post, 201);
  } catch (error) {
    console.error("Create post error:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

// Vote on a post
app.post("/make-server-519349c9/posts/:id/vote", requireAuth, async (c) => {
  try {
    const postId = c.req.param("id");
    const username = c.get("username");
    const { direction } = await c.req.json(); // 'up' or 'down'

    if (!["up", "down"].includes(direction)) {
      return c.json({ error: "Invalid vote direction" }, 400);
    }

    const post = await kv.get(`post:${postId}`);
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (!post.voters) {
      post.voters = [];
    }

    // Find existing vote
    const existingVoteIndex = post.voters.findIndex((v: any) => v.username === username);
    
    if (existingVoteIndex !== -1) {
      const existingVote = post.voters[existingVoteIndex];
      
      // If clicking same direction, remove vote
      if (existingVote.direction === direction) {
        post.votes += direction === "up" ? -1 : 1;
        post.voters.splice(existingVoteIndex, 1);
      } else {
        // Change vote direction
        post.votes += direction === "up" ? 2 : -2;
        post.voters[existingVoteIndex].direction = direction;
      }
    } else {
      // New vote
      post.votes += direction === "up" ? 1 : -1;
      post.voters.push({ username, direction });
    }

    await kv.set(`post:${postId}`, post);

    console.log(`User ${username} voted ${direction} on post ${postId}`);
    return c.json(post, 200);
  } catch (error) {
    console.error("Vote on post error:", error);
    return c.json({ error: "Failed to vote on post" }, 500);
  }
});

// Get comments for a post
app.get("/make-server-519349c9/posts/:id/comments", requireAuth, async (c) => {
  try {
    const postId = c.req.param("id");
    const allComments = await kv.getByPrefix(`comment:${postId}:`);
    
    // Sort by vote count (descending)
    const sortedComments = allComments.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return c.json(sortedComments, 200);
  } catch (error) {
    console.error("Get comments error:", error);
    return c.json({ error: "Failed to get comments" }, 500);
  }
});

// Create a comment on a post
app.post("/make-server-519349c9/posts/:id/comments", requireAuth, async (c) => {
  try {
    const postId = c.req.param("id");
    const username = c.get("username");
    const { content } = await c.req.json();

    if (!content || content.trim().length === 0) {
      return c.json({ error: "Comment content is required" }, 400);
    }

    if (content.length > 300) {
      return c.json({ error: "Comment content must be 300 characters or less" }, 400);
    }

    // Verify post exists
    const post = await kv.get(`post:${postId}`);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const commentId = crypto.randomUUID();
    const comment = {
      id: commentId,
      postId,
      author: username,
      content: content.trim(),
      votes: 0,
      voters: [],
      createdAt: new Date().toISOString(),
    };

    await kv.set(`comment:${postId}:${commentId}`, comment);

    console.log(`Comment created: ${commentId} on post ${postId} by ${username}`);
    return c.json(comment, 201);
  } catch (error) {
    console.error("Create comment error:", error);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});

// Vote on a comment
app.post("/make-server-519349c9/posts/:postId/comments/:commentId/vote", requireAuth, async (c) => {
  try {
    const postId = c.req.param("postId");
    const commentId = c.req.param("commentId");
    const username = c.get("username");
    const { direction } = await c.req.json(); // 'up' or 'down'

    if (!["up", "down"].includes(direction)) {
      return c.json({ error: "Invalid vote direction" }, 400);
    }

    const comment = await kv.get(`comment:${postId}:${commentId}`);
    
    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    if (!comment.voters) {
      comment.voters = [];
    }

    // Find existing vote
    const existingVoteIndex = comment.voters.findIndex((v: any) => v.username === username);
    
    if (existingVoteIndex !== -1) {
      const existingVote = comment.voters[existingVoteIndex];
      
      // If clicking same direction, remove vote
      if (existingVote.direction === direction) {
        comment.votes += direction === "up" ? -1 : 1;
        comment.voters.splice(existingVoteIndex, 1);
      } else {
        // Change vote direction
        comment.votes += direction === "up" ? 2 : -2;
        comment.voters[existingVoteIndex].direction = direction;
      }
    } else {
      // New vote
      comment.votes += direction === "up" ? 1 : -1;
      comment.voters.push({ username, direction });
    }

    await kv.set(`comment:${postId}:${commentId}`, comment);

    console.log(`User ${username} voted ${direction} on comment ${commentId}`);
    return c.json(comment, 200);
  } catch (error) {
    console.error("Vote on comment error:", error);
    return c.json({ error: "Failed to vote on comment" }, 500);
  }
});

// Delete a post
app.delete("/make-server-519349c9/posts/:id", requireAuth, async (c) => {
  try {
    const postId = c.req.param("id");
    const username = c.get("username");

    const post = await kv.get(`post:${postId}`);
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Check if user is the author or admin
    const user = await kv.get(`user:${username}`);
    if (post.author !== username && !user.isAdmin) {
      return c.json({ error: "Unauthorized to delete this post" }, 403);
    }

    // Delete the post
    await kv.del(`post:${postId}`);

    // Also delete all comments for this post
    const allComments = await kv.getByPrefix(`comment:${postId}:`);
    for (const comment of allComments) {
      await kv.del(`comment:${postId}:${comment.id}`);
    }

    console.log(`Post ${postId} deleted by ${username}`);
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Delete post error:", error);
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

// Delete a comment
app.delete("/make-server-519349c9/posts/:postId/comments/:commentId", requireAuth, async (c) => {
  try {
    const postId = c.req.param("postId");
    const commentId = c.req.param("commentId");
    const username = c.get("username");

    const comment = await kv.get(`comment:${postId}:${commentId}`);
    
    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    // Check if user is the author or admin
    const user = await kv.get(`user:${username}`);
    if (comment.author !== username && !user.isAdmin) {
      return c.json({ error: "Unauthorized to delete this comment" }, 403);
    }

    // Delete the comment
    await kv.del(`comment:${postId}:${commentId}`);

    console.log(`Comment ${commentId} deleted by ${username}`);
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Delete comment error:", error);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
});

// Admin endpoint to get all games (including past games)
app.get("/make-server-519349c9/admin/games", requireAuth, requireAdmin, async (c) => {
  try {
    const allGames = await kv.getByPrefix("game:");
    console.log(`Admin fetching all games, found ${allGames.length} games`);
    
    // Sort by creation date (newest first)
    const sortedGames = allGames.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return c.json(sortedGames, 200);
  } catch (error) {
    console.error("Admin get games error:", error);
    return c.json({ error: "Failed to get games" }, 500);
  }
});

// Admin endpoint to delete a game
app.delete("/make-server-519349c9/admin/games/:id", requireAuth, requireAdmin, async (c) => {
  try {
    const gameId = c.req.param("id");
    const game = await kv.get(`game:${gameId}`);
    
    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    // Mark game as cancelled instead of deleting it
    game.status = "cancelled";
    game.endedAt = new Date().toISOString();
    await kv.set(`game:${gameId}`, game);

    console.log(`Admin cancelled game ${gameId}`);
    return c.json({ success: true, message: "Game cancelled successfully" }, 200);
  } catch (error) {
    console.error("Admin cancel game error:", error);
    return c.json({ error: "Failed to cancel game" }, 500);
  }
});

// Submit feedback
app.post("/make-server-519349c9/feedback", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    const { subject, message } = await c.req.json();
    
    if (!subject || !message) {
      return c.json({ error: "Subject and message are required" }, 400);
    }
    
    // Validate character limits
    if (subject.length > 100) {
      return c.json({ error: "Subject must be 100 characters or less" }, 400);
    }
    
    if (message.length > 1000) {
      return c.json({ error: "Message must be 1000 characters or less" }, 400);
    }
    
    const feedbackId = crypto.randomUUID();
    const feedback = {
      id: feedbackId,
      username,
      subject,
      message,
      createdAt: new Date().toISOString(),
      status: "unread",
      replies: [],
    };
    
    await kv.set(`feedback:${feedbackId}`, feedback);
    
    console.log(`Feedback submitted by ${username}: ${feedbackId}`);
    return c.json(feedback, 201);
  } catch (error) {
    console.error("Submit feedback error:", error);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});

// Get user's feedback
app.get("/make-server-519349c9/feedback", requireAuth, async (c) => {
  try {
    const username = c.get("username");
    
    const allFeedback = await kv.getByPrefix("feedback:");
    const userFeedback = allFeedback.filter(f => f.username === username);
    
    // Sort by creation date (newest first)
    const sortedFeedback = userFeedback.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return c.json(sortedFeedback, 200);
  } catch (error) {
    console.error("Get feedback error:", error);
    return c.json({ error: "Failed to get feedback" }, 500);
  }
});

// Admin: Get all feedback
app.get("/make-server-519349c9/admin/feedback", requireAuth, requireAdmin, async (c) => {
  try {
    const allFeedback = await kv.getByPrefix("feedback:");
    
    // Sort by creation date (newest first)
    const sortedFeedback = allFeedback.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Admin fetching all feedback, found ${allFeedback.length} items`);
    return c.json(sortedFeedback, 200);
  } catch (error) {
    console.error("Admin get feedback error:", error);
    return c.json({ error: "Failed to get feedback" }, 500);
  }
});

// Admin: Reply to feedback
app.post("/make-server-519349c9/admin/feedback/:id/reply", requireAuth, requireAdmin, async (c) => {
  try {
    const feedbackId = c.req.param("id");
    const { reply } = await c.req.json();
    
    if (!reply) {
      return c.json({ error: "Reply is required" }, 400);
    }
    
    if (reply.length > 1000) {
      return c.json({ error: "Reply must be 1000 characters or less" }, 400);
    }
    
    const feedback = await kv.get(`feedback:${feedbackId}`);
    
    if (!feedback) {
      return c.json({ error: "Feedback not found" }, 404);
    }
    
    // Add reply
    const replyObj = {
      id: crypto.randomUUID(),
      message: reply,
      createdAt: new Date().toISOString(),
    };
    
    feedback.replies = feedback.replies || [];
    feedback.replies.push(replyObj);
    feedback.status = "replied";
    
    await kv.set(`feedback:${feedbackId}`, feedback);
    
    console.log(`Admin replied to feedback ${feedbackId}`);
    return c.json(feedback, 200);
  } catch (error) {
    console.error("Admin reply to feedback error:", error);
    return c.json({ error: "Failed to reply to feedback" }, 500);
  }
});

// Admin: Mark feedback as read
app.post("/make-server-519349c9/admin/feedback/:id/read", requireAuth, requireAdmin, async (c) => {
  try {
    const feedbackId = c.req.param("id");
    
    const feedback = await kv.get(`feedback:${feedbackId}`);
    
    if (!feedback) {
      return c.json({ error: "Feedback not found" }, 404);
    }
    
    if (feedback.status === "unread") {
      feedback.status = "read";
      await kv.set(`feedback:${feedbackId}`, feedback);
    }
    
    return c.json(feedback, 200);
  } catch (error) {
    console.error("Admin mark feedback as read error:", error);
    return c.json({ error: "Failed to mark feedback as read" }, 500);
  }
});

// Start the server
Deno.serve(app.fetch);