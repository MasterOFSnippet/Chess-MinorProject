import { useState } from 'react';
import './ChessBoard.css';

const ChessBoard = ({ position, onMove, playerColor, isMyTurn }) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

  // Parse FEN to get piece positions
  const parseFEN = (fen) => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const rows = fen.split(' ')[0].split('/');
    
    rows.forEach((row, rowIndex) => {
      let colIndex = 0;
      for (let char of row) {
        if (isNaN(char)) {
          // It's a piece
          board[rowIndex][colIndex] = char;
          colIndex++;
        } else {
          // It's empty squares
          colIndex += parseInt(char);
        }
      }
    });
    
    return board;
  };

  const board = parseFEN(position);

  // Piece Unicode characters
  const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  const getSquareNotation = (row, col) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  };

  const handleSquareClick = (row, col) => {
    if (!isMyTurn) {
      alert("It's not your turn!");
      return;
    }

    const square = getSquareNotation(row, col);
    const piece = board[row][col];

    // If no piece selected, select this piece
    if (!selectedSquare) {
      if (piece) {
        // Check if it's the player's piece
        const isWhitePiece = piece === piece.toUpperCase();
        const canSelect = (playerColor === 'white' && isWhitePiece) || 
                         (playerColor === 'black' && !isWhitePiece);
        
        if (canSelect) {
          setSelectedSquare(square);
          // Here you could calculate possible moves if you want
        }
      }
      return;
    }

    // If same square clicked, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // Try to make a move
    onMove(selectedSquare, square);
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  const isLightSquare = (row, col) => (row + col) % 2 === 0;
  const isSelected = (row, col) => getSquareNotation(row, col) === selectedSquare;

  // Flip board if playing as black
  const displayBoard = playerColor === 'black' ? [...board].reverse().map(row => [...row].reverse()) : board;

  return (
    <div className="chess-board-container">
      <div className="chess-board">
        {displayBoard.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((piece, colIndex) => {
              const actualRow = playerColor === 'black' ? 7 - rowIndex : rowIndex;
              const actualCol = playerColor === 'black' ? 7 - colIndex : colIndex;
              const light = isLightSquare(actualRow, actualCol);
              const selected = isSelected(actualRow, actualCol);

              return (
                <div
                  key={colIndex}
                  className={`square ${light ? 'light' : 'dark'} ${selected ? 'selected' : ''} ${!isMyTurn ? 'disabled' : ''}`}
                  onClick={() => handleSquareClick(actualRow, actualCol)}
                >
                  {piece && (
                    <span className={`piece ${piece === piece.toUpperCase() ? 'white-piece' : 'black-piece'}`}>
                      {pieceSymbols[piece]}
                    </span>
                  )}
                  {/* Coordinates */}
                  {colIndex === 0 && (
                    <span className="rank-label">{playerColor === 'white' ? 8 - actualRow : actualRow + 1}</span>
                  )}
                  {rowIndex === 7 && (
                    <span className="file-label">
                      {String.fromCharCode(97 + actualCol)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;