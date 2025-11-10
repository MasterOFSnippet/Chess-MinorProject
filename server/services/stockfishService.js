const { spawn } = require('child_process');
const path = require('path');

class StockfishService {
  constructor() {
    this.engine = null;
    this.ready = false;
    this.currentCallback = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Use stockfish binary via spawn
        const stockfishPath = path.join(__dirname, '../node_modules/stockfish.js/stockfish.js');
        
        // Spawn stockfish as a Node.js process
        this.engine = spawn('node', [stockfishPath]);

        this.engine.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Stockfish:', output);

          if (output.includes('readyok')) {
            this.ready = true;
            resolve();
          }

          if (this.currentCallback) {
            this.currentCallback(output);
          }
        });

        this.engine.stderr.on('data', (data) => {
          console.error('Stockfish error:', data.toString());
        });

        this.engine.on('close', (code) => {
          console.log('Stockfish process exited with code', code);
        });

        // Initialize
        this.sendCommand('uci');
        this.sendCommand('isready');

      } catch (error) {
        console.error('Failed to start Stockfish:', error);
        reject(error);
      }
    });
  }

  sendCommand(command) {
    if (this.engine && !this.engine.killed) {
      console.log('Sending to Stockfish:', command);
      this.engine.stdin.write(command + '\n');
    }
  }

  getBestMove(fen, depth = 10, playerRating = 1200) {
    return new Promise((resolve, reject) => {
      if (!this.engine || this.engine.killed) {
        return reject(new Error('Stockfish not running'));
      }

      // Adjust depth based on rating (easier for lower ratings)
      const adjustedDepth = Math.max(3, Math.min(15, Math.floor(playerRating / 150)));
      
      let bestMove = null;
      let timeout;

      this.currentCallback = (output) => {
        if (output.includes('bestmove')) {
          const match = output.match(/bestmove (\w+)/);
          if (match) {
            bestMove = match[1];
            clearTimeout(timeout);
            this.currentCallback = null;
            resolve(bestMove);
          }
        }
      };

      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${adjustedDepth}`);

      // Timeout after 15 seconds
      timeout = setTimeout(() => {
        this.currentCallback = null;
        reject(new Error('Stockfish timeout'));
      }, 15000);
    });
  }

  stop() {
    if (this.engine && !this.engine.killed) {
      this.sendCommand('quit');
      this.engine.kill();
      this.engine = null;
    }
  }
}

// Singleton instance
let stockfishInstance = null;

const getStockfish = async () => {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishService();
    try {
      await stockfishInstance.start();
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      stockfishInstance = null;
      throw error;
    }
  }
  return stockfishInstance;
};

module.exports = { getStockfish };