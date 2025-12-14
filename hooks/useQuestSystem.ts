import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import type { QuestState, QuestType, QuestNotification } from '../types';
import { playQuestCompleteSound } from '../utils/audio';
import { WATER_HEAL_AMOUNT } from '../constants';

interface UseQuestSystemProps {
    setNotifications: Dispatch<SetStateAction<QuestNotification[]>>;
    spawnHealingFountain: (amount: number) => void;
}

const INITIAL_QUESTS: QuestState[] = [
    {
        id: 'rainDancer',
        title: 'Rain Dancer',
        progress: 0,
        target: 20,
        level: 1,
        isCompleted: false
    }
];

export const useQuestSystem = ({ setNotifications, spawnHealingFountain }: UseQuestSystemProps) => {
    const [quests, setQuests] = useState<QuestState[]>(INITIAL_QUESTS);

    const checkQuestProgress = useCallback((questId: QuestType, amount: number = 1) => {
        setQuests(prevQuests => {
            return prevQuests.map(quest => {
                if (quest.id !== questId) return quest;

                const newProgress = quest.progress + amount;

                if (newProgress >= quest.target) {
                    // Quest Completed
                    playQuestCompleteSound();

                    // Trigger reward
                    if (questId === 'rainDancer') {
                        spawnHealingFountain(quest.target);
                    }

                    const notificationId = Date.now();
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
                    return {
                        ...quest,
                        progress: 0, // Reset progress or keep excess? "collecting 25" implies cumulative, but "level up" usually implies next tier.
                        // Let's reset progress to 0 for the next tier of 40. 
                        // Wait, user said "multiply with 2 for each lvl". 
                        // If I collect 20, next is 40. 
                        // I should keep the total collected? Or reset counters?
                        // Standard patterns: 
                        // 1. Cumulative: 20/20 -> 21/40.
                        // 2. Tiered: 20/20 -> 0/40.
                        // Implementation plan didn't specify, but Tiered is usually cleaner for "Quests". 
                        // Let's go with Tiered (0/40) for now as it makes the "Target" clear.
                        target: quest.target * 2,
                        level: quest.level + 1
                    };
                }

                return { ...quest, progress: newProgress };
            });
        });
    }, [setNotifications, spawnHealingFountain]);

    return {
        quests,
        checkQuestProgress
    };
};
