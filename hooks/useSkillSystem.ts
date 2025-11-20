import { useCallback, Dispatch, SetStateAction } from 'react';
import type React from 'react';
import type { Skill, GameStatus } from '../types';
import { PERMANENT_SKILL_POOL, EVENT_SKILL_POOL, YEARLY_SKILL_POOL } from '../game/skills';
import { GOLDEN_TOUCH_CHANCE_INCREASE } from '../constants';

interface UseSkillSystemProps {
    monthCounter: number;
    difficultyLevel: number;
    availableSkills: Skill[];
    setDifficultyLevel: Dispatch<SetStateAction<number>>;
    setGameStatus: (status: GameStatus) => void;
    setAvailableSkills: Dispatch<SetStateAction<Skill[]>>;
    setAcquiredSkills: Dispatch<SetStateAction<Skill[]>>;
    setIncomingEventTitle: Dispatch<SetStateAction<string | null>>;
    setMonthCounter: Dispatch<SetStateAction<number>>;
    setTimeInMonth: Dispatch<SetStateAction<number>>;
    setMaxHealth: Dispatch<SetStateAction<number>>;
    setMaxSpeed: Dispatch<SetStateAction<number>>;
    setBonusHeal: Dispatch<SetStateAction<number>>;
    setWaterSpawnInterval: Dispatch<SetStateAction<number>>;
    setExtraLives: Dispatch<SetStateAction<number>>;
    setBlockChance: Dispatch<SetStateAction<number>>;
    setPhotosynthesisLevel: Dispatch<SetStateAction<number>>;
    setGoldenTouchChance: Dispatch<SetStateAction<number>>;
    clearEventEffects: () => void;
    resetGameInput: () => void;
    lastFrameTimeRef: React.MutableRefObject<number>;
}

export const useSkillSystem = ({
    monthCounter,
    difficultyLevel,
    availableSkills,
    setDifficultyLevel,
    setGameStatus,
    setAvailableSkills,
    setAcquiredSkills,
    setIncomingEventTitle,
    setMonthCounter,
    setTimeInMonth,
    setMaxHealth,
    setMaxSpeed,
    setBonusHeal,
    setWaterSpawnInterval,
    setExtraLives,
    setBlockChance,
    setPhotosynthesisLevel,
    setGoldenTouchChance,
    clearEventEffects,
    resetGameInput,
    lastFrameTimeRef
}: UseSkillSystemProps) => {

    const applySkillEffect = useCallback((skillId: string) => {
        switch (skillId) {
            case 'shellFortification':
                setMaxHealth(prev => prev + 5);
                break;
            case 'increasedAgility':
                setMaxSpeed(prev => prev + 40);
                break;
            case 'waterAffinity':
                setBonusHeal(prev => prev + 1);
                break;
            case 'soothingRains':
                setWaterSpawnInterval(prev => prev * 0.9);
                break;
            case 'extraLife':
                setExtraLives(prev => prev + 1);
                break;
            case 'blockChance':
                setBlockChance(prev => Math.min(prev + 0.1, 0.9));
                break;
            case 'photosynthesis':
                setPhotosynthesisLevel(prev => prev + 1);
                break;
            case 'goldenTouch':
                setGoldenTouchChance(prev => prev + GOLDEN_TOUCH_CHANCE_INCREASE);
                break;
        }
    }, [setMaxHealth, setMaxSpeed, setBonusHeal, setWaterSpawnInterval, setExtraLives, setBlockChance, setPhotosynthesisLevel, setGoldenTouchChance]);

    const handleLevelUp = useCallback(() => {
        // Reset touch and keyboard states to prevent unwanted movement after skill selection
        resetGameInput();

        setIncomingEventTitle(null);
        const eventJustEnded = (monthCounter - 1) % 3 === 2;

        clearEventEffects();

        const newLevel = difficultyLevel + 1;
        setDifficultyLevel(newLevel);

        setGameStatus('levelUp');

        if (eventJustEnded) {
            // At the end of month 12, 24, 36, etc., offer a powerful yearly skill
            if (monthCounter > 0 && monthCounter % 12 === 0) {
                const shuffled = [...YEARLY_SKILL_POOL].sort(() => 0.5 - Math.random());
                setAvailableSkills(shuffled.slice(0, 3));
            } else {
                // At the end of other event months (3, 6, 9, 15...), offer a special event skill
                const shuffled = [...EVENT_SKILL_POOL].sort(() => 0.5 - Math.random());
                setAvailableSkills(shuffled.slice(0, 3));
            }
        } else {
            // For all other months, offer a standard permanent skill
            const shuffled = [...PERMANENT_SKILL_POOL].sort(() => 0.5 - Math.random());
            setAvailableSkills(shuffled.slice(0, 3));
        }
    }, [difficultyLevel, monthCounter, clearEventEffects, resetGameInput, setIncomingEventTitle, setDifficultyLevel, setGameStatus, setAvailableSkills]);

    const handleSkillSelect = useCallback((skillId: string) => {
        const selectedSkill = availableSkills.find(s => s.id === skillId);
        if (selectedSkill) {
            setAcquiredSkills(prev => [...prev, selectedSkill]);
        }

        applySkillEffect(skillId);

        setMonthCounter(prev => prev + 1);
        setTimeInMonth(0);
        setGameStatus('playing');
        lastFrameTimeRef.current = performance.now();
    }, [availableSkills, applySkillEffect, setAcquiredSkills, setMonthCounter, setTimeInMonth, setGameStatus, lastFrameTimeRef]);

    const simulateSkillsForDebug = useCallback((totalMonths: number) => {
        // Simulate skill acquisition for the skipped months
        for (let i = 1; i <= totalMonths; i++) {
            let pool = PERMANENT_SKILL_POOL;
            // Logic matches handleLevelUp:
            // Month 12, 24, 36... -> Yearly Skill
            // Month 3, 6, 9, 15... -> Event Skill
            // Others -> Permanent Skill
            if (i % 12 === 0) {
                pool = YEARLY_SKILL_POOL;
            } else if (i % 3 === 0) {
                pool = EVENT_SKILL_POOL;
            }

            const skill = pool[Math.floor(Math.random() * pool.length)];

            setAcquiredSkills(prev => [...prev, skill]);
            applySkillEffect(skill.id);
        }
    }, [applySkillEffect, setAcquiredSkills]);

    return {
        handleLevelUp,
        handleSkillSelect,
        simulateSkillsForDebug
    };
};
