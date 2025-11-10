const express = require('express');
const router = express.Router();
const {
  createGame,
  getGame,
  makeMove,
  getMyGames,
  getActiveGames,
  resignGame,
  createBotGame,    // NEW
  makeBotMove       // NEW
} = require('../controllers/gameController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/create', createGame);
router.post('/create-bot', createBotGame);  // NEW
router.get('/my-games', getMyGames);
router.get('/active', getActiveGames);

router.get('/:id', getGame);
router.post('/:id/move', makeMove);
router.post('/:id/move-bot', makeBotMove);  // NEW
router.post('/:id/resign', resignGame);

module.exports = router;