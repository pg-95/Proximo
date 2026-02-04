import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Coins, Clock } from "lucide-react";

interface HostGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHostGame: (gameData: {
    name: string;
    gameType: string;
    stake: string;
    stakeAmount?: string;
    lobbyDuration: string;
    customDuration?: string;
  }) => void;
  userBalance: number;
}

export function HostGameDialog({ open, onOpenChange, onHostGame, userBalance }: HostGameDialogProps) {
  const [gameName, setGameName] = useState("");
  const [gameType, setGameType] = useState("Blackjack");
  const [stake, setStake] = useState("Fun");
  const [customStake, setCustomStake] = useState("");
  const [lobbyDuration, setLobbyDuration] = useState("1h");
  const [customDuration, setCustomDuration] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameName && gameType && stake && lobbyDuration) {
      onHostGame({
        name: gameName,
        gameType,
        stake,
        stakeAmount: stake === "custom" ? customStake : undefined,
        lobbyDuration,
        customDuration: lobbyDuration === "custom" ? customDuration : undefined,
      });
      // Reset form
      setGameName("");
      setGameType("Blackjack");
      setStake("Fun");
      setCustomStake("");
      setLobbyDuration("1h");
      setCustomDuration("");
      onOpenChange(false);
    }
  };

  const getStakeValue = () => {
    if (stake === "Fun") return 0;
    if (stake === "custom") return parseInt(customStake) || 0;
    return parseInt(stake) || 0;
  };

  const hasEnoughBalance = () => {
    const stakeValue = getStakeValue();
    return stakeValue === 0 || userBalance >= stakeValue;
  };

  const isValidDuration = () => {
    if (lobbyDuration !== "custom") return true;
    const hours = parseFloat(customDuration);
    return hours > 0 && hours <= 168; // Max 7 days = 168 hours
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Host a New Game</DialogTitle>
          <DialogDescription>
            Create a new game session for other players to join.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gameName">Game Name</Label>
              <Input
                id="gameName"
                placeholder="Enter game name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gameType">Game Type</Label>
              <Select value={gameType} onValueChange={setGameType} required>
                <SelectTrigger id="gameType">
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blackjack">Blackjack</SelectItem>
                  <SelectItem value="Casino War">Casino War</SelectItem>
                  <SelectItem value="Roshambo">Roshambo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stake">Stake</Label>
              <Select value={stake} onValueChange={setStake}>
                <SelectTrigger id="stake">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fun">Fun (No coins)</SelectItem>
                  <SelectItem value="1" disabled={userBalance < 1}>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>1 coin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2" disabled={userBalance < 2}>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>2 coins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="3" disabled={userBalance < 3}>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>3 coins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="4" disabled={userBalance < 4}>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>4 coins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="5" disabled={userBalance < 5}>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>5 coins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>5+ coins (Enter Amount)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {stake === "custom" && (
                <div className="mt-2">
                  <Input
                    type="number"
                    placeholder="Enter stake amount (min 6)"
                    value={customStake}
                    onChange={(e) => setCustomStake(e.target.value)}
                    min="6"
                    required
                  />
                  {customStake && parseInt(customStake) > userBalance && (
                    <p className="text-xs text-destructive mt-1">
                      Insufficient balance. You have {userBalance} coins.
                    </p>
                  )}
                </div>
              )}
              {stake !== "Fun" && stake !== "custom" && parseInt(stake) > userBalance && (
                <p className="text-xs text-destructive mt-1">
                  Insufficient balance. You have {userBalance} coins.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lobbyDuration">Lobby Duration</Label>
              <Select value={lobbyDuration} onValueChange={setLobbyDuration}>
                <SelectTrigger id="lobbyDuration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="2h">2 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Custom (Max 7 days)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {lobbyDuration === "custom" && (
                <div className="mt-2">
                  <Input
                    type="number"
                    placeholder="Enter duration in hours (min 1, max 168)"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min="1"
                    max="168"
                    required
                  />
                  {customDuration && !isValidDuration() && (
                    <p className="text-xs text-destructive mt-1">
                      Invalid duration. Please enter a value between 1 and 168 hours.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <Coins className="h-4 w-4" />
              <span>Your balance: {userBalance} coins</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!hasEnoughBalance() || !isValidDuration()}
            >
              Create Game
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}