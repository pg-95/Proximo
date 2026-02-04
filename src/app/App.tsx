import { useState, useEffect } from "react";
import { GameCard, Game } from "@/app/components/game-card";
import { GameListView } from "@/app/components/game-list-view";
import { HostGameDialog } from "@/app/components/host-game-dialog";
import { AuthForm } from "@/app/components/auth-form";
import { AdminPanel } from "@/app/components/admin-panel";
import { BanterBoard } from "@/app/components/banter-board";
import { AccountDialog } from "@/app/components/account-dialog";
import { Feedback } from "@/app/components/feedback";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Plus, Search, Gamepad2, LogOut, RefreshCw, Coins, Shield, User, Bell, Grid3x3, List, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/app/components/ui/sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hostDialogOpen, setHostDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lobbies");
  const [lobbyFilter, setLobbyFilter] = useState("all"); // Filter for Active Lobbies tab
  const [viewMode, setViewMode] = useState<"card" | "list">("card"); // View mode toggle
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ id: string; title: string; message: string; coinAmount?: number | null } | null>(null);
  const [adminMessageDialogOpen, setAdminMessageDialogOpen] = useState(false);
  const [joinConfirmDialog, setJoinConfirmDialog] = useState<{ open: boolean; gameId: string; gameName: string; stake?: number } | null>(null);
  const [hostConfirmDialog, setHostConfirmDialog] = useState<{ open: boolean; gameData: any } | null>(null);
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(null);

  // Clear localStorage on mount - sessions don't persist across server restarts
  useEffect(() => {
    localStorage.removeItem("gameHubToken");
    localStorage.removeItem("gameHubUsername");
    localStorage.removeItem("gameHubBalance");
    localStorage.removeItem("gameHubIsAdmin");
  }, []);

  // Load games from backend
  const loadGames = async () => {
    if (!token) return;
    
    setIsLoadingGames(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/games`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to load games, status:", response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error("Failed to load games");
      }

      const data = await response.json();
      console.log("Loaded games:", data);
      
      // Transform backend data to match frontend Game interface
      const transformedGames = data.map((game: any) => {
        // Parse stake correctly
        let stakeValue = undefined;
        if (game.stake !== "Fun") {
          const parsedStake = parseInt(game.stake);
          if (!isNaN(parsedStake)) {
            stakeValue = parsedStake;
          }
        }
        
        return {
          id: game.id,
          name: game.name || `${game.gameType} Game`, // Use actual game name from backend
          host: game.host,
          playerCount: game.currentPlayers || 1,
          maxPlayers: game.maxPlayers || 6,
          gameType: game.gameType,
          stake: stakeValue,
          status: game.status,
          createdAt: new Date(game.createdAt),
          expiryTime: game.expiryTime ? new Date(game.expiryTime) : undefined,
        };
      });
      
      setGames(transformedGames);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Failed to load games", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsLoadingGames(false);
    }
  };

  // Load user balance
  const loadBalance = async () => {
    if (!token || isLoggingOut) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/balance`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        // If unauthorized, token might be invalid - logout
        if (response.status === 401 && !isLoggingOut) {
          console.log("Invalid session detected");
          handleLogout();
        }
        return;
      }

      const data = await response.json();
      setBalance(data.balance);
      localStorage.setItem("gameHubBalance", data.balance.toString());
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  // Check for admin messages
  const checkForMessages = async () => {
    if (!token || isLoggingOut || isAdmin) return; // Don't check for admin users
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/messages`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) return;

      const messages = await response.json();
      
      // Show the first unread message
      if (messages.length > 0) {
        const firstMessage = messages[0];
        setAdminMessage(firstMessage);
        setAdminMessageDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking for messages:", error);
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    if (!token) return;
    
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/messages/${messageId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const handleDismissAdminMessage = async () => {
    if (adminMessage) {
      await markMessageAsRead(adminMessage.id);
      
      // Reload balance if coins were adjusted
      if (adminMessage.coinAmount && adminMessage.coinAmount !== 0) {
        await loadBalance();
      }
      
      setAdminMessageDialogOpen(false);
      setAdminMessage(null);
      
      // Check for next message
      setTimeout(() => {
        checkForMessages();
      }, 500);
    }
  };

  // Track session activity
  const trackActivity = async () => {
    if (!token || isLoggingOut) return;
    
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000); // Duration in seconds
    
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/track-activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ sessionDuration }),
        }
      );
      console.log(`Tracked ${sessionDuration} seconds of activity`);
    } catch (error) {
      console.error("Error tracking activity:", error);
    }
  };

  useEffect(() => {
    if (token && !hasLoadedInitialData) {
      // On first login, just load games (we already have balance from login response)
      console.log("Initial login - loading games only");
      loadGames();
      checkForMessages(); // Check for messages on login
      setHasLoadedInitialData(true);
      
      // Start auto-refresh and activity tracking
      const refreshInterval = setInterval(() => {
        console.log("Auto-refreshing games and balance");
        loadGames();
        loadBalance();
        checkForMessages();
      }, 10000);

      // Track activity every 30 seconds
      const activityInterval = setInterval(() => {
        trackActivity();
      }, 30000);

      return () => {
        clearInterval(refreshInterval);
        clearInterval(activityInterval);
      };
    } else if (token && hasLoadedInitialData) {
      // If token changes but we've already loaded data, refresh everything
      console.log("Token changed - reloading all data");
      loadBalance();
      loadGames();
      checkForMessages();
      
      const refreshInterval = setInterval(() => {
        loadGames();
        loadBalance();
        checkForMessages();
      }, 10000);

      // Track activity every 30 seconds
      const activityInterval = setInterval(() => {
        trackActivity();
      }, 30000);

      return () => {
        clearInterval(refreshInterval);
        clearInterval(activityInterval);
      };
    }
  }, [token]);

  const handleAuthSuccess = (authToken: string, authUsername: string, authBalance?: number, authIsAdmin?: boolean) => {
    setToken(authToken);
    setUsername(authUsername);
    setSessionStartTime(Date.now()); // Set session start time
    localStorage.setItem("gameHubToken", authToken);
    localStorage.setItem("gameHubUsername", authUsername);
    if (authBalance !== undefined) {
      setBalance(authBalance);
      localStorage.setItem("gameHubBalance", authBalance.toString());
    }
    if (authIsAdmin !== undefined) {
      setIsAdmin(authIsAdmin);
      localStorage.setItem("gameHubIsAdmin", authIsAdmin.toString());
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    // Track final session activity before logging out
    await trackActivity();
    
    setToken(null);
    setUsername(null);
    setIsAdmin(false);
    setHasLoadedInitialData(false);
    localStorage.removeItem("gameHubToken");
    localStorage.removeItem("gameHubUsername");
    localStorage.removeItem("gameHubBalance");
    localStorage.removeItem("gameHubIsAdmin");
    setGames([]);
    toast.success("Logged out successfully");
    setTimeout(() => setIsLoggingOut(false), 1000); // Reset logout state after 1 second
  };

  const handleHostGame = async (gameData: {
    name: string;
    gameType: string;
    stake: string;
    stakeAmount?: string;
    lobbyDuration: string;
    customDuration?: string;
  }) => {
    // Show confirmation dialog before creating game
    setHostConfirmDialog({ open: true, gameData });
  };

  const confirmHostGame = async () => {
    if (!hostConfirmDialog) return;
    
    const gameData = hostConfirmDialog.gameData;
    setHostConfirmDialog(null);
    
    // Determine the final stake value to send to backend
    let finalStake = gameData.stake;
    if (gameData.stake === "custom" && gameData.stakeAmount) {
      finalStake = gameData.stakeAmount;
    }
    
    // Prepare the payload with the correct fields
    const payload = {
      name: gameData.name,
      gameType: gameData.gameType,
      stake: finalStake,
      lobbyDuration: gameData.lobbyDuration,
      customDuration: gameData.customDuration,
    };
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/games`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token!,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to create game", {
          description: data.error || "Unable to create game",
        });
        return;
      }

      toast.success("Game created successfully!", {
        description: `${gameData.name} is now waiting for players.`,
      });
      
      // Reload games and balance to show the new game and updated balance
      loadGames();
      loadBalance();
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game", {
        description: "Unable to connect to server",
      });
    }
  };

  const handleJoinGameClick = (gameId: string) => {
    // Find the game to get details
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Show confirmation dialog
    setJoinConfirmDialog({
      open: true,
      gameId: game.id,
      gameName: game.name,
      stake: game.stake,
    });
  };

  const confirmJoinGame = async () => {
    if (!joinConfirmDialog) return;
    
    const gameId = joinConfirmDialog.gameId;
    setJoinConfirmDialog(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/games/${gameId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token!,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to join game", {
          description: data.error || "Unable to join game",
        });
        return;
      }

      toast.success("Joined game!", {
        description: `You've joined ${data.name}`,
      });
      
      // Reload games to show updated state
      loadGames();
    } catch (error) {
      console.error("Error joining game:", error);
      toast.error("Failed to join game", {
        description: "Unable to connect to server",
      });
    }
  };

  // Handle clicking a game mention from Banter Board
  const handleGameMentionClick = (gameId: string) => {
    // Switch to lobbies tab
    setActiveTab("lobbies");
    // Highlight the game temporarily
    setHighlightedGameId(gameId);
    
    // Remove highlight on scroll or click
    const removeHighlight = () => {
      setHighlightedGameId(null);
      window.removeEventListener('scroll', removeHighlight);
      window.removeEventListener('click', removeHighlight);
    };
    
    // Add listeners after a short delay to avoid immediate removal from the click that triggered this
    setTimeout(() => {
      window.addEventListener('scroll', removeHighlight);
      window.addEventListener('click', removeHighlight);
    }, 100);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show auth form if not logged in
  if (!token || !username) {
    return (
      <>
        <Toaster />
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.gameType.toLowerCase().includes(searchQuery.toLowerCase());

    // Only filter by lobby filter, not by activeTab
    const matchesLobbyFilter =
      lobbyFilter === "all" ||
      (lobbyFilter === "waiting" && game.status === "waiting") ||
      (lobbyFilter === "active" && game.status === "in-progress");

    return matchesSearch && matchesLobbyFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Toaster />
      
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                <Gamepad2 className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white">GameHub</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-purple-200 truncate">Welcome, {username}</p>
                  {isAdmin && (
                    <>
                      <span className="text-purple-300 hidden sm:inline">•</span>
                      <div className="flex items-center gap-1 text-sm">
                        <Shield className="h-3 w-3 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold hidden sm:inline">Admin</span>
                      </div>
                    </>
                  )}
                  <span className="text-purple-300 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 text-sm text-yellow-300">
                    <Coins className="h-4 w-4" />
                    <span className="font-semibold">{balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setAccountDialogOpen(true)}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
              >
                <User className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Account</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
                disabled={isLoggingOut}
              >
                <LogOut className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Games Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white/10 border border-white/20">
            <TabsTrigger value="lobbies" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
              Active Lobbies
            </TabsTrigger>
            <TabsTrigger value="banter" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
              Banter Board
            </TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
              Games
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
              Feedback
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lobbies" className="mt-0">
            {/* Host Game and Refresh Buttons */}
            <div className="mb-6 flex items-center gap-3">
              <Button
                onClick={() => setHostDialogOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Host Game
              </Button>
              <Button
                onClick={loadGames}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
                disabled={isLoadingGames}
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isLoadingGames ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Lobby Filters */}
            <div className="mb-4 flex items-center justify-between">
              <Tabs value={lobbyFilter} onValueChange={setLobbyFilter}>
                <TabsList className="bg-white/10 border border-white/20">
                  <TabsTrigger value="waiting" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
                    Waiting
                  </TabsTrigger>
                  <TabsTrigger value="active" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
                    In Progress
                  </TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* View Mode Toggle - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={`${
                    viewMode === "card"
                      ? "bg-purple-500 text-white hover:bg-purple-600 hover:text-white"
                      : "text-purple-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Cards
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`${
                    viewMode === "list"
                      ? "bg-purple-500 text-white hover:bg-purple-600 hover:text-white"
                      : "text-purple-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
            {isLoadingGames ? (
              <div className="text-center py-16">
                <RefreshCw className="h-16 w-16 mx-auto text-purple-300 mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Loading games...
                </h3>
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-16">
                <Gamepad2 className="h-16 w-16 mx-auto text-purple-300 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No games found
                </h3>
                <p className="text-purple-200 mb-6">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "Be the first to host a game!"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setHostDialogOpen(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Host Your First Game
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Group games by status */}
                {(() => {
                  const waitingGames = filteredGames.filter(g => g.status === "waiting");
                  const inProgressGames = filteredGames.filter(g => g.status === "in-progress");
                  const fullGames = filteredGames.filter(g => g.status === "full");

                  return (
                    <>
                      {/* Card view - always shown on mobile, optional on desktop */}
                      <div className={`${viewMode === "list" ? "hidden md:hidden" : ""} space-y-8`}>
                        {/* Waiting for Players */}
                        {waitingGames.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-green-400 animate-pulse"></div>
                              Waiting for Players
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {waitingGames.map((game) => (
                                <GameCard 
                                  key={game.id} 
                                  game={game} 
                                  onJoin={handleJoinGameClick} 
                                  currentUsername={username || undefined}
                                  isHighlighted={highlightedGameId === game.id}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* In Progress */}
                        {inProgressGames.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse"></div>
                              In Progress
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {inProgressGames.map((game) => (
                                <GameCard 
                                  key={game.id} 
                                  game={game} 
                                  onJoin={handleJoinGameClick} 
                                  currentUsername={username || undefined}
                                  isHighlighted={highlightedGameId === game.id}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full */}
                        {fullGames.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-red-400"></div>
                              Full
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {fullGames.map((game) => (
                                <GameCard 
                                  key={game.id} 
                                  game={game} 
                                  onJoin={handleJoinGameClick} 
                                  currentUsername={username || undefined}
                                  isHighlighted={highlightedGameId === game.id}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* List view - only shown on desktop when selected */}
                      {viewMode === "list" && (
                        <div className="hidden md:block">
                          <GameListView 
                            games={filteredGames} 
                            onJoin={handleJoinGameClick} 
                            currentUsername={username || undefined}
                            highlightedGameId={highlightedGameId}
                          />
                        </div>
                      )}

                      {/* Mobile always shows card view */}
                      {viewMode === "list" && (
                        <div className="block md:hidden space-y-8">
                          {/* Waiting for Players */}
                          {waitingGames.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-green-400 animate-pulse"></div>
                                Waiting for Players
                              </h3>
                              <div className="grid grid-cols-1 gap-6">
                                {waitingGames.map((game) => (
                                  <GameCard 
                                    key={game.id} 
                                    game={game} 
                                    onJoin={handleJoinGameClick} 
                                    currentUsername={username || undefined}
                                    isHighlighted={highlightedGameId === game.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* In Progress */}
                          {inProgressGames.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse"></div>
                                In Progress
                              </h3>
                              <div className="grid grid-cols-1 gap-6">
                                {inProgressGames.map((game) => (
                                  <GameCard 
                                    key={game.id} 
                                    game={game} 
                                    onJoin={handleJoinGameClick} 
                                    currentUsername={username || undefined}
                                    isHighlighted={highlightedGameId === game.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full */}
                          {fullGames.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-red-400"></div>
                                Full
                              </h3>
                              <div className="grid grid-cols-1 gap-6">
                                {fullGames.map((game) => (
                                  <GameCard 
                                    key={game.id} 
                                    game={game} 
                                    onJoin={handleJoinGameClick} 
                                    currentUsername={username || undefined}
                                    isHighlighted={highlightedGameId === game.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </TabsContent>

          <TabsContent value="banter" className="mt-0">
            <BanterBoard 
              token={token!} 
              username={username!} 
              isAdmin={isAdmin} 
              games={games}
              onGameClick={handleGameMentionClick} 
            />
          </TabsContent>

          <TabsContent value="games" className="mt-0">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 mb-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <Gamepad2 className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Available Games</h2>
              <p className="text-purple-200 text-lg max-w-2xl mx-auto mb-2">
                Choose from our collection of classic games. More games coming soon!
              </p>
              <p className="text-purple-300 text-sm">
                Have a game you'd like us to host? Reach out via the{" "}
                <button
                  onClick={() => setActiveTab("feedback")}
                  className="text-pink-400 hover:text-pink-300 underline font-medium"
                >
                  Feedback
                </button>{" "}
                section!
              </p>
            </div>

            {/* Game Cards */}
            <div className="space-y-6">
              {/* Blackjack */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl">🃏</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Blackjack</h3>
                      <p className="text-purple-200 text-sm">Classic 21</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-purple-100 leading-relaxed mb-4">
                    Test your luck and strategy in the classic game of 21! Compete head-to-head against another player to get as close to 21 as possible without going over. The dealer deals two cards to each player, and you must decide whether to hit (take another card) or stand (keep your current hand).
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">1v1 competitive gameplay</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Ace counts as 1 or 11</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Face cards count as 10</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Win coins by beating your opponent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Casino War */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-pink-500/50 transition-all">
                <div className="bg-gradient-to-r from-pink-600 to-pink-700 p-6">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl">⚔️</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Casino War</h3>
                      <p className="text-pink-200 text-sm">Battle of the Cards</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-purple-100 leading-relaxed mb-4">
                    Engage in an epic card battle! Each player is dealt one card, and the highest card wins. It's that simple! If there's a tie, you can either surrender and lose half your bet, or go to war by doubling your bet and drawing three more cards. The player with the highest fourth card wins the entire pot.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Fast-paced, easy to learn</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Aces are high (strongest card)</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">War mechanic on tied cards</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Quick rounds, intense action</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roshambo */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl">✊✋✌️</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Roshambo</h3>
                      <p className="text-blue-200 text-sm">Rock, Paper, Scissors</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-purple-100 leading-relaxed mb-4">
                    The timeless game of chance and psychology! Choose rock, paper, or scissors and face off against your opponent. Rock crushes scissors, scissors cuts paper, and paper covers rock. Best out of 3 rounds wins the match. Simple rules, but strategic mind games make this a thrilling competition!
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Best of 3 rounds format</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Rock beats scissors</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Scissors beats paper</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-purple-200">Paper beats rock</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6 text-center">
              <p className="text-white text-lg font-semibold mb-4">
                Ready to play? Head over to Active Lobbies!
              </p>
              <Button
                onClick={() => setActiveTab("lobbies")}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Gamepad2 className="h-5 w-5 mr-2" />
                Browse Games
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="leaderboards" className="mt-0">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Leaderboards
              </h3>
              <p className="text-purple-200 max-w-md mx-auto">
                See who's dominating the tables. Rankings and stats coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <Feedback token={token!} username={username!} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="mt-0">
              <AdminPanel token={token!} />
            </TabsContent>
          )}
        </Tabs>

        {/* Stats Footer - Only show for lobbies tab */}
        {!isLoadingGames && games.length > 0 && activeTab === "lobbies" && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {games.length}
              </div>
              <div className="text-purple-200 text-sm">Total Games</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {games.filter((g) => g.status === "waiting").length}
              </div>
              <div className="text-purple-200 text-sm">Waiting for Players</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {games.reduce((acc, game) => acc + game.playerCount, 0)}
              </div>
              <div className="text-purple-200 text-sm">Active Players</div>
            </div>
          </div>
        )}
      </div>

      {/* Host Game Dialog */}
      <HostGameDialog
        open={hostDialogOpen}
        onOpenChange={setHostDialogOpen}
        onHostGame={handleHostGame}
        userBalance={balance}
      />

      {/* Account Dialog */}
      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        token={token!}
        username={username!}
      />

      {/* Admin Message Dialog */}
      <Dialog open={adminMessageDialogOpen} onOpenChange={setAdminMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white text-center">
              {adminMessage?.title || "Admin Message"}
            </DialogTitle>
            <DialogDescription className="text-sm text-purple-100 text-center">
              {adminMessage?.message || "You have a new message from the admin."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Coin Reward Section */}
          {adminMessage?.coinAmount && adminMessage.coinAmount !== 0 && (
            <div className="flex items-center justify-center py-6">
              <div className={`rounded-xl p-6 text-center shadow-2xl ${
                adminMessage.coinAmount > 0 
                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 animate-pulse' 
                  : 'bg-gradient-to-br from-red-500 to-red-700'
              }`}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Coins className={`h-12 w-12 ${
                    adminMessage.coinAmount > 0 ? 'text-yellow-900' : 'text-white'
                  }`} />
                  <span className={`text-6xl font-bold ${
                    adminMessage.coinAmount > 0 ? 'text-yellow-900' : 'text-white'
                  }`}>
                    {adminMessage.coinAmount > 0 ? '+' : ''}{Math.abs(adminMessage.coinAmount)}
                  </span>
                  <Coins className={`h-12 w-12 ${
                    adminMessage.coinAmount > 0 ? 'text-yellow-900' : 'text-white'
                  }`} />
                </div>
                <p className={`text-lg font-bold ${
                  adminMessage.coinAmount > 0 ? 'text-yellow-900' : 'text-white'
                }`}>
                  {adminMessage.coinAmount > 0 ? 'Coins Awarded!' : 'Coins Deducted'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleDismissAdminMessage}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              {adminMessage?.coinAmount && adminMessage.coinAmount > 0 ? 'Awesome!' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Game Confirmation Dialog */}
      <Dialog open={joinConfirmDialog?.open || false} onOpenChange={(open) => !open && setJoinConfirmDialog(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-slate-900 to-purple-900 border-purple-500">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white text-center">
              Join Game?
            </DialogTitle>
            <DialogDescription className="text-sm text-purple-200 text-center">
              {joinConfirmDialog?.gameName || ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            {joinConfirmDialog?.stake ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-yellow-300">
                  <Coins className="h-8 w-8" />
                  <span className="text-4xl font-bold">{joinConfirmDialog.stake}</span>
                </div>
                <p className="text-white text-lg">
                  Joining will cost you <span className="font-bold text-yellow-300">{joinConfirmDialog.stake} coin{joinConfirmDialog.stake > 1 ? 's' : ''}</span>
                </p>
                <p className="text-purple-300 text-sm">
                  Your coins will be at stake in this game.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="p-4 rounded-full bg-green-500/20">
                    <Gamepad2 className="h-10 w-10 text-green-400" />
                  </div>
                </div>
                <p className="text-white text-lg font-semibold">
                  Free Lobby - No coins required!
                </p>
                <p className="text-purple-300 text-sm">
                  This is a fun game with no coin stakes.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setJoinConfirmDialog(null)}
              className="flex-1 border-purple-400/50 bg-transparent hover:bg-purple-500/20 text-purple-200 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmJoinGame}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              Join Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Host Game Confirmation Dialog */}
      <Dialog open={hostConfirmDialog?.open || false} onOpenChange={(open) => !open && setHostConfirmDialog(null)}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 to-purple-900 border-purple-500">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white text-center">
              Confirm Game Hosting
            </DialogTitle>
            <DialogDescription className="text-sm text-purple-200 text-center">
              {hostConfirmDialog?.gameData?.name || ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            {hostConfirmDialog?.gameData?.stake !== "Fun" ? (
              <>
                <div className="flex items-center justify-center gap-2 text-yellow-300">
                  <Coins className="h-10 w-10" />
                  <span className="text-5xl font-bold">
                    {hostConfirmDialog?.gameData?.stake === "custom" 
                      ? hostConfirmDialog?.gameData?.stakeAmount 
                      : hostConfirmDialog?.gameData?.stake}
                  </span>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center space-y-2">
                  <p className="text-white text-base">
                    <span className="font-bold text-yellow-300">
                      {hostConfirmDialog?.gameData?.stake === "custom" 
                        ? hostConfirmDialog?.gameData?.stakeAmount 
                        : hostConfirmDialog?.gameData?.stake} coin{((hostConfirmDialog?.gameData?.stake === "custom" ? parseInt(hostConfirmDialog?.gameData?.stakeAmount) : parseInt(hostConfirmDialog?.gameData?.stake)) > 1) ? 's' : ''}
                    </span> will be deducted from your account.
                  </p>
                  <p className="text-green-300 text-sm font-medium">
                    ✓ Your coins will be returned if no one joins before the lobby expires.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="p-4 rounded-full bg-green-500/20">
                    <Gamepad2 className="h-12 w-12 text-green-400" />
                  </div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <p className="text-white text-base font-semibold">
                    Free Lobby - No coins will be deducted!
                  </p>
                  <p className="text-green-300 text-sm mt-2">
                    This is a fun game with no coin stakes.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setHostConfirmDialog(null)}
              className="flex-1 border-purple-400/50 bg-transparent hover:bg-purple-500/20 text-purple-200 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmHostGame}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}