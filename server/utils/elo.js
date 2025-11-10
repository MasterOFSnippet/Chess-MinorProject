// ELO Rating calculation
const K_FACTOR = 32;

/**
 * Calculate expected score for player A
 */
function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO rating
 */
function calculateNewRating(currentRating, expectedScore, actualScore) {
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
}

/**
 * Update ratings for both players after a game
 */
function updateRatings(whiteRating, blackRating, result) {
  const whiteExpected = getExpectedScore(whiteRating, blackRating);
  const blackExpected = getExpectedScore(blackRating, whiteRating);

  let whiteActual, blackActual;

  if (result === '1-0') {
    whiteActual = 1;
    blackActual = 0;
  } else if (result === '0-1') {
    whiteActual = 0;
    blackActual = 1;
  } else {
    whiteActual = 0.5;
    blackActual = 0.5;
  }

  const newWhiteRating = calculateNewRating(whiteRating, whiteExpected, whiteActual);
  const newBlackRating = calculateNewRating(blackRating, blackExpected, blackActual);

  return {
    whiteRating: newWhiteRating,
    blackRating: newBlackRating,
    whiteChange: newWhiteRating - whiteRating,
    blackChange: newBlackRating - blackRating,
  };
}

module.exports = {
  updateRatings,
  getExpectedScore,
  calculateNewRating,
};