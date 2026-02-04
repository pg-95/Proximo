import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { RefreshCw, User, Clock, Coins, TrendingUp, TrendingDown, Gamepad2, Calendar } from "lucide-react";
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

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  username: string;
}

export function AccountDialog({ open, onOpenChange, token, username }: AccountDialogProps) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadUserStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/user/stats`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error("Failed to load account stats", {
          description: data.error || "Unable to fetch your data",
        });
        return;
      }

      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error("Error loading user stats:", error);
      toast.error("Failed to load account stats", {
        description: "Unable to connect to server",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUserStats();
    }
  }, [open]);

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

  const netCoins = userStats ? userStats.coinsWon - userStats.coinsLost : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">Account Details</DialogTitle>
          <DialogDescription className="text-center">
            Viewing stats for <span className="font-semibold text-purple-600">{username}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : userStats ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Balance */}
              <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <p className="text-xs font-medium text-muted-foreground">Coin Balance</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{userStats.balance.toLocaleString()}</p>
                </CardContent>
              </Card>

              {/* Games Played */}
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="h-4 w-4 text-blue-500" />
                    <p className="text-xs font-medium text-muted-foreground">Games Played</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{userStats.gamesPlayed}</p>
                </CardContent>
              </Card>

              {/* Coins Won */}
              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <p className="text-xs font-medium text-muted-foreground">Coins Won</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">+{userStats.coinsWon.toLocaleString()}</p>
                </CardContent>
              </Card>

              {/* Coins Lost */}
              <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <p className="text-xs font-medium text-muted-foreground">Coins Lost</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">-{userStats.coinsLost.toLocaleString()}</p>
                </CardContent>
              </Card>

              {/* Net Coins */}
              <Card className={`bg-gradient-to-br ${netCoins >= 0 ? 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' : 'from-orange-500/20 to-orange-600/20 border-orange-500/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground">Net Coins</p>
                  </div>
                  <p className={`text-2xl font-bold ${netCoins >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {netCoins >= 0 ? '+' : ''}{netCoins.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* Total Logins */}
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-500" />
                    <p className="text-xs font-medium text-muted-foreground">Total Logins</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{userStats.totalLogins}</p>
                </CardContent>
              </Card>

              {/* Account Created - Full Width */}
              <Card className="col-span-2 bg-gradient-to-br from-slate-500/20 to-slate-600/20 border-slate-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <p className="text-xs font-medium text-muted-foreground">Account Created</p>
                    </div>
                    <p className="text-sm font-medium text-slate-600">{formatDate(userStats.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Last Login - Full Width */}
              <Card className="col-span-2 bg-gradient-to-br from-slate-500/20 to-slate-600/20 border-slate-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <p className="text-xs font-medium text-muted-foreground">Last Login</p>
                    </div>
                    <p className="text-sm font-medium text-slate-600">{formatDate(userStats.lastLogin)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={loadUserStats}
            disabled={isLoading}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}