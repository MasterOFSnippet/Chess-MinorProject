import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gameAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChessBoard from '../components/ChessBoard/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trophy, Clock, Target, Flag, Bot, User } from 'lucide-react';

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) {
      fetchGame();
      const interval = setInterval(fetchGame, 3000);
      return () => clearInterval(interval);
    }
  }, [gameId]);

  const fetchGame = async () => {
    try {
      const response = await gameAPI.getGame(gameId);
      const gameData = response.data.game;

      setGame(gameData);
      chess.load(gameData.fen);
      setPosition(gameData.fen);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching game:', error);
      if (loading) {
        alert('Game not found');
        navigate('/');
      }
    }
  };

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

  const handleMove = async (from, to) => {
  const move = { from, to, promotion: 'q' };

  const testChess = new Chess(position);
  const testMove = testChess.move(move);
  
  if (!testMove) {
    alert('Invalid move!');
    return;
  }

  try {
    let response;
    if (game.isBot) {
      response = await gameAPI.makeBotMove(gameId, move);
    } else {
      response = await gameAPI.makeMove(gameId, move);
    }
    
    const newGame = response.data.game;
    setGame(newGame);
    chess.load(newGame.fen);
    setPosition(newGame.fen);

    // Show bot move notification
    if (game.isBot && response.data.botMove) {
      setTimeout(() => {
        alert(`Stockfish played: ${response.data.botMove.san}`);
      }, 100);
    }

    if (response.data.gameStatus.isCheckmate) {
      setTimeout(() => {
        const winner = newGame.winner?.username || 'Stockfish';
        alert(`🏆 Checkmate! ${winner} wins!`);
        
        // Refresh to show updated rating
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 200);
    } else if (response.data.gameStatus.isDraw) {
      setTimeout(() => {
        alert('🤝 Game ended in a draw!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 200);
    } else if (response.data.gameStatus.isCheck) {
      setTimeout(() => alert('Check!'), 200);
    }
  } catch (error) {
    console.error('Error making move:', error);
    alert(error.response?.data?.message || 'Invalid move');
    fetchGame();
  }
};

  const handleResign = async () => {
    if (!window.confirm('Are you sure you want to resign?')) return;
    try {
      await gameAPI.resignGame(gameId);
      alert('You have resigned');
      navigate('/');
    } catch (error) {
      console.error('Error resigning:', error);
    }
  };

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

  return (
    <div className="min-h-screen py-8 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Turn Indicator */}
        <div className="text-center">
          {game.status === 'active' && (
            <Badge
              variant={myTurn ? 'default' : 'secondary'}
              className="text-lg px-6 py-3"
            >
              {myTurn ? '🟢 YOUR TURN - Make a Move!' : '🔴 OPPONENT\'S TURN - Wait...'}
            </Badge>
          )}
          {game.status === 'completed' && (
            <Badge variant="secondary" className="text-lg px-6 py-3">
              ⚔️ Game Over
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-3 flex justify-center">
            <Card className="p-6">
              <ChessBoard
                position={position}
                onMove={handleMove}
                playerColor={myColor}
                isMyTurn={myTurn}
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
                    game.currentTurn === 'white' && game.status === 'active'
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
                    {game.currentTurn === 'white' && game.status === 'active' && (
                      <div className="text-green-500 text-2xl animate-pulse">●</div>
                    )}
                  </div>
                </div>

                {/* Black Player */}
                <div
                  className={`p-3 rounded-lg border-2 transition ${
                    game.currentTurn === 'black' && game.status === 'active'
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
                    {game.currentTurn === 'black' && game.status === 'active' && (
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

            {/* Actions */}
            {game.status === 'active' && (
              <Button onClick={handleResign} variant="destructive" className="w-full">
                <Flag className="mr-2 h-4 w-4" />
                Resign Game
              </Button>
            )}

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Moves
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;