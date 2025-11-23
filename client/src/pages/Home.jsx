import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gameAPI, userAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Trophy, 
  Gamepad2, 
  Target, 
  TrendingUp, 
  User, 
  Bot, 
  Search, 
  X, 
  Loader2,
  AlertCircle 
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [gameMode, setGameMode] = useState('human');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingGame, setCreatingGame] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [gamesRes, usersRes] = await Promise.all([
        gameAPI.getMyGames(),
        userAPI.getAllUsers(),
      ]);
      setGames(gamesRes.data.games);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(error.response?.data?.message || 'Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SEARCH FILTERING (Optimized with useMemo)
  // ============================================
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(opponent => 
      opponent.username.toLowerCase().includes(query) ||
      opponent.rating.toString().includes(query) ||
      opponent.gamesPlayed.toString().includes(query)
    );
  }, [users, searchQuery]);

  // ============================================
  // GAME STATUS HELPER
  // ============================================
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

  // ============================================
  // MODAL HANDLERS (useCallback for performance)
  // ============================================
  const handleOpenModal = useCallback(() => {
    setShowNewGameModal(true);
    setSelectedOpponent(null);
    setSearchQuery('');
    setError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowNewGameModal(false);
    setSelectedOpponent(null);
    setSearchQuery('');
    setGameMode('human');
    setError(null);
  }, []);

  // HANDLE GAME CREATION (✅ MEMOIZED WITH CORRECT DEPS)
  const handleCreateGame = useCallback(async () => {
  if (gameMode === 'human' && !selectedOpponent) {
    setError('⚠️ Please select an opponent');
    return;
  }

  try {
    setCreatingGame(true);
    setError(null);

    let response;
    if (gameMode === 'bot') {
      response = await gameAPI.createBotGame();
    } else {
      response = await gameAPI.createGame(selectedOpponent);
    }
    
    navigate(`/game/${response.data.game._id}`);
  } catch (error) {
    console.error('❌ Error creating game:', error);
    setError(error.response?.data?.message || 'Failed to create game. Please try again.');
    setCreatingGame(false);
  }
}, [gameMode, selectedOpponent, navigate]);

  // HANDLE KEYBOARD SHORTCUTS (✅ UPDATED DEPS)
  const handleKeyDown = useCallback((e) => {
  if (e.key === 'Escape') {
    handleCloseModal();
  } else if (e.key === 'Enter' && (gameMode === 'bot' || selectedOpponent)) {
    handleCreateGame();
  }
  }, [gameMode, selectedOpponent, handleCloseModal, handleCreateGame]); // ✅ BOTH functions included

  // Keyboard shortcut listener
  useEffect(() => {
    if (showNewGameModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showNewGameModal, handleKeyDown]);

  // ============================================
  // STATS CALCULATION
  // ============================================
  const winRate = user?.gamesPlayed > 0
    ? Math.round((user.wins / user.gamesPlayed) * 100)
    : 0;

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-[hsl(var(--color-primary))]" />
          <p className="text-[hsl(var(--color-muted-foreground))]">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error && !showNewGameModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Error</h2>
              <p className="text-[hsl(var(--color-muted-foreground))]">{error}</p>
            </div>
            <Button onClick={fetchData} className="w-full">
              <Loader2 className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen py-8 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ============================================
            HEADER
            ============================================ */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-[hsl(var(--color-muted-foreground))]">
            Ready to dominate the board?
          </p>
        </div>

        {/* ============================================
            STATS GRID
            ============================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              title: 'Rating', 
              icon: Target, 
              value: user?.rating, 
              label: 'ELO Rating' 
            },
            { 
              title: 'Games Played', 
              icon: Gamepad2, 
              value: user?.gamesPlayed, 
              label: 'Total matches' 
            },
            { 
              title: 'Wins', 
              icon: Trophy, 
              value: user?.wins, 
              label: `${winRate}% win rate`, 
              color: 'text-green-500' 
            },
            { 
              title: 'Performance', 
              icon: TrendingUp, 
              value: user?.losses, 
              label: 'Losses', 
              color: 'text-red-500' 
            },
          ].map(({ title, icon: Icon, value, label, color = '' }, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
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

        {/* ============================================
            START NEW GAME BUTTON
            ============================================ */}
        <div className="flex gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={handleOpenModal} 
            className="text-lg px-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Gamepad2 className="mr-2 h-5 w-5" />
            Start New Game
          </Button>
        </div>

        {/* ============================================
            RECENT GAMES
            ============================================ */}
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
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))]"
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

      {/* ============================================
          NEW GAME MODAL (PRODUCTION-READY)
          ============================================ */}
      {showNewGameModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          {/* ✅ FLEX LAYOUT: Sticky Header + Scrollable Content + Sticky Footer */}
          <Card className="w-full max-w-2xl flex flex-col max-h-[90vh]">
            
            {/* ============================================
                STICKY HEADER
                ============================================ */}
            <CardHeader className="flex-shrink-0 border-b border-[hsl(var(--color-border))]">
              <div className="flex items-center justify-between">
                <CardTitle>Start New Game</CardTitle>
                <button
                  onClick={handleCloseModal}
                  className="text-2xl hover:opacity-70 transition"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CardDescription>
                Choose your opponent {gameMode === 'bot' ? '(AI)' : '(Human)'} • Press ESC to close
              </CardDescription>
            </CardHeader>

            {/* ============================================
                SCROLLABLE CONTENT
                ============================================ */}
            <CardContent className="flex-1 overflow-y-auto p-6">
              
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-500">{error}</p>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-500 hover:opacity-70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Game Mode Toggle */}
              <div className="flex gap-4 mb-6">
                <Button
                  variant={gameMode === 'human' ? 'default' : 'outline'}
                  onClick={() => {
                    setGameMode('human');
                    setSelectedOpponent(null);
                  }}
                  className="flex-1"
                  disabled={creatingGame}
                >
                  <User className="mr-2 h-4 w-4" />
                  Play vs Human
                </Button>
                <Button
                  variant={gameMode === 'bot' ? 'default' : 'outline'}
                  onClick={() => {
                    setGameMode('bot');
                    setSelectedOpponent(null);
                  }}
                  className="flex-1"
                  disabled={creatingGame}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  Play vs Stockfish
                </Button>
              </div>

              {/* Bot Mode View */}
              {gameMode === 'bot' ? (
                <div className="text-center py-8">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--color-primary))] animate-pulse" />
                  <p className="text-lg font-semibold mb-2">
                    Play against Stockfish Engine
                  </p>
                  <p className="text-[hsl(var(--color-muted-foreground))]">
                    Difficulty adjusts based on your rating ({user?.rating})
                  </p>
                  <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--color-muted)/0.3)]">
                    <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                      💡 <strong>Tip:</strong> The AI thinks for 1-2 seconds before each move
                    </p>
                  </div>
                </div>
              ) : (
                /* Human Mode View */
                <>
                  {/* ✅ SEARCH BAR */}
                  <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />
                    <Input
                      type="text"
                      placeholder="Search by username, rating, or games..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={creatingGame}
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Results Count */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-[hsl(var(--color-muted-foreground))]">
                      {filteredUsers.length === 0 ? (
                        <span className="text-orange-500">No players found</span>
                      ) : (
                        <>
                          Showing <strong>{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'player' : 'players'}
                        </>
                      )}
                    </span>
                    {searchQuery && (
                      <Badge variant="secondary" className="text-xs">
                        Filtered from {users.length} total
                      </Badge>
                    )}
                  </div>

                  {/* ✅ SCROLLABLE PLAYER LIST (max-height with overflow) */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 mx-auto mb-3 text-[hsl(var(--color-muted-foreground))]" />
                        <p className="text-lg font-medium mb-1">No matches found</p>
                        <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                          Try a different search term or{' '}
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="text-[hsl(var(--color-primary))] hover:underline"
                          >
                            clear your search
                          </button>
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((opponent) => (
                        <div
                          key={opponent._id}
                          onClick={() => !creatingGame && setSelectedOpponent(opponent._id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedOpponent === opponent._id
                              ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] scale-[1.02] shadow-md'
                              : 'border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary)/0.5)] hover:shadow-sm'
                          } ${creatingGame ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-lg flex items-center gap-2">
                                {opponent.username}
                                {opponent.gamesPlayed > 50 && (
                                  <Badge variant="secondary" className="text-xs">
                                    🏆 Veteran
                                  </Badge>
                                )}
                                {opponent.gamesPlayed === 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    🆕 New
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-[hsl(var(--color-muted-foreground))] mt-1">
                                ⭐ Rating: <strong>{opponent.rating}</strong> • {opponent.gamesPlayed} games
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

                  {/* Helpful Hints */}
                  {users.length === 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--color-muted)/0.3)]">
                      <p className="text-sm text-center text-[hsl(var(--color-muted-foreground))]">
                        👥 No other players available. Invite friends to join!
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>

            {/* ============================================
                STICKY FOOTER
                ============================================ */}
            <div className="flex-shrink-0 p-6 border-t border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))]">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                  disabled={creatingGame}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGame}
                  disabled={(gameMode === 'human' && !selectedOpponent) || creatingGame}
                  className="flex-1"
                >
                  {creatingGame ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      Start Game
                    </>
                  )}
                </Button>
              </div>
              
              {/* Keyboard Shortcuts Hint */}
              <div className="mt-3 text-center text-xs text-[hsl(var(--color-muted-foreground))]">
                <kbd className="px-2 py-1 rounded bg-[hsl(var(--color-muted)/0.3)]">ESC</kbd> to close • 
                <kbd className="ml-1 px-2 py-1 rounded bg-[hsl(var(--color-muted)/0.3)]">ENTER</kbd> to start
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Home;