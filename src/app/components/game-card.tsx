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
}

interface GameCardProps {
  game: Game;
  onJoin: (gameId: string) => void;
}

export function GameCard({ game, onJoin }: GameCardProps) {
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

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <CardTitle>{game.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(game.status)}>
            {getStatusLabel(game.status)}
          </Badge>
        </div>
        <CardDescription>Hosted by {game.host}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {game.playerCount}/{game.maxPlayers} players
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{getTimeAgo(game.createdAt)}</span>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="outline">{game.gameType}</Badge>
        </div>
        {game.stake && (
          <div className="mt-3">
            <Badge variant="outline">
              <Coins className="h-4 w-4" />
              {game.stake} stake
            </Badge>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onJoin(game.id)}
          disabled={game.status === "full"}
          className="w-full"
        >
          {game.status === "full" ? "Game Full" : "Join Game"}
        </Button>
      </CardFooter>
    </Card>
  );
}