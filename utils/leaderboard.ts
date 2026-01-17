import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { HighScoreEntry, ScorePayload, SubmissionResult } from '../types';

const startNewGameSession = async () => {
    const callable = httpsCallable<{}, { gameId: string }>(functions, 'start');
    const result = await callable();
    return result.data.gameId;
};

const submitScore = async (payload: ScorePayload) => {
    const callable = httpsCallable<ScorePayload, SubmissionResult>(functions, 'submit');
    const result = await callable(payload);
    return result.data;
};

const getHighScores = async (version: string) => {
    const callable = httpsCallable<{ version: string }, HighScoreEntry[]>(functions, 'scores');
    const result = await callable({ version });
    return result.data;
};

export { startNewGameSession, submitScore, getHighScores };