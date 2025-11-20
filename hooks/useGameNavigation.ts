import { useCallback } from 'react';
import { GAME_VERSION } from '../constants';
import type { CharacterId } from '../types';

interface UseGameNavigationProps {
    setGameStatus: (status: string) => void;
    setLastSubmissionResult: (result: any) => void;
    handleFetchVersionScores: (version: string) => Promise<void>;
    setSelectedCharacterId: (id: CharacterId) => void;
}

export const useGameNavigation = ({
    setGameStatus,
    setLastSubmissionResult,
    handleFetchVersionScores,
    setSelectedCharacterId,
}: UseGameNavigationProps) => {
    const handleShowHighScores = useCallback(async () => {
        setLastSubmissionResult(null);
        setGameStatus('highScores');
        await handleFetchVersionScores(GAME_VERSION);
    }, [setLastSubmissionResult, setGameStatus, handleFetchVersionScores]);

    const handleShowInstructions = useCallback(() => {
        setGameStatus('instructions');
    }, [setGameStatus]);

    const handleShowAbout = useCallback(() => {
        setGameStatus('about');
    }, [setGameStatus]);

    const handleShowCharacterSelect = useCallback(() => {
        setGameStatus('characterSelect');
    }, [setGameStatus]);

    const handleSelectCharacter = useCallback((characterId: CharacterId) => {
        setSelectedCharacterId(characterId);
        try {
            localStorage.setItem('selectedCharacter', characterId);
        } catch (e) {
            console.warn('Could not save character selection to localStorage.');
        }
        setGameStatus('start');
    }, [setSelectedCharacterId, setGameStatus]);

    const handleBackToMenu = useCallback(() => {
        setLastSubmissionResult(null);
        setGameStatus('start');
    }, [setLastSubmissionResult, setGameStatus]);

    return {
        handleShowHighScores,
        handleShowInstructions,
        handleShowAbout,
        handleShowCharacterSelect,
        handleSelectCharacter,
        handleBackToMenu,
    };
};
