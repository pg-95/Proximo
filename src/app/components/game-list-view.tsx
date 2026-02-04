import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Game } from "@/app/components/game-card";
import { Users, Clock, Coins, Gamepad2 } from "lucide-react";

interface GameListViewProps {
  games: Game[];
  onJoin: (gameId: string) => void;
  currentUsername?: string;
  highlightedGameId?: string | null;
}

export function GameListView({ games, onJoin, currentUsername, highlightedGameId }: GameListViewProps) {
  const getStatusColor = (status: Game["status"]) => {
    switch (status) {
      case "waiting":
        return "bg-green-500/10 text-green-600";
      case "in-progress":
        return "bg-yellow-500/10 text-yellow-600";
      case "full":
        return "bg-red-500/10 text-red-600";
    }
  };

  const getStatusLabel = (status: Game["status"]) => {
    switch (status) {
      case "waiting":
        return "Waiting";
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

  const getStakeDisplay = (stake?: number) => {
    if (!stake) return "Fun";
    return `${stake} coins`;
  };

  // Group games by status
  const waitingGames = games.filter(g => g.status === "waiting");
  const inProgressGames = games.filter(g => g.status === "in-progress");
  const fullGames = games.filter(g => g.status === "full");

  // Render a table section for a specific status
  const renderSection = (sectionGames: Game[], title: string, color: string, showPulse: boolean) => {
    if (sectionGames.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        {/* Section Header */}
        <h3 className={`text-lg font-semibold ${color} mb-4 flex items-center gap-2`}>
          <div className={`h-1 w-1 rounded-full ${color.replace('text-', 'bg-')} ${showPulse ? 'animate-pulse' : ''}`}></div>
          {title}
        </h3>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-white/10 border-b border-white/10 text-sm font-semibold text-purple-200">
            <div className="col-span-1">Action</div>
            <div className="col-span-3">Game Name</div>
            <div className="col-span-2">Game Type</div>
            <div className="col-span-2">Host</div>
            <div className="col-span-1">Stake</div>
            <div className="col-span-1">Players</div>
            <div className="col-span-2">Time Remaining</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {sectionGames.map((game) => (
              <div
                key={game.id}
                className={`grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-all items-center ${
                  highlightedGameId === game.id 
                    ? 'bg-purple-500/20 border-l-4 border-purple-500 animate-pulse' 
                    : ''
                }`}
              >
                {/* Action */}
                <div className="col-span-1">
                  {currentUsername && game.host === currentUsername ? (
                    <Button
                      disabled
                      size="sm"
                      className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-semibold w-full opacity-50 cursor-not-allowed"
                    >
                      Your Game
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onJoin(game.id)}
                      disabled={game.status === "full" || game.status === "in-progress"}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold w-full"
                    >
                      {game.status === "full" || game.status === "in-progress" ? "Full" : "Join"}
                    </Button>
                  )}
                </div>

                {/* Game Name */}
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                    <Gamepad2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-sm truncate">{game.name}</div>
                    <Badge className={getStatusColor(game.status) + " text-xs mt-1"}>
                      {getStatusLabel(game.status)}
                    </Badge>
                  </div>
                </div>

                {/* Game Type */}
                <div className="col-span-2">
                  <Badge variant="outline" className="border-purple-400/30 text-purple-300 bg-purple-500/10 text-xs">
                    {game.gameType}
                  </Badge>
                </div>

                {/* Host */}
                <div className="col-span-2 text-sm text-purple-200 truncate">
                  {game.host}
                </div>

                {/* Stake */}
                <div className="col-span-1">
                  {game.stake ? (
                    <Badge variant="outline" className="border-yellow-400/30 text-yellow-300 bg-yellow-500/10 text-xs flex items-center gap-1 w-fit">
                      <Coins className="h-3 w-3" />
                      <span>{game.stake}</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-400/30 text-green-300 bg-green-500/10 text-xs">
                      Fun
                    </Badge>
                  )}
                </div>

                {/* Players */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5 text-sm text-purple-200">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-white font-medium">
                      {game.playerCount}/{game.maxPlayers}
                    </span>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="col-span-2">
                  {game.expiryTime ? (
                    <div className="flex items-center gap-1.5 text-sm text-purple-200">
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-white font-medium">{getTimeRemaining(game.expiryTime)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-purple-300">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {renderSection(waitingGames, "Waiting for Players", "text-green-400", true)}
      {renderSection(inProgressGames, "In Progress", "text-yellow-400", true)}
      {renderSection(fullGames, "Full", "text-red-400", false)}
    </div>
  );
}