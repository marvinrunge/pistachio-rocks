import { useState, useCallback, Dispatch, SetStateAction, useRef } from 'react';
import type { AchievementState, AchievementType, AchievementNotification } from '../types';
import { playAchievementCompleteSound } from '../utils/audio';
import { RAIN_DANCER_TARGET, ROCK_BREAKER_TARGET, SHELL_RECOVERY_TARGET } from '../constants';

interface UseAchievementSystemProps {
    setNotifications: Dispatch<SetStateAction<AchievementNotification[]>>;
    spawnHealingFountain: (amount: number) => void;
    armSeismicSlam: () => void;
    triggerReinforcedShell: () => void;
}

const getInitialAchievements = (): AchievementState[] => [
    {
        id: 'rainDancer',
        title: 'Rain Dancer',
        progress: 0,
        target: RAIN_DANCER_TARGET,
        level: 1,
        isCompleted: false,
        icon: '🌧️'
    },
    {
        id: 'rockBreaker',
        title: 'Rock Breaker',
        progress: 0,
        target: ROCK_BREAKER_TARGET,
        level: 1,
        isCompleted: false,
        icon: '🔨'
    },
    {
        id: 'shellEvader',
        title: 'Escape The Reaper',
        progress: 0,
        target: SHELL_RECOVERY_TARGET,
        level: 1,
        isCompleted: false,
        icon: '👻'
    }
];

export const useAchievementSystem = ({ setNotifications, spawnHealingFountain, armSeismicSlam, triggerReinforcedShell }: UseAchievementSystemProps) => {
    const [achievements, setAchievements] = useState<AchievementState[]>(getInitialAchievements());
    const achievementsRef = useRef<AchievementState[]>(getInitialAchievements());

    const checkAchievementProgress = useCallback((achievementId: AchievementType, amount: number = 1) => {
        const currentAchievements = achievementsRef.current;
        const achievementIndex = currentAchievements.findIndex(q => q.id === achievementId);

        if (achievementIndex === -1) return;

        const achievement = currentAchievements[achievementIndex];
        const newProgress = achievement.progress + amount;
        const updatedAchievements = [...currentAchievements];

        if (newProgress >= achievement.target) {
            // Achievement Completed
            playAchievementCompleteSound();

            // Trigger reward
            if (achievementId === 'rainDancer') {
                spawnHealingFountain(achievement.target);
            } else if (achievementId === 'rockBreaker') {
                armSeismicSlam();
            } else if (achievementId === 'shellEvader') {
                triggerReinforcedShell();
            }

            const notificationId = Date.now() + Math.random();
            setNotifications(prev => [...prev, {
                id: notificationId,
                achievementTitle: achievement.title,
                level: achievement.level,
                lifespan: 3.0
            }]);

            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }, 3000);

            // Level up achievement (Target * 2 usually, but not for shellEvader)
            const nextTarget = achievement.id === 'shellEvader' ? achievement.target : achievement.target * 2;
            updatedAchievements[achievementIndex] = {
                ...achievement,
                progress: 0,
                target: nextTarget,
                level: achievement.level + 1
            };
        } else {
            updatedAchievements[achievementIndex] = { ...achievement, progress: newProgress };
        }

        achievementsRef.current = updatedAchievements;
        setAchievements(updatedAchievements);
    }, [setNotifications, spawnHealingFountain, armSeismicSlam, triggerReinforcedShell]);

    const resetAchievements = useCallback(() => {
        const initial = getInitialAchievements();
        setAchievements(initial);
        achievementsRef.current = initial;
    }, []);

    return {
        achievements,
        checkAchievementProgress,
        resetAchievements
    };
};
