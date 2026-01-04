import { getFunctions, httpsCallable } from 'firebase/functions';
import type { HighScoreEntry, ScorePayload, SubmissionResult } from '../types';

const functions = getFunctions();

const startNewGameSession = httpsCallable(functions, 'start');
const submitScore = httpsCallable(functions, 'submit');
const getHighScores = httpsCallable(functions, 'scores');

export { startNewGameSession, submitScore, getHighScores };