import { useState, useEffect } from "react";
import { GameCard, Game } from "@/app/components/game-card";
import { HostGameDialog } from "@/app/components/host-game-dialog";
import { AuthForm } from "@/app/components/auth-form";
import { AdminPanel } from "@/app/components/admin-panel";
import { BanterBoard } from "@/app/components/banter-board";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Plus, Search, Gamepad2, LogOut, RefreshCw, Coins, Shield } from "lucide-react";
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
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

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
      const transformedGames = data.map((game: any) => ({
        id: game.id,
        name: `${game.gameType} - ${game.stake}`, // Generate name from gameType and stake
        host: game.host,
        playerCount: game.currentPlayers || 1,
        maxPlayers: game.maxPlayers || 6,
        gameType: game.gameType,
        stake: game.stake === "Fun" ? undefined : parseInt(game.stake) || undefined,
        status: game.status,
        createdAt: new Date(game.createdAt),
      }));
      
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

  useEffect(() => {
    if (token && !hasLoadedInitialData) {
      // On first login, just load games (we already have balance from login response)
      console.log("Initial login - loading games only");
      loadGames();
      setHasLoadedInitialData(true);
      
      // Start auto-refresh after 10 seconds
      const interval = setInterval(() => {
        console.log("Auto-refreshing games and balance");
        loadGames();
        loadBalance();
      }, 10000);
      return () => clearInterval(interval);
    } else if (token && hasLoadedInitialData) {
      // If token changes but we've already loaded data, refresh everything
      console.log("Token changed - reloading all data");
      loadBalance();
      loadGames();
      
      const interval = setInterval(() => {
        loadGames();
        loadBalance();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleAuthSuccess = (authToken: string, authUsername: string, authBalance?: number, authIsAdmin?: boolean) => {
    setToken(authToken);
    setUsername(authUsername);
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

  const handleLogout = () => {
    setIsLoggingOut(true);
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
  }) => {
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
          body: JSON.stringify(gameData),
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

  const handleJoinGame = async (gameId: string) => {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Gamepad2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GameHub</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-purple-200">Welcome, {username}</p>
                  {isAdmin && (
                    <>
                      <span className="text-purple-300">•</span>
                      <div className="flex items-center gap-1 text-sm">
                        <Shield className="h-3 w-3 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold">Admin</span>
                      </div>
                    </>
                  )}
                  <span className="text-purple-300">•</span>
                  <div className="flex items-center gap-1 text-sm text-yellow-300">
                    <Coins className="h-4 w-4" />
                    <span className="font-semibold">{balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={loadGames}
                variant="outline"
                size="icon"
                className="border-white/20 hover:bg-white/10"
                disabled={isLoadingGames}
              >
                <RefreshCw className={`h-5 w-5 ${isLoadingGames ? "animate-spin" : ""}`} />
              </Button>
              <Button
                onClick={() => setHostDialogOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Host Game
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
                disabled={isLoggingOut}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
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
            <TabsTrigger value="lobbies" className="data-[state=active]:bg-purple-500">
              Active Lobbies
            </TabsTrigger>
            <TabsTrigger value="banter" className="data-[state=active]:bg-purple-500">
              Banter Board
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="data-[state=active]:bg-purple-500">
              Leaderboards
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-purple-500">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lobbies" className="mt-0">
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
            <div className="mb-4">
              <Tabs value={lobbyFilter} onValueChange={setLobbyFilter}>
                <TabsList className="bg-white/10 border border-white/20">
                  <TabsTrigger value="all" className="data-[state=active]:bg-purple-500">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="waiting" className="data-[state=active]:bg-purple-500">
                    Waiting
                  </TabsTrigger>
                  <TabsTrigger value="active" className="data-[state=active]:bg-purple-500">
                    In Progress
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} onJoin={handleJoinGame} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="banter" className="mt-0">
            <BanterBoard token={token!} username={username!} />
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
    </div>
  );
}