import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gameAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import ChessBoard from '../components/ChessBoard/ChessBoard';
import ChatPanel from '../components/game/ChatPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trophy, Clock, Target, Flag, Bot, User, AlertCircle, AlertTriangle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

// ============================================
// 🎯 ENHANCED GAME OVER MODAL
// ============================================
const GameOverModal = ({ show, winner, reason, onClose }) => {
  if (!show) return null;

  // Determine modal styling based on outcome
  const getModalStyle = () => {
    if (winner === 'You') {
      return {
        emoji: '🏆',
        title: 'Victory!',
        bgColor: 'bg-gradient-to-br from-yellow-500/20 to-green-500/20',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-500'
      };
    } else if (winner === 'Draw') {
      return {
        emoji: '🤝',
        title: 'Draw!',
        bgColor: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-500'
      };
    } else {
      return {
        emoji: '💔',
        title: 'Defeat',
        bgColor: 'bg-gradient-to-br from-red-500/20 to-pink-500/20',
        borderColor: 'border-red-500',
        textColor: 'text-red-500'
      };
    }
  };

  const style = getModalStyle();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className={`max-w-md w-full mx-4 border-2 ${style.borderColor} ${style.bgColor}`}>
        <CardHeader>
          <CardTitle className="text-center text-4xl">
            <div className="mb-4 text-6xl animate-bounce">{style.emoji}</div>
            <div className={style.textColor}>{style.title}</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-[hsl(var(--color-foreground))]">
              {winner === 'Draw' ? 'Game ended in a draw' : `${winner} wins!`}
            </p>
            <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
              {reason}
            </p>
          </div>
          <Button onClick={onClose} className="w-full" size="lg">
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  
  // ✅ CENTRALIZED GAME OVER STATE
  const [gameOverModal, setGameOverModal] = useState({
    show: false,
    winner: '',
    reason: ''
  });

  // ============================================
  // 🎯 UNIFIED GAME OVER HANDLER
  // ============================================
  const showGameOverModal = (winner, reason) => {
    console.log('🏁 Game Over:', winner, reason);
    setGameOverModal({
      show: true,
      winner,
      reason
    });
  };

  // Socket initialization (same as before)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      if (!socketService.isConnected()) {
        socketService.connect(token);
      }

      const socket = socketService.getSocket();
      if (socket) {
        setSocketConnected(socket.connected);
        
        socket.on('connect', () => {
          setSocketConnected(true);
        });
        
        socket.on('disconnect', () => {
          setSocketConnected(false);
        });
      }
    } catch (err) {
      console.error('Socket initialization failed:', err);
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [navigate]);

  // Load game & join socket room
  useEffect(() => {
    if (gameId) {
      fetchGame();
      
      // Join socket room for real-time updates
      if (socketConnected) {
        try {
          socketService.joinGame(gameId);
          setupSocketListeners();
        } catch (err) {
          console.error('Failed to join socket room:', err);
        }
      }

      let pollInterval;
      if (game && !game.isBot && game.status === 'active') {
        pollInterval = setInterval(() => {
          if (!socketConnected) {
            fetchGame();
          }
        }, 5000);
      }

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (socketConnected && gameId) {
          try {
            socketService.leaveGame(gameId);
          } catch (err) {
            console.error('Failed to leave socket room:', err);
          }
        }
      };
    }
  }, [gameId, socketConnected, game?.isBot]);

  // Socket event handlers
  const setupSocketListeners = () => {
    try {
      socketService.onMoveMade(({ playerId }) => {
        if (playerId !== user.id) {
          fetchGame();
          setTimeoutWarning(null);
          setRemainingTime(null);
        }
      });

      socketService.onGameStateUpdate((gameData) => {
        setGame(gameData);
        chess.load(gameData.fen);
        setPosition(gameData.fen);
      });

      // ✅ TIMEOUT HANDLER - USE MODAL
      socketService.getSocket().on('game:timeout', (data) => {
        console.log('⏰ Game timed out:', data);
        
        const myColor = getPlayerColor();
        let winner;
        
        if (data.winner === myColor) {
          winner = 'You';
        } else if (game.isBot) {
          winner = 'Stockfish';
        } else {
          winner = data.winner === 'white' 
            ? game.players.white?.username 
            : game.players.black?.username;
        }
        
        showGameOverModal(winner, data.message);
      });

      socketService.getSocket().on('game:timeout-warning', (data) => {
        const myColor = getPlayerColor();
        if (data.currentPlayer === myColor) {
          setTimeoutWarning(data.message);
          setRemainingTime(data.remainingTime);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Your turn!', {
              body: `You have ${Math.ceil(data.remainingTime / 1000)} seconds to move!`,
              icon: '/chess-pawn.svg'
            });
          }
        }
      });

      socketService.getSocket().on('game:timeout-warning-cleared', () => {
        setTimeoutWarning(null);
        setRemainingTime(null);
      });

    } catch (err) {
      console.error('Failed to setup socket listeners:', err);
    }
  };

  // Cleanup timeout listeners
  useEffect(() => {
    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('game:timeout-warning');
        socket.off('game:timeout');
        socket.off('game:timeout-warning-cleared');
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (remainingTime && timeoutWarning) {
      const interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1000) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeoutWarning, remainingTime]);

  const fetchGame = async () => {
    try {
      setError(null);
      const response = await gameAPI.getGame(gameId);
      const gameData = response.data.game;

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
  // 🎯 HANDLE MOVE - WITH MODAL INTEGRATION
  // ============================================
  const handleMove = async (from, to) => {
    const move = { from, to, promotion: 'q' };
    
    const testChess = new Chess(position);
    const testMove = testChess.move(move);
    
    if (!testMove) {
      console.error('❌ Invalid move locally:', move);
      return; // Silent fail for better UX
    }

    try {
      if (game.isBot) {
        setBotThinking(true);
      }

      let response;
      if (game.isBot) {
        response = await gameAPI.makeBotMove(gameId, move);
      } else {
        response = await gameAPI.makeMove(gameId, move);
        
        if (socketConnected) {
          socketService.notifyMove(gameId, move);
        }
      }
      
      const newGame = response.data.game;
      setGame(newGame);
      chess.load(newGame.fen);
      setPosition(newGame.fen);

      // ✅ CHECK ALERT - Only for non-checkmate checks
      if (response.data.gameStatus.isCheck && !response.data.gameStatus.isCheckmate) {
        setTimeout(() => {
          const playerInCheck = newGame.currentTurn;
          const myColor = getPlayerColor();
          
          if (playerInCheck === myColor) {
            // Optional: Could use a toast notification instead
            const audio = new Audio('/check-sound.mp3'); // Add sound effect
            audio.play().catch(() => {}); // Silent fail if no sound
          }
        }, 300);
      }

      // ✅ CHECKMATE - USE MODAL INSTEAD OF ALERT
      if (response.data.gameStatus.isCheckmate) {
        setTimeout(() => {
          let winnerName = 'Unknown';
          
          if (game.isBot) {
            const myColor = getPlayerColor();
            const winnerColor = newGame.currentTurn === 'white' ? 'black' : 'white';
            winnerName = myColor === winnerColor ? 'You' : 'Stockfish';
          } else {
            const winnerId = newGame.winner?._id || newGame.winner;
            
            if (winnerId) {
              if (winnerId.toString() === user.id) {
                winnerName = 'You';
              } else {
                if (newGame.players.white?._id?.toString() === winnerId.toString()) {
                  winnerName = newGame.players.white.username;
                } else if (newGame.players.black?._id?.toString() === winnerId.toString()) {
                  winnerName = newGame.players.black.username;
                }
              }
            }
          }
          
          // ✅ SHOW MODAL INSTEAD OF ALERT
          showGameOverModal(winnerName, 'Checkmate! Game over.');
        }, 500);
      } 
      // ✅ DRAW - USE MODAL
      else if (response.data.gameStatus.isDraw) {
        setTimeout(() => {
          let drawReason = 'Stalemate';
          if (chess.isInsufficientMaterial()) drawReason = 'Insufficient material';
          if (chess.isThreefoldRepetition()) drawReason = 'Threefold repetition';
          
          showGameOverModal('Draw', drawReason);
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error making move:', error);
      // Show error as toast/snackbar instead of alert
      setError(error.response?.data?.message || 'Invalid move');
      setTimeout(() => setError(null), 3000);
      fetchGame();
    } finally {
      setBotThinking(false);
    }
  };

  // ============================================
  // 🎯 RESIGN - USE MODAL INSTEAD OF ALERT
  // ============================================
  const handleResign = async () => {
    if (!window.confirm('Are you sure you want to resign?')) return;
    
    try {
      await gameAPI.resignGame(gameId);
      
      // Determine opponent's name
      let opponentName;
      if (game.isBot) {
        opponentName = 'Stockfish';
      } else {
        const myColor = getPlayerColor();
        opponentName = myColor === 'white' 
          ? game.players.black?.username 
          : game.players.white?.username;
      }
      
      // ✅ SHOW MODAL INSTEAD OF ALERT + NAVIGATE
      showGameOverModal(opponentName, 'You resigned from the game.');
    } catch (error) {
      console.error('❌ Error resigning:', error);
      setError('Failed to resign. Please try again.');
    }
  };

  // ============================================
  // 🎯 ABORT - USE MODAL
  // ============================================
  const handleAbort = async () => {
    if (!window.confirm('Abort this game? (No rating change)')) return;
    
    try {
      await gameAPI.abortGame(gameId);
      showGameOverModal('Draw', 'Game aborted (no rating change).');
    } catch (error) {
      console.error('❌ Error aborting:', error);
      setError(error.response?.data?.message || 'Cannot abort game');
    }
  };

  // Error state
  if (error && !gameOverModal.show) {
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

  // Loading state
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
        
        {/* Timeout Warning Banner */}
        {timeoutWarning && remainingTime > 0 && (
          <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <p className="text-red-500 font-bold text-lg">
                  ⏰ TIME WARNING!
                </p>
                <p className="text-red-400 text-sm">
                  You have {Math.ceil(remainingTime / 1000)} seconds to make a move!
                </p>
              </div>
              <div className="text-3xl font-bold text-red-500 tabular-nums">
                {Math.ceil(remainingTime / 1000)}s
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2">
            <Badge variant={socketConnected ? 'default' : 'secondary'}>
              {socketConnected ? (
                <>
                  <Wifi className="mr-1 h-3 w-3" />
                  Real-time
                </>
              ) : (
                <>
                  <WifiOff className="mr-1 h-3 w-3" />
                  Polling
                </>
              )}
            </Badge>

            {game.isBot && (
              <Badge variant="outline">
                <Bot className="mr-1 h-3 w-3" />
                Bot Game
              </Badge>
            )}
          </div>

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
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {game.status === 'active' && (
              <div className="space-y-2">
                {canAbort ? (
                  <Button onClick={handleAbort} variant="outline" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    Abort Game
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

            {/* Chat Panel */}
            {socketConnected && !game.isBot && (
              <ChatPanel 
                gameId={gameId} 
                currentUser={user.username}
              />
            )}
          </div>
        </div>

        {/* ✅ GAME OVER MODAL - HANDLES ALL ENDINGS */}
        <GameOverModal 
          show={gameOverModal.show}
          winner={gameOverModal.winner}
          reason={gameOverModal.reason}
          onClose={() => navigate('/')}
        />
      </div>
    </div>
  );
};

export default Game;