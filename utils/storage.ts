import type { HighScoreEntry } from '../types';

const HIGH_SCORE_KEY = 'pistachio-highscores';
const PLAYER_NAME_KEY = 'pistachio-player-name';

/**
 * Loads the high scores from local storage.
 * @returns An array of HighScoreEntry objects, or an empty array if none are found.
 */
export const loadLocalHighScores = (): HighScoreEntry[] => {
  try {
    const scoresJSON = localStorage.getItem(HIGH_SCORE_KEY);
    if (scoresJSON) {
      // Basic validation to ensure it's an array
      const parsed = JSON.parse(scoresJSON);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Failed to load high scores from local storage:", error);
    return [];
  }
  return [];
};

/**
 * Saves the high scores to local storage.
 * @param scores - The array of HighScoreEntry objects to save.
 */
export const saveLocalHighScores = (scores: HighScoreEntry[]): void => {
  try {
    const scoresJSON = JSON.stringify(scores);
    localStorage.setItem(HIGH_SCORE_KEY, scoresJSON);
  } catch (error) {
    console.error("Failed to save high scores to local storage:", error);
  }
};

/**
 * Loads the player's last used name from local storage.
 * @returns The name as a string, or null if not found.
 */
export const loadPlayerName = (): string | null => {
    try {
        return localStorage.getItem(PLAYER_NAME_KEY);
    } catch (error) {
        console.error("Failed to load player name from local storage:", error);
        return null;
    }
};

/**
 * Saves the player's name to local storage.
 * @param name - The player's name.
 */
export const savePlayerName = (name: string): void => {
    try {
        localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch (error) {
        console.error("Failed to save player name to local storage:", error);
    }
};
