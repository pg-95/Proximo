import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { RefreshCw, Users, Coins, MessageSquare, Gamepad2, Trash2, ChevronUp, ChevronDown, ArrowUpDown, Send, Inbox, Clock, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { AdminInbox } from "@/app/components/admin-inbox";

type SortField = string;
type SortDirection = 'asc' | 'desc' | 'none';

interface UserStats {
  username: string;
  balance: number;
  lastLogin: string | null;
  totalLogins: number;
  totalTimeSpent: number;
  gamesPlayed: number;
  coinsWon: number;
  coinsLost: number;
  coinsAwarded: number;
  createdAt: string;
}

interface GameData {
  id: string;
  gameType: string;
  name: string;
  host: string;
  stake: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  createdAt: string;
  expiryTime?: string;
  endedAt?: string;
}

interface AdminPanelProps {
  token: string;
}

export function AdminPanel({ token }: AdminPanelProps) {
  const [viewMode, setViewMode] = useState<"users" | "games" | "inbox">("users");
  
  // Users state
  const [users, setUsers] = useState<UserStats[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSortField, setUserSortField] = useState<SortField>('none');
  const [userSortDirection, setUserSortDirection] = useState<SortDirection>('none');
  
  // Games state
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [gameSortField, setGameSortField] = useState<SortField>('none');
  const [gameSortDirection, setGameSortDirection] = useState<SortDirection>('none');
  
  // Dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [coinsDialogOpen, setCoinsDialogOpen] = useState(false);
  const [deleteGameDialogOpen, setDeleteGameDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [messageCoinAmount, setMessageCoinAmount] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAdjustingCoins, setIsAdjustingCoins] = useState(false);
  const [isDeletingGame, setIsDeletingGame] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error("Failed to load users", {
          description: data.error || "Unable to fetch user data",
        });
        return;
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadGames = async () => {
    setIsLoadingGames(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/games`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error("Failed to load games", {
          description: data.error || "Unable to fetch game data",
        });
        return;
      }

      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Failed to load games", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadGames();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : userSortDirection === 'desc' ? 'none' : 'asc');
      if (userSortDirection === 'desc') {
        setUserSortField('none');
      }
    } else {
      setUserSortField(field);
      setUserSortDirection('asc');
    }
  };

  const handleGameSort = (field: SortField) => {
    if (gameSortField === field) {
      setGameSortDirection(gameSortDirection === 'asc' ? 'desc' : gameSortDirection === 'desc' ? 'none' : 'asc');
      if (gameSortDirection === 'desc') {
        setGameSortField('none');
      }
    } else {
      setGameSortField(field);
      setGameSortDirection('asc');
    }
  };

  const getSortIcon = (field: string, currentField: SortField, currentDirection: SortDirection) => {
    if (currentField !== field || currentDirection === 'none') {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    }
    return currentDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />;
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (userSortField === 'none') return 0;
    const aValue = a[userSortField as keyof UserStats];
    const bValue = b[userSortField as keyof UserStats];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (aValue < bValue) return userSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return userSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedGames = [...games].sort((a, b) => {
    if (gameSortField === 'none') return 0;
    const aValue = a[gameSortField as keyof GameData];
    const bValue = b[gameSortField as keyof GameData];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (aValue < bValue) return gameSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return gameSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalUsers = users.length;
  const totalCoinsInCirculation = users.reduce((sum, user) => sum + user.balance, 0);
  const averageBalance = totalUsers > 0 ? Math.round(totalCoinsInCirculation / totalUsers) : 0;
  
  const activeGames = games.filter(g => g.status === "waiting" || g.status === "in-progress" || g.status === "full");
  const totalActiveGames = activeGames.length;
  const totalGames = games.length;
  const totalStaked = activeGames.reduce((sum, game) => {
    if (game.stake === "Fun") return sum;
    const stake = parseInt(game.stake) || 0;
    return sum + (stake * game.currentPlayers);
  }, 0);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
      "in-progress": "bg-blue-500/20 text-blue-300 border-blue-400/30",
      full: "bg-orange-500/20 text-orange-300 border-orange-400/30",
      completed: "bg-green-500/20 text-green-300 border-green-400/30",
      cancelled: "bg-red-500/20 text-red-300 border-red-400/30",
    };

    return (
      <Badge variant="outline" className={colors[status] || "border-purple-400/30 text-purple-300"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSendingMessage(true);
    try {
      const coinAmountValue = messageCoinAmount.trim() !== "" ? parseInt(messageCoinAmount) : null;
      
      const messageResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({
            username: selectedUser,
            title: messageTitle,
            message: messageContent,
            coinAmount: coinAmountValue,
          }),
        }
      );

      const messageData = await messageResponse.json();

      if (!messageResponse.ok) {
        toast.error("Failed to send message", {
          description: messageData.error || "Unable to send message",
        });
        return;
      }

      if (coinAmountValue !== null && !isNaN(coinAmountValue) && coinAmountValue !== 0) {
        const coinResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/adjust-coins`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
              "X-Session-Token": token,
            },
            body: JSON.stringify({
              username: selectedUser,
              amount: coinAmountValue,
            }),
          }
        );

        if (coinResponse.ok) {
          toast.success("Message sent with coin adjustment!", {
            description: `${selectedUser} will see your message and receive ${coinAmountValue > 0 ? "+" : ""}${coinAmountValue} coins`,
          });
        } else {
          toast.success("Message sent!", {
            description: `${selectedUser} will see your message (coin adjustment failed)`,
          });
        }
        loadUsers();
      } else {
        toast.success("Message sent!", {
          description: `${selectedUser} will see your message on their next page load`,
        });
      }

      setMessageDialogOpen(false);
      setMessageTitle("");
      setMessageContent("");
      setMessageCoinAmount("");
      setSelectedUser("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAdjustCoins = async () => {
    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid coin amount");
      return;
    }

    setIsAdjustingCoins(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/adjust-coins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({
            username: selectedUser,
            amount: amount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to adjust coins", {
          description: data.error || "Unable to adjust coins",
        });
        return;
      }

      toast.success("Coins adjusted!", {
        description: `${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} coins ${amount > 0 ? "to" : "from"} ${selectedUser}`,
      });
      setCoinsDialogOpen(false);
      setCoinAmount("");
      setSelectedUser("");
      loadUsers();
    } catch (error) {
      console.error("Error adjusting coins:", error);
      toast.error("Failed to adjust coins", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsAdjustingCoins(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!selectedGame) return;

    setIsDeletingGame(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/games/${selectedGame.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to delete game", {
          description: data.error || "Unable to delete game",
        });
        return;
      }

      toast.success("Game deleted!", {
        description: `${selectedGame.gameType} game by ${selectedGame.host} has been deleted`,
      });
      
      setDeleteGameDialogOpen(false);
      setSelectedGame(null);
      loadGames();
    } catch (error) {
      console.error("Error deleting game:", error);
      toast.error("Failed to delete game", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsDeletingGame(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-1">
          <Button
            onClick={() => setViewMode("users")}
            variant={viewMode === "users" ? "default" : "ghost"}
            className={`${
              viewMode === "users"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "text-purple-200 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button
            onClick={() => setViewMode("games")}
            variant={viewMode === "games" ? "default" : "ghost"}
            className={`${
              viewMode === "games"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "text-purple-200 hover:text-white hover:bg-white/10"
            }`}
          >
            <Gamepad2 className="h-4 w-4 mr-2" />
            Games
          </Button>
          <Button
            onClick={() => setViewMode("inbox")}
            variant={viewMode === "inbox" ? "default" : "ghost"}
            className={`${
              viewMode === "inbox"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "text-purple-200 hover:text-white hover:bg-white/10"
            }`}
          >
            <Inbox className="h-4 w-4 mr-2" />
            Inbox
          </Button>
        </div>
      </div>

      {/* Users View */}
      {viewMode === "users" && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalUsers}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Coins in Circulation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalCoinsInCirculation}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Average Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{averageBalance}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">User Statistics</CardTitle>
                  <CardDescription className="text-purple-200">
                    Click column headers to sort (ascending → descending → none)
                  </CardDescription>
                </div>
                <Button
                  onClick={loadUsers}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingUsers}
                  className="border-white/20 hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers && users.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 mx-auto text-purple-300 mb-2 animate-spin" />
                  <p className="text-purple-200">Loading user data...</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-white/5">
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('username')}
                          >
                            <div className="flex items-center">
                              Username
                              {getSortIcon('username', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('lastLogin')}
                          >
                            <div className="flex items-center">
                              Last Login
                              {getSortIcon('lastLogin', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('totalLogins')}
                          >
                            <div className="flex items-center justify-end">
                              Total Logins
                              {getSortIcon('totalLogins', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('totalTimeSpent')}
                          >
                            <div className="flex items-center justify-end">
                              Time Spent
                              {getSortIcon('totalTimeSpent', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('balance')}
                          >
                            <div className="flex items-center justify-end">
                              Balance
                              {getSortIcon('balance', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('gamesPlayed')}
                          >
                            <div className="flex items-center justify-end">
                              Games Played
                              {getSortIcon('gamesPlayed', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('coinsWon')}
                          >
                            <div className="flex items-center justify-end">
                              Coins Won
                              {getSortIcon('coinsWon', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('coinsLost')}
                          >
                            <div className="flex items-center justify-end">
                              Coins Lost
                              {getSortIcon('coinsLost', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold text-right cursor-pointer hover:bg-white/5"
                            onClick={() => handleUserSort('coinsAwarded')}
                          >
                            <div className="flex items-center justify-end">
                              Coins Awarded
                              {getSortIcon('coinsAwarded', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="text-purple-200 font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-purple-200">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedUsers.map((user) => (
                            <TableRow key={user.username} className="border-white/20 hover:bg-white/5">
                              <TableCell className="font-medium text-white">
                                {user.username}
                                {user.username === "root" && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-purple-500 text-white rounded">
                                    ADMIN
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-purple-100 text-sm">
                                {formatDate(user.lastLogin)}
                              </TableCell>
                              <TableCell className="text-right text-purple-100">
                                {user.totalLogins}
                              </TableCell>
                              <TableCell className="text-right text-purple-100">
                                {formatTimeSpent(user.totalTimeSpent)}
                              </TableCell>
                              <TableCell className="text-right text-purple-100 font-semibold">
                                {user.balance}
                              </TableCell>
                              <TableCell className="text-right text-purple-100">
                                {user.gamesPlayed}
                              </TableCell>
                              <TableCell className="text-right text-green-300 font-semibold">
                                +{user.coinsWon}
                              </TableCell>
                              <TableCell className="text-right text-red-300 font-semibold">
                                -{user.coinsLost}
                              </TableCell>
                              <TableCell className="text-right text-blue-300 font-semibold">
                                +{user.coinsAwarded}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    onClick={() => {
                                      setSelectedUser(user.username);
                                      setMessageDialogOpen(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="border-white/20 hover:bg-white/10"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedUser(user.username);
                                      setCoinsDialogOpen(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="border-white/20 hover:bg-white/10"
                                  >
                                    <Coins className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Games View */}
      {viewMode === "games" && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Active Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalActiveGames}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Total Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalGames}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Coins in Active Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalStaked}</div>
              </CardContent>
            </Card>
          </div>

          {/* Games Table */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Game Management</CardTitle>
                  <CardDescription className="text-purple-200">
                    Click column headers to sort (ascending → descending → none)
                  </CardDescription>
                </div>
                <Button
                  onClick={loadGames}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingGames}
                  className="border-white/20 hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingGames ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGames && games.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 mx-auto text-purple-300 mb-2 animate-spin" />
                  <p className="text-purple-200">Loading games...</p>
                </div>
              ) : sortedGames.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 mx-auto text-purple-300 mb-2 opacity-50" />
                  <p className="text-purple-200">No games found</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-white/5">
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('gameType')}
                          >
                            <div className="flex items-center">
                              Game Type
                              {getSortIcon('gameType', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('name')}
                          >
                            <div className="flex items-center">
                              Game Name
                              {getSortIcon('name', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('host')}
                          >
                            <div className="flex items-center">
                              Host
                              {getSortIcon('host', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('stake')}
                          >
                            <div className="flex items-center">
                              Stake
                              {getSortIcon('stake', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('status')}
                          >
                            <div className="flex items-center">
                              Status
                              {getSortIcon('status', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('currentPlayers')}
                          >
                            <div className="flex items-center">
                              Players
                              {getSortIcon('currentPlayers', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('createdAt')}
                          >
                            <div className="flex items-center">
                              Created
                              {getSortIcon('createdAt', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-purple-200 font-semibold cursor-pointer hover:bg-white/5"
                            onClick={() => handleGameSort('expiryTime')}
                          >
                            <div className="flex items-center">
                              Expires
                              {getSortIcon('expiryTime', gameSortField, gameSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="text-purple-200 font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedGames.map((game) => (
                          <TableRow key={game.id} className="border-white/20 hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              {game.gameType}
                            </TableCell>
                            <TableCell className="text-purple-100">
                              {game.name}
                            </TableCell>
                            <TableCell className="text-purple-100">
                              {game.host}
                            </TableCell>
                            <TableCell className="text-purple-100">
                              {game.stake === "Fun" ? (
                                <Badge variant="outline" className="border-green-400/30 text-green-300 bg-green-500/10">
                                  Fun
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-yellow-400/30 text-yellow-300 bg-yellow-500/10 flex items-center gap-1 w-fit">
                                  <Coins className="h-3 w-3" />
                                  {game.stake}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(game.status)}
                            </TableCell>
                            <TableCell className="text-purple-100">
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-purple-400" />
                                {game.currentPlayers}/{game.maxPlayers}
                              </div>
                            </TableCell>
                            <TableCell className="text-purple-100 text-sm">
                              {formatDate(game.createdAt)}
                            </TableCell>
                            <TableCell className="text-purple-100 text-sm">
                              {game.expiryTime ? formatDate(game.expiryTime) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => {
                                  setSelectedGame(game);
                                  setDeleteGameDialogOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-red-400/30 text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Inbox View */}
      {viewMode === "inbox" && (
        <AdminInbox token={token} />
      )}

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Message to {selectedUser}</DialogTitle>
            <DialogDescription>
              Send a pop-up message that will appear to the user
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message-title">Title</Label>
              <Input
                id="message-title"
                placeholder="Message title"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                disabled={isSendingMessage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                placeholder="Enter your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                disabled={isSendingMessage}
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message-coin-amount">Coin Adjustment (Optional)</Label>
              <Input
                id="message-coin-amount"
                type="number"
                placeholder="e.g., 100 or -50"
                value={messageCoinAmount}
                onChange={(e) => setMessageCoinAmount(e.target.value)}
                disabled={isSendingMessage}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no coin adjustment. Positive values add coins, negative values remove coins.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMessageDialogOpen(false);
                setMessageTitle("");
                setMessageContent("");
                setMessageCoinAmount("");
              }}
              disabled={isSendingMessage}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Coins Dialog */}
      <Dialog open={coinsDialogOpen} onOpenChange={setCoinsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Coins for {selectedUser}</DialogTitle>
            <DialogDescription>
              Enter a positive number to add coins or a negative number to remove coins
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coin-amount">Amount</Label>
              <Input
                id="coin-amount"
                type="number"
                placeholder="e.g., 100 or -50"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                disabled={isAdjustingCoins}
              />
              <p className="text-xs text-muted-foreground">
                Positive values add coins, negative values remove coins
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCoinsDialogOpen(false);
                setCoinAmount("");
              }}
              disabled={isAdjustingCoins}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustCoins}
              disabled={isAdjustingCoins}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isAdjustingCoins ? "Adjusting..." : "Adjust Coins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Game Confirmation Dialog */}
      <Dialog open={deleteGameDialogOpen} onOpenChange={setDeleteGameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-slate-900 to-purple-900 border-purple-500">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Game?</DialogTitle>
            <DialogDescription className="text-purple-200">
              Are you sure you want to delete this game? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedGame && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Game Type:</span>
                <span className="text-white font-medium">{selectedGame.gameType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Host:</span>
                <span className="text-white font-medium">{selectedGame.host}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Status:</span>
                <span>{getStatusBadge(selectedGame.status)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Players:</span>
                <span className="text-white font-medium">{selectedGame.currentPlayers}/{selectedGame.maxPlayers}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteGameDialogOpen(false);
                setSelectedGame(null);
              }}
              disabled={isDeletingGame}
              className="border-purple-400/50 bg-transparent hover:bg-purple-500/20 text-purple-200 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteGame}
              disabled={isDeletingGame}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {isDeletingGame ? "Deleting..." : "Delete Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}