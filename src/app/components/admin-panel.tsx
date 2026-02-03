import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { RefreshCw, Users, Clock, Coins } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface UserStats {
  username: string;
  balance: number;
  lastLogin: string | null;
  totalLogins: number;
  totalTimeSpent: number;
  gamesPlayed: number;
  coinsWon: number;
  coinsLost: number;
  createdAt: string;
}

interface AdminPanelProps {
  token: string;
}

export function AdminPanel({ token }: AdminPanelProps) {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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

  const totalUsers = users.length;
  const totalCoinsInCirculation = users.reduce((sum, user) => sum + user.balance, 0);
  const averageBalance = totalUsers > 0 ? Math.round(totalCoinsInCirculation / totalUsers) : 0;

  return (
    <div className="space-y-6">
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
                Detailed statistics for all registered users
              </CardDescription>
            </div>
            <Button
              onClick={loadUsers}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-white/20 hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && users.length === 0 ? (
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
                      <TableHead className="text-purple-200 font-semibold">Username</TableHead>
                      <TableHead className="text-purple-200 font-semibold">Last Login</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Total Logins</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Time Spent</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Balance</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Games Played</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Coins Won</TableHead>
                      <TableHead className="text-purple-200 font-semibold text-right">Coins Lost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-purple-200">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
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
    </div>
  );
}