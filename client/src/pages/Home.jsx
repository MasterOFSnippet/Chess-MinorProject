import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gameAPI, userAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trophy, Gamepad2, Target, TrendingUp, User, Bot } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [gameMode, setGameMode] = useState('human');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, usersRes] = await Promise.all([
        gameAPI.getMyGames(),
        userAPI.getAllUsers(),
      ]);
      setGames(gamesRes.data.games);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED getGameStatus (handles bot games properly)
  const getGameStatus = (game) => {
    if (game.status === 'active') {
      const whitePlayerId = game.players.white?._id;
      const blackPlayerId = game.players.black?._id;

      const isMyTurn =
        (game.currentTurn === 'white' && whitePlayerId === user.id) ||
        (game.currentTurn === 'black' && blackPlayerId === user.id);

      return {
        text: isMyTurn
          ? 'Your turn'
          : game.isBot
          ? "Bot's turn"
          : "Opponent's turn",
        variant: isMyTurn ? 'default' : 'secondary',
      };
    }

    if (game.status === 'completed') {
      if (game.winner?._id === user.id)
        return { text: 'You won!', variant: 'default' };
      if (game.result === '1/2-1/2')
        return { text: 'Draw', variant: 'secondary' };
      return { text: 'You lost', variant: 'destructive' };
    }

    return { text: game.status, variant: 'secondary' };
  };

  const handleCreateGame = async () => {
    if (gameMode === 'human' && !selectedOpponent) {
      alert('Please select an opponent');
      return;
    }

    try {
      if (gameMode === 'bot') {
        const response = await gameAPI.createBotGame();
        navigate(`/game/${response.data.game._id}`);
      } else {
        const response = await gameAPI.createGame(selectedOpponent);
        navigate(`/game/${response.data.game._id}`);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      alert(error.response?.data?.message || 'Failed to create game');
    }
  };

  const winRate =
    user?.gamesPlayed > 0
      ? Math.round((user.wins / user.gamesPlayed) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto border-[hsl(var(--color-primary))]" />
          <p className="mt-4 text-[hsl(var(--color-muted-foreground))]">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-[hsl(var(--color-muted-foreground))]">
            Ready to dominate the board?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Rating', icon: Target, value: user?.rating, label: 'ELO Rating' },
            { title: 'Games Played', icon: Gamepad2, value: user?.gamesPlayed, label: 'Total matches' },
            { title: 'Wins', icon: Trophy, value: user?.wins, label: `${winRate}% win rate`, color: 'text-green-500' },
            { title: 'Performance', icon: TrendingUp, value: user?.losses, label: 'Losses', color: 'text-red-500' },
          ].map(({ title, icon: Icon, value, label, color = '' }, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Start New Game Button */}
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => setShowNewGameModal(true)} className="text-lg px-8">
            <Gamepad2 className="mr-2 h-5 w-5" />
            Start New Game
          </Button>
        </div>

        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle>Your Recent Games</CardTitle>
            <CardDescription>Click a game to view or continue</CardDescription>
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--color-muted-foreground))]" />
                <p className="text-[hsl(var(--color-muted-foreground))]">
                  No games yet. Start your first match!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => {
                  const status = getGameStatus(game);
                  return (
                    <div
                      key={game._id}
                      onClick={() => navigate(`/game/${game._id}`)}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">
                              ⚪ {game.players.white?.username || 'Stockfish'}
                            </span>
                            <span className="text-[hsl(var(--color-muted-foreground))]">
                              vs
                            </span>
                            <span className="font-semibold">
                              ⚫ {game.players.black?.username || 'Stockfish'}
                            </span>
                            {game.isBot && (
                              <Badge variant="secondary" className="ml-2">
                                <Bot className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-[hsl(var(--color-muted-foreground))]">
                            <span>{new Date(game.startedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{game.moves.length} moves</span>
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ Modal Section (unchanged, consistent with design) */}
      {showNewGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Start New Game</CardTitle>
                <button
                  onClick={() => setShowNewGameModal(false)}
                  className="text-2xl hover:opacity-70"
                >
                  ×
                </button>
              </div>
              <CardDescription>Choose your opponent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Button
                  variant={gameMode === 'human' ? 'default' : 'outline'}
                  onClick={() => setGameMode('human')}
                  className="flex-1"
                >
                  <User className="mr-2 h-4 w-4" />
                  Play vs Human
                </Button>
                <Button
                  variant={gameMode === 'bot' ? 'default' : 'outline'}
                  onClick={() => setGameMode('bot')}
                  className="flex-1"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  Play vs Stockfish
                </Button>
              </div>

              {gameMode === 'bot' ? (
                <div className="text-center py-8">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--color-primary))]" />
                  <p className="text-lg font-semibold mb-2">
                    Play against Stockfish Engine
                  </p>
                  <p className="text-[hsl(var(--color-muted-foreground))]">
                    Difficulty adjusts based on your rating ({user?.rating})
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-center py-8 text-[hsl(var(--color-muted-foreground))]">
                      No other players available. Invite friends to join!
                    </p>
                  ) : (
                    users.map((opponent) => (
                      <div
                        key={opponent._id}
                        onClick={() => setSelectedOpponent(opponent._id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedOpponent === opponent._id
                            ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)]'
                            : 'border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary)/0.5)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-lg">
                              {opponent.username}
                            </div>
                            <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
                              Rating: {opponent.rating} • {opponent.gamesPlayed} games
                            </div>
                          </div>
                          {selectedOpponent === opponent._id && (
                            <div className="text-2xl text-[hsl(var(--color-primary))]">
                              ✓
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowNewGameModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGame}
                  disabled={gameMode === 'human' && !selectedOpponent}
                  className="flex-1"
                >
                  Start Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Home;