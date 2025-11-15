const { Chess } = require('chess.js');

class SimpleAI {
  // Piece values for evaluation
  pieceValues = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
  };

  // Position bonuses (encourage center control, development)
  positionBonus = {
    'p': [
      0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0
    ],
    'n': [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50
    ],
    'b': [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10, 10, 10, 10, 10, 10, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20
    ]
  };

  getRandomMove(fen) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    if (moves.length === 0) return null;

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    return {
      from: randomMove.from,
      to: randomMove.to,
      promotion: randomMove.promotion || 'q'
    };
  }

  // ✅ ADVANCED: Much stronger AI
  getSmartMove(fen) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    console.log(`🤖 AI evaluating ${moves.length} possible moves...`);
    
    if (moves.length === 0) {
      console.log('⚠️ No moves available!');
      return null;
    }

    // Phase 1: Filter out obviously bad moves
    const safeMoves = this.filterBadMoves(chess, moves);
    const movesToEvaluate = safeMoves.length > 0 ? safeMoves : moves;

    console.log(`✅ ${safeMoves.length} safe moves out of ${moves.length} total`);

    // Phase 2: Evaluate remaining moves
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const move of movesToEvaluate) {
      const score = this.evaluateMove(chess, move);
      
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    // Pick randomly from best moves (adds unpredictability)
    const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    
    console.log(`🎯 AI selected: ${selectedMove.san} (score: ${bestScore.toFixed(1)})`);
    
    return {
      from: selectedMove.from,
      to: selectedMove.to,
      promotion: selectedMove.promotion || 'q'
    };
  }

  // ✅ NEW: Filter out blunders before evaluating
  filterBadMoves(chess, moves) {
    const safeMoves = [];

    for (const move of moves) {
      // Make the move temporarily
      chess.move(move);

      let isSafe = true;

      // Check 1: Don't hang valuable pieces
      if (this.isSquareAttacked(chess, move.to)) {
        const pieceValue = this.pieceValues[move.piece];
        const attackerValue = this.getLowestAttackerValue(chess, move.to);
        
        // If piece is undefended and attacker is cheaper, it's hanging
        if (attackerValue < pieceValue && !this.isSquareDefended(chess, move.to)) {
          isSafe = false;
          console.log(`❌ Filtered ${move.san}: hangs ${move.piece} (${pieceValue}) to ${attackerValue}`);
        }
      }

      // Check 2: Don't allow opponent checkmate in 1
      if (isSafe) {
        const opponentMoves = chess.moves({ verbose: true });
        for (const oppMove of opponentMoves) {
          chess.move(oppMove);
          if (chess.isCheckmate()) {
            isSafe = false;
            console.log(`❌ Filtered ${move.san}: allows checkmate with ${oppMove.san}`);
            chess.undo();
            break;
          }
          chess.undo();
        }
      }

      chess.undo();

      if (isSafe) {
        safeMoves.push(move);
      }
    }

    return safeMoves;
  }

  // Check if a square is attacked by opponent
  isSquareAttacked(chess, square) {
    const opponent = chess.turn() === 'w' ? 'b' : 'w';
    const attacks = chess.moves({ verbose: true, square });
    return attacks.some(m => {
      chess.move(m);
      const isAttacked = chess.isAttacked(square, opponent);
      chess.undo();
      return isAttacked;
    });
  }

  // Get value of cheapest piece attacking a square
  getLowestAttackerValue(chess, square) {
    const attackers = this.getAttackers(chess, square);
    if (attackers.length === 0) return Infinity;
    
    return Math.min(...attackers.map(a => this.pieceValues[a.type]));
  }

  // Get all pieces attacking a square
  getAttackers(chess, square) {
    const board = chess.board();
    const attackers = [];
    const opponent = chess.turn() === 'w' ? 'b' : 'w';

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === opponent) {
          const from = String.fromCharCode(97 + j) + (8 - i);
          const moves = chess.moves({ square: from, verbose: true });
          if (moves.some(m => m.to === square)) {
            attackers.push(piece);
          }
        }
      }
    }

    return attackers;
  }

  // Check if a square is defended by our pieces
  isSquareDefended(chess, square) {
    const us = chess.turn();
    const board = chess.board();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === us) {
          const from = String.fromCharCode(97 + j) + (8 - i);
          const moves = chess.moves({ square: from, verbose: true });
          if (moves.some(m => m.to === square)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  evaluateMove(chess, move) {
    let score = 0;

    // Make the move temporarily
    chess.move(move);

    // 1. Material gain (captures)
    if (move.captured) {
      const captureValue = this.pieceValues[move.captured];
      const pieceValue = this.pieceValues[move.piece];
      
      // Winning exchange (capture higher value piece)
      if (captureValue >= pieceValue) {
        score += captureValue * 2; // Double reward for good captures
      } else {
        score += captureValue * 0.5; // Small reward for bad trades
      }
    }

    // 2. Check/Checkmate detection
    if (chess.isCheckmate()) {
      score += 10000;
    } else if (chess.isCheck()) {
      score += 80;
    }

    // 3. Center control (CRITICAL in opening)
    const moveNum = chess.history().length;
    if (moveNum < 15) {
      const centerSquares = ['d4', 'd5', 'e4', 'e5'];
      const nearCenter = ['c4', 'c5', 'f4', 'f5', 'd3', 'd6', 'e3', 'e6'];
      
      if (centerSquares.includes(move.to)) {
        score += 40;
      } else if (nearCenter.includes(move.to)) {
        score += 20;
      }
    }

    // 4. Piece development in opening
    if (moveNum < 10) {
      const fromRank = parseInt(move.from[1]);
      const toRank = parseInt(move.to[1]);
      
      if (move.piece === 'n' || move.piece === 'b') {
        if ((chess.turn() === 'b' && fromRank === 1 && toRank > 1) ||
            (chess.turn() === 'w' && fromRank === 8 && toRank < 8)) {
          score += 35; // Develop pieces!
        }
      }

      // Penalty for moving queen too early
      if (move.piece === 'q' && moveNum < 8) {
        score -= 40;
      }
    }

    // 5. Castling bonus
    if (move.flags.includes('k') || move.flags.includes('q')) {
      score += 60;
    }

    // 6. Pawn structure
    if (move.piece === 'p') {
      const toRank = parseInt(move.to[1]);
      
      // Encourage pawn advances
      if ((chess.turn() === 'b' && toRank >= 4) || 
          (chess.turn() === 'w' && toRank <= 5)) {
        score += 15;
      }

      // Bonus for passed pawns
      if (this.isPassedPawn(chess, move.to)) {
        score += 30;
      }
    }

    // 7. Mobility bonus (pieces with more moves are better)
    const mobility = chess.moves().length;
    score += mobility * 0.5;

    // 8. King safety
    if (moveNum > 10) {
      const kingSafety = this.evaluateKingSafety(chess);
      score += kingSafety;
    }

    // 9. Position bonus
    const posBonus = this.getPositionBonus(move.piece, move.to, chess.turn());
    score += posBonus * 0.3;

    // Undo the move
    chess.undo();

    return score;
  }

  // Check if pawn is passed (no enemy pawns in front)
  isPassedPawn(chess, square) {
    const file = square[0];
    const rank = parseInt(square[1]);
    const us = chess.turn();
    const board = chess.board();

    const checkRanks = us === 'w' ? Array.from({length: 8 - rank}, (_, i) => rank + i + 1) 
                                   : Array.from({length: rank - 1}, (_, i) => rank - i - 1);

    for (const r of checkRanks) {
      const sq = file + r;
      const piece = chess.get(sq);
      if (piece && piece.type === 'p' && piece.color !== us) {
        return false;
      }
    }

    return true;
  }

  // Evaluate king safety
  evaluateKingSafety(chess) {
    let score = 0;
    const us = chess.turn();
    const board = chess.board();

    // Find our king
    let kingSquare = null;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === us) {
          kingSquare = String.fromCharCode(97 + j) + (8 - i);
          break;
        }
      }
      if (kingSquare) break;
    }

    if (!kingSquare) return 0;

    // Penalty for exposed king
    const kingFile = kingSquare.charCodeAt(0) - 97;
    if (kingFile >= 2 && kingFile <= 5) {
      score -= 20; // King in center is dangerous
    }

    return score;
  }

  // Get position bonus for piece
  getPositionBonus(piece, square, color) {
    if (!this.positionBonus[piece]) return 0;

    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    const index = color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file;

    return this.positionBonus[piece][index] || 0;
  }
}

module.exports = new SimpleAI();