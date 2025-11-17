import { LEADERBOARD_API_URL } from '../constants';
import type { HighScoreEntry, ScorePayload, SubmissionResult } from '../types';

/**
 * The backend is a Google Cloud Function with the following logic:
 *
 * /start (POST):
 * - Generates a unique, short-lived gameId (e.g., using UUID).
 * - Stores the gameId with a timestamp and a 'pending' status in Firestore.
 * - Returns { gameId }.
 *
 * /submit (POST):
 * - Receives ScorePayload.
 * - Validates the gameId: checks if it exists, is 'pending', and not expired.
 * - Performs anti-cheat validation.
 * - If valid:
 *   - Saves the score to the 'scores' collection in Firestore.
 *   - Marks the gameId as 'completed' to prevent reuse.
 *   - Calculates the new score's rank by counting higher scores.
 * - Returns { success: true, rank: number, userScore: HighScoreEntry }.
 *
 * /scores (GET?version=1.0.0):
 * - Fetches the top scores from Firestore, ordered by score descending.
 * - Can be filtered by a specific version. Defaults to the latest version if none is provided.
 * - Returns HighScoreEntry[].
 */

/**
 * Starts a new game session with the backend to get a unique ID.
 * @returns A promise that resolves to the game session ID.
 */
export const startNewGameSession = async (): Promise<string> => {
  const response = await fetch(`${LEADERBOARD_API_URL}/start`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to start a new game session.');
  }
  const { gameId } = await response.json();
  return gameId;
};

/**
 * Submits the final score and run details to the backend for validation and saving.
 * @param payload - The details of the completed run.
 * @returns A promise that resolves with the submission result, including the player's rank.
 */
export const submitScore = async (payload: ScorePayload): Promise<SubmissionResult> => {
  const response = await fetch(`${LEADERBOARD_API_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to submit score.' }));
    throw new Error(errorData.message || 'Failed to submit score.');
  }
  return await response.json();
};

/**
 * Fetches the global high scores from the backend.
 * @param version - An optional game version to fetch scores for.
 * @returns A promise that resolves to an array of high score entries.
 */
export const getHighScores = async (version?: string): Promise<HighScoreEntry[]> => {
  const url = new URL(`${LEADERBOARD_API_URL}/scores`);
  if (version) {
    url.searchParams.append('version', version);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch high scores.');
  }
  return await response.json();
};