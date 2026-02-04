import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Users, Clock, Gamepad2, Coins } from "lucide-react";

export interface Game {
  id: string;
  name: string;
  host: string;
  playerCount: number;
  maxPlayers: number;
  gameType: string;
  stake?: number;
  status: "waiting" | "in-progress" | "full";
  createdAt: Date;
  expiryTime?: Date;
}

interface GameCardProps {
  game: Game;
  onJoin: (gameId: string) => void;
  currentUsername?: string;
  isHighlighted?: boolean;
}

export function GameCard({ game, onJoin, currentUsername, isHighlighted }: GameCardProps) {
  const getStatusColor = (status: Game["status"]) => {
    switch (status) {
      case "waiting":
        return "bg-green-500/10 text-green-600 hover:bg-green-500/20";
      case "in-progress":
        return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20";
      case "full":
        return "bg-red-500/10 text-red-600 hover:bg-red-500/20";
    }
  };

  const getStatusLabel = (status: Game["status"]) => {
    switch (status) {
      case "waiting":
        return "Waiting for Players";
      case "in-progress":
        return "In Progress";
      case "full":
        return "Full";
    }
  };

  const getTimeRemaining = (expiryTime: Date) => {
    const now = new Date();
    const diffMs = expiryTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Expired";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  return (
    <Card className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all hover:shadow-xl hover:border-purple-500/50 ${
      isHighlighted ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-slate-900 border-purple-500 animate-pulse' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-white text-base truncate">{game.name}</CardTitle>
              <CardDescription className="text-purple-200 text-sm">Hosted by {game.host}</CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(game.status) + " flex-shrink-0 text-xs"}>
            {getStatusLabel(game.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-purple-200">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-white font-medium">
              {game.playerCount}/{game.maxPlayers}
            </span>
            <span className="text-purple-300">players</span>
          </div>
          {game.expiryTime && (
            <div className="flex items-center gap-1.5 text-purple-200">
              <Clock className="h-4 w-4 text-purple-400" />
              <span className="text-white font-medium">{getTimeRemaining(game.expiryTime)}</span>
              <span className="text-purple-300">left</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-purple-400/30 text-purple-300 bg-purple-500/10">
            {game.gameType}
          </Badge>
          {game.stake ? (
            <Badge variant="outline" className="border-yellow-400/30 text-yellow-300 bg-yellow-500/10 flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span>{game.stake} stake</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-400/30 text-green-300 bg-green-500/10">
              Fun
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        {currentUsername && game.host === currentUsername ? (
          <Button
            disabled
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold opacity-50 cursor-not-allowed"
          >
            Your Game
          </Button>
        ) : (
          <Button
            onClick={() => onJoin(game.id)}
            disabled={game.status === "full" || game.status === "in-progress"}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
          >
            {game.status === "full" || game.status === "in-progress" ? "Game Full" : "Join Game"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}