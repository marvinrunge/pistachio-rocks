import { useState, useCallback, Dispatch, SetStateAction, useRef } from 'react';
import type { QuestState, QuestType, QuestNotification } from '../types';
import { playQuestCompleteSound } from '../utils/audio';
import { WATER_HEAL_AMOUNT, RAIN_DANCER_TARGET, ROCK_BREAKER_TARGET } from '../constants';

interface UseQuestSystemProps {
    setNotifications: Dispatch<SetStateAction<QuestNotification[]>>;
    spawnHealingFountain: (amount: number) => void;
    armSeismicSlam: () => void;
}

const INITIAL_QUESTS: QuestState[] = [
    {
        id: 'rainDancer',
        title: 'Rain Dancer',
        progress: 0,
        target: RAIN_DANCER_TARGET,
        level: 1,
        isCompleted: false
    },
    {
        id: 'rockBreaker',
        title: 'Rock Breaker',
        progress: 0,
        target: ROCK_BREAKER_TARGET,
        level: 1,
        isCompleted: false
    }
];

export const useQuestSystem = ({ setNotifications, spawnHealingFountain, armSeismicSlam }: UseQuestSystemProps) => {
    const [quests, setQuests] = useState<QuestState[]>(INITIAL_QUESTS);
    const questsRef = useRef<QuestState[]>(INITIAL_QUESTS);

    const checkQuestProgress = useCallback((questId: QuestType, amount: number = 1) => {
        const currentQuests = questsRef.current;
        const questIndex = currentQuests.findIndex(q => q.id === questId);

        if (questIndex === -1) return;

        const quest = currentQuests[questIndex];
        const newProgress = quest.progress + amount;
        const updatedQuests = [...currentQuests];

        if (newProgress >= quest.target) {
            // Quest Completed
            playQuestCompleteSound();

            // Trigger reward
            if (questId === 'rainDancer') {
                spawnHealingFountain(quest.target);
            } else if (questId === 'rockBreaker') {
                armSeismicSlam();
            }

            const notificationId = Date.now() + Math.random();
            setNotifications(prev => [...prev, {
                id: notificationId,
                questTitle: quest.title,
                level: quest.level,
                lifespan: 3.0
            }]);

            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }, 3000);

            // Level up quest (Target * 2)
            updatedQuests[questIndex] = {
                ...quest,
                progress: 0,
                target: quest.target * 2,
                level: quest.level + 1
            };
        } else {
            updatedQuests[questIndex] = { ...quest, progress: newProgress };
        }

        questsRef.current = updatedQuests;
        setQuests(updatedQuests);
    }, [setNotifications, spawnHealingFountain, armSeismicSlam]);

    return {
        quests,
        checkQuestProgress
    };
};
