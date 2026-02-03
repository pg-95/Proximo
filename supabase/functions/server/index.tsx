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
        createdAt: user.createdAt || null,
      }));

    console.log(`Returning ${users.length} users to admin`);
    return c.json(users, 200);
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
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
    const { gameType, stake } = await c.req.json();

    if (!gameType || !stake) {
      return c.json({ error: "Game type and stake are required" }, 400);
    }

    // Validate balance for non-fun stakes
    if (stake !== "Fun") {
      const user = await kv.get(`user:${username}`);
      const stakeAmount = stake === "5+" ? 5 : parseInt(stake);
      
      if ((user.balance || 0) < stakeAmount) {
        return c.json({ error: "Insufficient balance" }, 400);
      }
    }

    const gameId = crypto.randomUUID();
    const game = {
      id: gameId,
      gameType,
      host: username,
      stake,
      status: "waiting",
      currentPlayers: 1,
      maxPlayers: 6,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`game:${gameId}`, game);

    console.log(`Game created: ${gameId} by ${username}`);
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

    if (game.status === "full") {
      return c.json({ error: "Game is full" }, 400);
    }

    game.currentPlayers += 1;
    if (game.currentPlayers >= game.maxPlayers) {
      game.status = "full";
    }

    await kv.set(`game:${gameId}`, game);

    console.log(`User ${username} joined game ${gameId}`);
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

// Start the server
Deno.serve(app.fetch);