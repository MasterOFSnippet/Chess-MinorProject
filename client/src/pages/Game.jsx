import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gameAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChessBoard from '../components/ChessBoard/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trophy, Clock, Target, Flag, Bot, User, AlertCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botThinking, setBotThinking] = useState(false);

  // ============================================
  // LOAD GAME
  // ============================================
  useEffect(() => {
    if (gameId) {
      fetchGame();
      
      // For human vs human games, poll for updates
      if (game && !game.isBot && game.status === 'active') {
        const interval = setInterval(fetchGame, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [gameId, game?.isBot]);

  // ============================================
  // FETCH GAME STATE
  // ============================================
  const fetchGame = async () => {
    try {
      setError(null);
      const response = await gameAPI.getGame(gameId);
      const gameData = response.data.game;

      console.log('📥 Game loaded:', gameData);

      setGame(gameData);
      chess.load(gameData.fen);
      setPosition(gameData.fen);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching game:', error);
      setError(error.response?.data?.message || 'Failed to load game');
      setLoading(false);
      
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/'), 2000);
      }
    }
  };

  // ============================================
  // GAME LOGIC
  // ============================================
  const isMyTurn = () => {
    if (!game || !user) return false;

    if (game.isBot) {
      const myColor = game.players.white?._id === user.id ? 'white' : 'black';
      return game.currentTurn === myColor && game.status === 'active';
    }

    const myColor = game.players.white._id === user.id ? 'white' : 'black';
    return game.currentTurn === myColor && game.status === 'active';
  };

  const getPlayerColor = () => {
    if (!game || !user) return 'white';
    if (game.isBot) {
      return game.players.white?._id === user.id ? 'white' : 'black';
    }
    return game.players.white._id === user.id ? 'white' : 'black';
  };

  // ============================================
  // HANDLE MOVE
  // ============================================
  const handleMove = async (from, to) => {
    const move = { from, to, promotion: 'q' };
    
    console.log('🎯 Attempting move:', move);

    // Validate locally first
    const testChess = new Chess(position);
    const testMove = testChess.move(move);
    
    if (!testMove) {
      console.error('❌ Invalid move locally:', move);
      alert('Invalid move!');
      return;
    }

    try {
      // Show thinking indicator for bot games
      if (game.isBot) {
        console.log('🤖 Bot game detected');
        setBotThinking(true);
      }

      let response;
      if (game.isBot) {
        console.log('📤 Sending bot move to server:', move);
        response = await gameAPI.makeBotMove(gameId, move);
        console.log('📥 Bot response:', response.data);
      } else {
        console.log('📤 Sending player move to server:', move);
        response = await gameAPI.makeMove(gameId, move);
        console.log('📥 Player response:', response.data);
      }
      
      const newGame = response.data.game;
      setGame(newGame);
      chess.load(newGame.fen);
      setPosition(newGame.fen);

      // Check game status
      if (response.data.gameStatus.isCheckmate) {
        setTimeout(() => {
          const winner = newGame.winner;
          let winnerName = 'Unknown';
          
          if (game.isBot) {
            if (winner && winner.toString() === user.id) {
              winnerName = 'You';
            } else {
              winnerName = 'Stockfish';
            }
          } else {
            winnerName = newGame.winner?.username || 'Unknown';
          }
          
          alert(`🏆 Checkmate! ${winnerName} wins!`);
          setTimeout(() => navigate('/'), 1500);
        }, 200);
      } else if (response.data.gameStatus.isDraw) {
        setTimeout(() => {
          alert('🤝 Game ended in a draw!');
          setTimeout(() => navigate('/'), 1500);
        }, 200);
      } else if (response.data.gameStatus.isCheck) {
        setTimeout(() => alert('Check!'), 200);
      }
    } catch (error) {
      console.error('❌ Error making move:', error);
      alert(error.response?.data?.message || 'Invalid move');
      fetchGame(); // Refresh game state
    } finally {
      setBotThinking(false);
    }
  };

  // ============================================
  // ABORT GAME
  // ============================================
  const handleAbort = async () => {
    if (!window.confirm('Abort this game? (No rating change)')) return;
    try {
      await gameAPI.abortGame(gameId);
      alert('Game aborted');
      navigate('/');
    } catch (error) {
      console.error('❌ Error aborting:', error);
      alert(error.response?.data?.message || 'Cannot abort game');
    }
  };

  // ============================================
  // RESIGN GAME
  // ============================================
  const handleResign = async () => {
    if (!window.confirm('Are you sure you want to resign?')) return;
    try {
      await gameAPI.resignGame(gameId);
      alert('You have resigned');
      navigate('/');
    } catch (error) {
      console.error('❌ Error resigning:', error);
    }
  };

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Error Loading Game</h2>
              <p className="text-[hsl(var(--color-muted-foreground))]">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto border-[hsl(var(--color-primary))]"></div>
          <p className="mt-4 text-[hsl(var(--color-muted-foreground))]">Loading game...</p>
        </div>
      </div>
    );
  }

  const myColor = getPlayerColor();
  const myTurn = isMyTurn();
  const canAbort = game.moves.length < 2;

  return (
    <div className="min-h-screen py-8 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Connection Status */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Badge variant="secondary">
            {game.isBot ? (
              <>
                <Bot className="mr-1 h-3 w-3" />
                Bot Game
              </>
            ) : (
              <>
                <Wifi className="mr-1 h-3 w-3" />
                Live Game (Auto-refresh)
              </>
            )}
          </Badge>

          {/* Turn Indicator */}
          {botThinking && (
            <Badge variant="outline" className="animate-pulse text-lg px-6 py-3">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Bot is thinking...
            </Badge>
          )}

          {!botThinking && game.status === 'active' && (
            <Badge
              variant={myTurn ? 'default' : 'secondary'}
              className="text-lg px-6 py-3"
            >
              {myTurn ? '🟢 YOUR TURN' : '🔴 OPPONENT\'S TURN'}
            </Badge>
          )}

          {game.status === 'completed' && (
            <Badge variant="secondary" className="text-lg px-6 py-3">
              ⚔️ Game Over
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2 flex justify-center">
            <Card className="p-6">
              <ChessBoard
                position={position}
                onMove={handleMove}
                playerColor={myColor}
                isMyTurn={myTurn && !botThinking}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Players Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* White Player */}
                <div
                  className={`p-3 rounded-lg border-2 transition ${
                    game.currentTurn === 'white' && game.status === 'active' && !botThinking
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-transparent bg-[hsl(var(--color-muted)/0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.isBot && !game.players.white ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-bold">
                          ⚪ {game.players.white?.username || 'Stockfish'}
                        </div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
                          ⭐ {game.players.white?.rating || 'AI'}
                        </div>
                      </div>
                    </div>
                    {game.currentTurn === 'white' && game.status === 'active' && !botThinking && (
                      <div className="text-green-500 text-2xl animate-pulse">●</div>
                    )}
                  </div>
                </div>

                {/* Black Player */}
                <div
                  className={`p-3 rounded-lg border-2 transition ${
                    game.currentTurn === 'black' && game.status === 'active' && !botThinking
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-transparent bg-[hsl(var(--color-muted)/0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.isBot && !game.players.black ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-bold">
                          ⚫ {game.players.black?.username || 'Stockfish'}
                        </div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))]">
                          ⭐ {game.players.black?.rating || 'AI'}
                        </div>
                      </div>
                    </div>
                    {game.currentTurn === 'black' && game.status === 'active' && !botThinking && (
                      <div className="text-green-500 text-2xl animate-pulse">●</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">Status</div>
                  <div className="font-semibold capitalize">{game.status}</div>
                </div>
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">Moves</div>
                  <div className="font-semibold">{game.moves.length}</div>
                </div>
                <div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">You Play</div>
                  <div className="font-semibold">{myColor === 'white' ? '⚪ White' : '⚫ Black'}</div>
                </div>
                {game.isBot && (
                  <div>
                    <div className="text-sm text-[hsl(var(--color-muted-foreground))]">Opponent</div>
                    <Badge variant="secondary">
                      <Bot className="mr-1 h-3 w-3" />
                      Stockfish AI
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {game.status === 'active' && (
              <div className="space-y-2">
                {canAbort ? (
                  <Button onClick={handleAbort} variant="outline" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    Abort Game (No Rating Change)
                  </Button>
                ) : (
                  <Button onClick={handleResign} variant="destructive" className="w-full">
                    <Flag className="mr-2 h-4 w-4" />
                    Resign Game
                  </Button>
                )}
              </div>
            )}

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Moves
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                {game.moves.length === 0 ? (
                  <p className="text-sm italic text-[hsl(var(--color-muted-foreground))]">
                    No moves yet...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {game.moves.map((move, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-12 font-mono text-[hsl(var(--color-muted-foreground))]">
                          {index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''}
                        </span>
                        <span className="font-semibold">{move}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Panel - Only for human vs human games */}
            {!game.isBot && (
              <Card>
                <CardHeader>
                  <CardTitle>Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))] italic">
                    💬 Chat coming soon! For now, focus on your moves.
                  </div>
                  <div className="mt-3 text-xs text-[hsl(var(--color-muted-foreground))]">
                    Tip: Game auto-refreshes every 3 seconds
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;