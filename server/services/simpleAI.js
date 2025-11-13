const { Chess } = require('chess.js');

class SimpleAI {
  getRandomMove(fen) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    if (moves.length === 0) {
      return null;
    }

    // Pick a random move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    return {
      from: randomMove.from,
      to: randomMove.to,
      promotion: randomMove.promotion || 'q'
    };
  }

  // Slightly smarter - prefer captures and add thinking delay
  async getSmartMove(fen) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    if (moves.length === 0) {
      return null;
    }

    // Add thinking delay (300-800ms) to simulate human thinking
    const thinkingTime = 300 + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    // Prefer captures
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0) {
      const move = captures[Math.floor(Math.random() * captures.length)];
      return {
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      };
    }

    // Otherwise random
    const move = moves[Math.floor(Math.random() * moves.length)];
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q'
    };
  }
}

module.exports = new SimpleAI();