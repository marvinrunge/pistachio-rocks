import React, { useState, useEffect, useRef } from 'react';
import type { Skill, Season, HighScoreEntry, SubmissionResult, CharacterId, GameStatus, PlayerState } from '../types';
import { MAX_PLAYER_SPEED, GAME_VERSION, ARCHIVED_GAME_VERSIONS } from '../constants';
import { loadPlayerName } from '../utils/storage';
import { assetManager } from '../game/assets';
// FIX: Corrected import path for characters module.
import { CHARACTERS, getCharacterById } from '../game/characters/index';

interface GameUIProps {
  status: GameStatus;
  health: number;
  maxHealth: number;
  score: number;
  difficultyLevel: number; // This now represents the month number for display purposes
  timeInMonth: number;
  onStart: () => void;
  availableSkills: Skill[];
  onSelectSkill: (skillId: string) => void;
  season: Season;
  rocksDestroyed: number;
  playerSpeed: number;
  highScores: HighScoreEntry[];
  onSaveScore: (name: string) => Promise<void>;
  onShowHighScores: () => void;
  onShowInstructions: () => void;
  onShowAbout: () => void;
  onBackToMenu: () => void;
  extraLives: number;
  acquiredSkills: Skill[];
  leaderboardState: 'idle' | 'loading' | 'submitting' | 'error';
  lastSubmissionResult: SubmissionResult | null;
  characterId: CharacterId;
  onShowCharacterSelect: () => void;
  onSelectCharacter: (characterId: CharacterId) => void;
  onStartDebugGame: (year: number, month: number) => void;
  onFetchVersionScores: (version: string) => void;
  gameVersion: string;
  archivedVersions: string[];
  assetsReady: boolean;
}

const HealthBar: React.FC<{ health: number, maxHealth: number }> = ({ health, maxHealth }) => {
  const percentage = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
  let barColor = 'bg-red-500';
  if (percentage > 25) barColor = 'bg-yellow-500';
  if (percentage > 60) barColor = 'bg-green-500';
  
  return (
    <div className="relative w-40 sm:w-48 h-6 bg-gray-700 border-2 border-black rounded-full overflow-hidden">
      <div 
        className={`h-full ${barColor} transition-all duration-200`}
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
        {Math.round(health)} / {maxHealth}
      </div>
    </div>
  );
};

const BigButton: React.FC<{ onClick?: (e?: React.MouseEvent) => void, children: React.ReactNode, className?: string, disabled?: boolean, type?: 'button' | 'submit' | 'reset' }> = ({ onClick, children, className = '', disabled = false, type = 'button' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`text-white font-bold py-2 px-4 sm:py-3 sm:px-6 border-b-4 rounded-lg text-lg sm:text-2xl transition-transform transform hover:scale-105 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
    >
        {children}
    </button>
);

type StatProps = Pick<HighScoreEntry, 'score' | 'year' | 'month' | 'rocksDestroyed' | 'maxHealth' | 'finalSpeed' | 'characterId'> & {
    acquiredSkills?: Skill[];
};

const formatSurvivalTime = (year: number, month: number) => {
    const totalMonths = year * 12 + month;
    if (totalMonths === 0) return "0 months";

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const yearString = years > 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : '';
    const monthString = months > 0 ? `${months} ${months === 1 ? 'month' : 'months'}` : '';

    if (yearString && monthString) return `${yearString}, ${monthString}`;
    return yearString || monthString;
};

const GREEN_BUTTON_CLASSES = "bg-lime-500 border-lime-700 hover:bg-lime-600 hover:border-lime-800";

const GRAY_BUTTON_CLASSES = "bg-gray-500 border-orange-300 hover:bg-gray-600 hover:border-orange-200";
  
const StatsDisplay: React.FC<{ stats: StatProps }> = ({ stats }) => {
    const speedPercentage = Math.round((stats.finalSpeed / MAX_PLAYER_SPEED) * 100);
    const character = stats.characterId ? getCharacterById(stats.characterId) : null;
    
    const aggregatedSkills = stats.acquiredSkills?.reduce((acc, skill) => {
        if (acc[skill.id]) {
            acc[skill.id].count++;
        } else {
            acc[skill.id] = { skill, count: 1 };
        }
        return acc;
    }, {} as Record<string, { skill: Skill, count: number }>);

    const skillsToDisplay = aggregatedSkills ? Object.values(aggregatedSkills) : [];

    return (
        <div className="text-base sm:text-lg mb-6 w-full text-left bg-gray-900 p-3 sm:p-4 rounded-md">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <span className="font-bold text-gray-400">Final Score:</span><span className="text-white font-bold">{Math.floor(stats.score)}</span>
                <span className="font-bold text-gray-400">Survived For:</span><span className="text-white whitespace-nowrap">{formatSurvivalTime(stats.year, stats.month)}</span>
                {character && <><span className="font-bold text-gray-400">Character:</span><span className="text-white">{character.name}</span></>}
                <span className="font-bold text-gray-400">Rocks Smashed:</span><span className="text-white">{stats.rocksDestroyed}</span>
                <span className="font-bold text-gray-400">Max Shell HP:</span><span className="text-white">{stats.maxHealth}</span>
                <span className="font-bold text-gray-400">Final Speed:</span><span className="text-white">{speedPercentage}%</span>
            </div>
            {skillsToDisplay.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="font-bold text-gray-400 mb-2">Skills Acquired:</h4>
                    <div className="flex flex-wrap gap-2">
                        {skillsToDisplay.map(({ skill, count }) => (
                            <span key={skill.id} className={`text-sm font-semibold px-2 py-1 rounded-md bg-gray-800 ${skill.color}`}>
                                {skill.title} {count > 1 && `x${count}`}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const StartMenu: React.FC<{ onStart: () => void; onShowHighScores: () => void; onShowInstructions: () => void; onShowCharacterSelect: () => void; onShowAbout: () => void; onShowDebug: () => void; assetsReady: boolean; }> = ({ onStart, onShowHighScores, onShowInstructions, onShowCharacterSelect, onShowAbout, onShowDebug, assetsReady }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto">
            <div className="bg-gray-800/80 backdrop-blur-sm border-4 border-black p-4 sm:p-8 rounded-lg text-center shadow-lg w-full max-w-md mx-4">
                <h2 className="text-4xl sm:text-6xl font-bold mb-6 sm:mb-8 text-lime-300" style={{ textShadow: '2px 2px 4px #1a2e05' }}>Pistachio</h2>

                <div className="flex flex-col space-y-4">
                    <BigButton onClick={onStart} disabled={!assetsReady} className={GREEN_BUTTON_CLASSES}>
                        {assetsReady ? 'Start Game' : 'Loading...'}
                    </BigButton>
                    <BigButton onClick={onShowCharacterSelect} disabled={!assetsReady} className={GRAY_BUTTON_CLASSES}>
                        {assetsReady ? 'Change Character' : 'Loading...'}
                    </BigButton>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <BigButton onClick={onShowHighScores} className={`text-lg sm:text-xl ${GRAY_BUTTON_CLASSES}`}>High Scores</BigButton>
                        <BigButton onClick={onShowInstructions} className={`text-lg sm:text-xl ${GRAY_BUTTON_CLASSES}`}>How to Play</BigButton>
                        <BigButton onClick={onShowAbout} className={`text-lg sm:text-xl ${GRAY_BUTTON_CLASSES} col-span-2`}>About & Support</BigButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PREVIEW_CANVAS_WIDTH = 150;
const PREVIEW_CANVAS_HEIGHT = 120;

const CharacterPreview: React.FC<{ characterId: CharacterId; assetsReady: boolean }> = ({ characterId, assetsReady }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // FIX: Initialize useRef with null to satisfy TypeScript's overload resolution, which expects an initial value.
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        if (!assetsReady) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const character = getCharacterById(characterId);
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = PREVIEW_CANVAS_WIDTH * dpr;
        canvas.height = PREVIEW_CANVAS_HEIGHT * dpr;
        canvas.style.width = `${PREVIEW_CANVAS_WIDTH}px`;
        canvas.style.height = `${PREVIEW_CANVAS_HEIGHT}px`;
        ctx.scale(dpr, dpr);

        let startTime: number | null = null;
        const loop = (time: number) => {
            if (startTime === null) {
                startTime = time;
            }
            ctx.clearRect(0, 0, PREVIEW_CANVAS_WIDTH, PREVIEW_CANVAS_HEIGHT);
            const hoverOffset = Math.sin(time / 400) * 4;
            
            const mockPlayer: PlayerState = {
                x: 0, y: 0, yVelocity: 0, xVelocity: 0,
                health: 999,
                isNaked: false,
                characterId: character.id,
            };

            const scale = Math.min(
                PREVIEW_CANVAS_WIDTH / character.hitbox.shelled.width,
                PREVIEW_CANVAS_HEIGHT / character.hitbox.shelled.height
            ) * 0.9; // Use 90% of available space for padding

            ctx.save();

            const scaledWidth = character.hitbox.shelled.width * scale;
            const scaledHeight = character.hitbox.shelled.height * scale;
            
            ctx.translate(
                (PREVIEW_CANVAS_WIDTH - scaledWidth) / 2,
                (PREVIEW_CANVAS_HEIGHT - scaledHeight) / 2 - hoverOffset
            );
            ctx.scale(scale, scale);
            
            // The character.draw function expects the top-left coordinate.
            // Since we've translated the canvas origin and scaled it, we can draw at (0, 0).
            character.draw(ctx, 0, 0, mockPlayer, null, mockPlayer.health, null);
            
            ctx.restore();
            
            animationFrameId.current = requestAnimationFrame(loop);
        };

        animationFrameId.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameId.current !== null) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [characterId, assetsReady]);

    if (!assetsReady) {
        return <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Loading...</div>;
    }

    return <canvas ref={canvasRef} />;
};


const CharacterSelectMenu: React.FC<{ onSelectCharacter: (id: CharacterId) => void; onBack: () => void, currentCharacterId: CharacterId, assetsReady: boolean }> = ({ onSelectCharacter, onBack, currentCharacterId, assetsReady }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
        <div className="bg-gray-800 border-4 border-black rounded-lg text-center shadow-lg w-full max-w-md lg:max-w-xl flex flex-col max-h-full">
            <h2 className="text-2xl sm:text-4xl font-bold p-4 sm:px-8 sm:pt-8 pb-4 flex-shrink-0">Select Character</h2>
            <div className="overflow-y-auto px-4 sm:px-8 py-4">
                <div className="grid grid-cols-2 gap-4">
                    {CHARACTERS.map(char => (
                        <button
                            key={char.id}
                            onClick={() => onSelectCharacter(char.id)}
                            className={`p-3 rounded-lg border-4 transition-all text-center flex flex-col items-center ${currentCharacterId === char.id ? 'border-lime-500 bg-lime-900/50' : 'border-gray-600 bg-gray-900 hover:bg-gray-700'}`}
                        >
                            <div>
                                <div className="w-full h-[120px] mb-2 rounded-md flex items-center justify-center overflow-hidden">
                                    <CharacterPreview characterId={char.id} assetsReady={assetsReady} />
                                </div>
                                <p className="font-bold text-base sm:text-lg">{char.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-shrink-0 p-4 sm:px-8 sm:pb-8 pt-4">
                 <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Back</BigButton>
            </div>
        </div>
    </div>
);


const InstructionsModal: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
        <div className="bg-gray-800 border-4 border-black rounded-lg text-left shadow-lg w-full max-w-md lg:max-w-2xl text-gray-300 flex flex-col max-h-full">
            <h2 className="flex-shrink-0 text-2xl sm:text-4xl font-bold p-4 sm:px-8 sm:pt-8 pb-4 text-center text-white">How to Play</h2>
            
            <div className="overflow-y-auto px-4 sm:px-8 space-y-4 text-base sm:text-lg">
                <div>
                    <h3 className="font-bold text-lg sm:text-2xl text-lime-400 mb-2">Goal</h3>
                    <p>Survive for as long as possible! Brave the changing seasons and chaotic events like thunderstorms and blizzards. Collect water drops to repair your shell, and smash rocks by jumping into them to score points.</p>
                </div>

                <div>
                    <h3 className="font-bold text-lg sm:text-2xl text-lime-400 mb-2">Controls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900 p-3 sm:p-4 rounded-lg">
                            <h4 className="font-semibold text-base sm:text-xl mb-2 text-white">Keyboard</h4>
                            <ul className="list-disc list-inside">
                                <li><span className="font-bold text-lime-300">A / D</span> or <span className="font-bold text-lime-300">Arrow Keys</span> to move.</li>
                                <li><span className="font-bold text-lime-300">W / Arrow Up / Space</span> to jump.</li>
                            </ul>
                        </div>
                         <div className="bg-gray-900 p-3 sm:p-4 rounded-lg">
                            <h4 className="font-semibold text-base sm:text-xl mb-2 text-white">Touch</h4>
                            <ul className="list-disc list-inside">
                                <li><span className="font-bold text-lime-300">Tap Left/Right</span> side of screen to move.</li>
                                <li><span className="font-bold text-lime-300">Swipe Up</span> to jump.</li>
                            </ul>
                        </div>
                        <div className="bg-gray-900 p-3 sm:p-4 rounded-lg md:col-span-2">
                            <h4 className="font-semibold text-base sm:text-xl mb-2 text-white">Gamepad</h4>
                            <ul className="list-disc list-inside">
                                <li><span className="font-bold text-lime-300">D-Pad / Left Stick</span> to move.</li>
                                <li><span className="font-bold text-lime-300">A / Bottom Face Button</span> to jump.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-lg sm:text-2xl text-lime-400 mb-2">Progression</h3>
                    <p>Survive for 30 seconds to advance to the next month and choose a powerful skill upgrade. Every 3 months, you'll face a dangerous weather event!</p>
                </div>
            </div>
            
            <div className="flex-shrink-0 text-center p-4 sm:px-8 sm:pb-8 pt-4">
                 <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Back</BigButton>
            </div>
        </div>
    </div>
);

const ChangeLogModal: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
        <div className="bg-gray-800 border-4 border-black rounded-lg text-left shadow-lg w-full max-w-md lg:max-w-2xl text-gray-300 flex flex-col max-h-full">
            <h2 className="flex-shrink-0 text-2xl sm:text-4xl font-bold p-4 sm:px-8 sm:pt-8 pb-4 text-center text-white">Changelog</h2>
            
            <div className="overflow-y-auto px-4 sm:px-8 space-y-6 text-base sm:text-lg">
                <div>
                    <h3 className="font-bold text-xl sm:text-2xl text-lime-400 mb-2">Version 0.2.0 - The Graphics & Sound Update</h3>
                    <div className="pl-4">
                        <h4 className="font-semibold text-lg sm:text-xl text-cyan-400 mt-3 mb-1">Art & Visuals</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li><span className="font-bold text-lime-300">Major Character Art Overhaul:</span> Pistachio and Walnut have been completely redesigned with high-quality vector artwork.</li>
                            <li><span className="font-bold text-lime-300">Enhanced Character Previews:</span> The character selection screen now features much larger, more detailed previews.</li>
                            <li><span className="font-bold text-lime-300">Refined Particle Effects:</span> Reduced the number of particles from smashing rocks for a cleaner look.</li>
                            <li><span className="font-bold text-lime-300">Improved Water Effects:</span> Water drops now create a more realistic splash of small, white particles.</li>
                        </ul>
                        <h4 className="font-semibold text-lg sm:text-xl text-cyan-400 mt-4 mb-1">Audio</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li><span className="font-bold text-lime-300">More Audio Variety:</span> Added multiple new rock impact sounds and randomized the pitch of every impact to make the soundscape less repetitive.</li>
                            <li><span className="font-bold text-lime-300">Sound Effect Tuning:</span> Replaced the old deep "thud" sound for a more satisfying and balanced audio experience.</li>
                        </ul>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-xl sm:text-2xl text-gray-400 mb-2">Version 0.1.0</h3>
                    <ul className="list-disc list-inside pl-4 space-y-1">
                        <li>Initial public release of the game.</li>
                    </ul>
                </div>
            </div>
            
            <div className="flex-shrink-0 text-center p-4 sm:px-8 sm:pb-8 pt-4">
                 <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Back</BigButton>
            </div>
        </div>
    </div>
);

const AboutModal: React.FC<{ onBack: () => void; onShowChangelog: () => void; }> = ({ onBack, onShowChangelog }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
        <div className="bg-gray-800 border-4 border-black rounded-lg text-left shadow-lg w-full max-w-md lg:max-w-2xl text-gray-300 flex flex-col max-h-full">
            <h2 className="flex-shrink-0 text-2xl sm:text-4xl font-bold p-4 sm:px-8 sm:pt-8 pb-4 text-center text-white">About Pistachio</h2>
            
            <div className="overflow-y-auto px-4 sm:px-8 space-y-4 text-base sm:text-lg">
                <p>
                    Pistachio is a fast-paced survival arcade game created by Marvin Runge. It's built with React, TypeScript, and Tailwind CSS, featuring procedurally generated audio using the Web Audio API.
                </p>
                <p>
                    The goal is to survive as long as you can against an endless barrage of rocks, while navigating chaotic weather events through the changing seasons. Level up, choose powerful skills, and climb the global leaderboard!
                </p>
                <div className="flex justify-center pt-2">
                    <BigButton onClick={onShowChangelog} className={`text-lg sm:text-xl ${GRAY_BUTTON_CLASSES}`}>View Changelog</BigButton>
                </div>
                <p className="pt-2 text-center">
                    If you enjoy the game, please consider supporting its development. Thank you!
                </p>
                <div className="text-center py-4">
                    <a 
                        href="https://www.paypal.com/paypalme/marvinrunge" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 border-b-4 border-green-800 hover:border-green-700 rounded-lg text-lg sm:text-2xl transition-transform transform hover:scale-105"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
                    >
                        ❤️ Support the Developer
                    </a>
                </div>
            </div>
            
            <div className="flex-shrink-0 text-center p-4 sm:px-8 sm:pb-8 pt-4">
                 <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Back</BigButton>
            </div>
        </div>
    </div>
);


const HighScoreModal: React.FC<{
    scores: HighScoreEntry[],
    onBack: () => void,
    onSelect: (id: number) => void,
    leaderboardState: 'loading' | 'error' | 'idle',
    lastSubmissionResult: SubmissionResult | null,
    onFetchVersionScores: (version: string) => void,
    gameVersion: string,
    archivedVersions: string[]
}> = ({
    scores,
    onBack,
    onSelect,
    leaderboardState,
    lastSubmissionResult,
    onFetchVersionScores,
    gameVersion,
    archivedVersions
}) => {
    const isUserInTopScores = lastSubmissionResult ? scores.some(s => s.id === lastSubmissionResult.userScore.id) : false;
    const [selectedVersion, setSelectedVersion] = useState(gameVersion);

    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVersion = e.target.value;
        setSelectedVersion(newVersion);
        onFetchVersionScores(newVersion);
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
            <div className="bg-gray-800 border-4 border-black rounded-lg text-center shadow-lg w-full max-w-md lg:max-w-2xl flex flex-col max-h-full text-white">
                <div className="flex-shrink-0 p-4 sm:px-8 sm:pt-8 pb-4 flex items-center justify-between">
                    <h2 className="text-2xl sm:text-4xl font-bold">High Scores</h2>
                    <div>
                        <label htmlFor="season-select" className="text-sm font-bold text-gray-400 mr-2">Season:</label>
                        <select
                            id="season-select"
                            value={selectedVersion}
                            onChange={handleVersionChange}
                            className="bg-gray-900 text-white text-base p-2 rounded-md border-2 border-gray-600 focus:border-lime-500 focus:outline-none"
                        >
                            <option value={gameVersion}>Current (v{gameVersion})</option>
                            {archivedVersions.map(v => (
                                <option key={v} value={v}>v{v}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-y-auto px-4 sm:px-8 text-sm sm:text-lg">
                    {leaderboardState === 'loading' && <p className="text-gray-400 my-8">Loading scores...</p>}
                    {leaderboardState === 'error' && <p className="text-red-400 my-4 text-center">Could not load global scores. Showing local fallback.</p>}
                    
                    {leaderboardState !== 'loading' && scores.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b-2 border-gray-600">
                                    <th className="p-1 sm:p-2 w-1/6">Rank</th>
                                    <th className="p-1 sm:p-2 w-3/6">Name</th>
                                    <th className="p-1 sm:p-2 text-right w-1/6">Score</th>
                                    <th className="p-1 sm:p-2 text-right w-1/6">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                            {scores.map((score, index) => (
                                <tr key={score.id} className={`border-b border-gray-700 last:border-b-0 hover:bg-gray-700 ${lastSubmissionResult?.userScore.id === score.id ? 'bg-lime-900/50' : ''}`}>
                                    <td className="p-1 text-white sm:p-2 font-bold">{index + 1}</td>
                                    <td className="p-1 text-white sm:p-2 truncate">{score.name}</td>
                                    <td className="p-1 text-white sm:p-2 text-right font-semibold">{Math.floor(score.score)}</td>
                                    <td className="p-1 sm:p-2 text-right">
                                        <button onClick={() => onSelect(score.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {lastSubmissionResult && !isUserInTopScores && (
                                <>
                                    {lastSubmissionResult.rank > scores.length + 1 && (
                                        <tr className="border-b border-gray-700">
                                            <td colSpan={4} className="p-1 sm:p-2 text-center text-gray-500">...</td>
                                        </tr>
                                    )}
                                    <tr className="border-b border-gray-700 last:border-b-0 bg-lime-900/50">
                                        <td className="p-1 text-white sm:p-2 font-bold">{lastSubmissionResult.rank}</td>
                                        <td className="p-1 text-white sm:p-2 truncate">{lastSubmissionResult.userScore.name}</td>
                                        <td className="p-1 text-white sm:p-2 text-right font-semibold">{Math.floor(lastSubmissionResult.userScore.score)}</td>
                                        <td className="p-1 text-white sm:p-2 text-right">
                                            <button onClick={() => onSelect(lastSubmissionResult.userScore.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                </>
                            )}
                            </tbody>
                        </table>
                    ) : leaderboardState !== 'loading' && (
                        <p className="text-gray-400 my-8">No high scores yet. Be the first!</p>
                    )}
                </div>
                <div className="flex-shrink-0 p-4 sm:px-8 sm:pb-8 pt-4">
                     <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Back</BigButton>
                </div>
            </div>
        </div>
    );
};

const HighScoreDetailModal: React.FC<{ score: HighScoreEntry, onBack: () => void }> = ({ score, onBack }) => (
     <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
        <div className="bg-gray-800 border-4 border-black rounded-lg text-center shadow-lg w-full max-w-md flex flex-col max-h-full text-white">
            <h2 className="text-xl sm:text-3xl font-bold p-4 sm:p-6 pb-2 flex-shrink-0">{score.name}'s Run</h2>
            <div className="overflow-y-auto px-4 sm:px-6 py-2">
                <StatsDisplay stats={{...score, finalSpeed: score.finalSpeed}} />
            </div>
            <div className="p-4 sm:p-6 pt-2 flex-shrink-0">
                <BigButton onClick={onBack} className={`${GRAY_BUTTON_CLASSES} w-full`}>Back</BigButton>
            </div>
        </div>
    </div>
);


const GameOverModal: React.FC<{ score: number, onSave: (name: string) => Promise<void>, finalStats: StatProps, leaderboardState: 'submitting' | 'idle' | 'error' }> = ({ score, onSave, finalStats, leaderboardState }) => {
    const [name, setName] = useState('');
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        const previousName = loadPlayerName();
        if (previousName) {
            setName(previousName);
        }
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);

    const handleShare = async () => {
        if (!navigator.share) return;

        const shareText = `I survived for ${formatSurvivalTime(finalStats.year, finalStats.month)} in Pistachio and scored ${Math.floor(finalStats.score)} points! Can you beat my score?`;
        
        try {
            await navigator.share({
                title: 'My Pistachio High Score!',
                text: shareText,
                url: 'https://pistachio-899228832025.us-west1.run.app/',
            });
        } catch (error) {
            console.error('Error sharing score:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (name.trim() && leaderboardState !== 'submitting') {
            await onSave(name.trim());
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
            <div className="bg-gray-800 border-4 border-black rounded-lg text-center shadow-lg w-full max-w-md flex flex-col max-h-full">
                <h2 className="text-2xl sm:text-4xl font-bold p-4 sm:p-6 pb-2 flex-shrink-0">Game Over</h2>
                <div className="overflow-y-auto px-4 sm:px-6 py-4">
                    <StatsDisplay stats={finalStats} />
                    <form onSubmit={handleSubmit} className="mt-4">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={12}
                            placeholder="Enter your name"
                            className="bg-gray-900 text-white text-base sm:text-xl p-2 sm:p-3 rounded-md w-full mb-4 border-2 border-gray-600 focus:border-lime-500 focus:outline-none"
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <BigButton
                                className={GREEN_BUTTON_CLASSES}
                                type="submit" onClick={handleSubmit} disabled={leaderboardState === 'submitting' || !name.trim()}>
                                {leaderboardState === 'submitting' ? 'Saving...' : 'Save Score'}
                            </BigButton>
                            <BigButton
                                type="button"
                                onClick={handleShare}
                                disabled={!canShare}
                                className={GRAY_BUTTON_CLASSES}
                            >
                                Share Score
                            </BigButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const LevelUpModal: React.FC<{ skills: Skill[], onSelect: (skillId: string) => void }> = ({ skills, onSelect }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto p-4">
    <div className="bg-gray-800 border-4 border-black rounded-lg text-center shadow-lg w-full max-w-lg flex flex-col max-h-full">
        <h2 className="text-2xl sm:text-4xl font-bold p-4 sm:p-6 flex-shrink-0">Choose an Upgrade</h2>
        <div className="overflow-y-auto px-4 sm:px-6 py-4 flex flex-col space-y-4">
          {skills.map(skill => (
            <button
              key={skill.id}
              onClick={() => onSelect(skill.id)}
              className={`p-3 sm:p-4 border-2 border-black rounded-lg text-left transition-transform transform hover:scale-105 bg-gray-900 hover:bg-gray-700`}
            >
              <h3 className={`text-base sm:text-xl font-bold ${skill.color}`}>{skill.title}</h3>
              <p className="text-sm sm:text-base text-gray-300">{skill.description}</p>
            </button>
          ))}
        </div>
    </div>
  </div>
);

const DebugMenuModal: React.FC<{ onStart: (year: number, month: number) => void; onBack: () => void; }> = ({ onStart, onBack }) => {
    const [year, setYear] = useState('0');
    const [month, setMonth] = useState('1');
    
    const handleStart = () => {
        const y = Math.max(0, parseInt(year, 10) || 0);
        const m = Math.max(1, Math.min(12, parseInt(month, 10) || 1));
        onStart(y, m - 1);
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-auto p-4 bg-black/50">
            <div className="bg-gray-800 border-4 border-black p-8 rounded-lg text-center shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6">Debug Start</h2>
                <div className="flex items-center justify-center space-x-4 mb-6">
                    <div>
                        <label htmlFor="year-input" className="block mb-2 text-sm font-bold text-gray-400">Year (0+)</label>
                        <input id="year-input" type="number" value={year} onChange={e => setYear(e.target.value)} className="bg-gray-900 text-white w-24 p-2 rounded-md text-center border-2 border-gray-600 focus:border-lime-500 focus:outline-none" min="0" />
                    </div>
                    <div>
                        <label htmlFor="month-input" className="block mb-2 text-sm font-bold text-gray-400">Month (1-12)</label>
                        <input id="month-input" type="number" value={month} onChange={e => setMonth(e.target.value)} className="bg-gray-900 text-white w-24 p-2 rounded-md text-center border-2 border-gray-600 focus:border-lime-500 focus:outline-none" min="1" max="12" />
                    </div>
                </div>
                <div className="flex flex-col space-y-4">
                    <BigButton onClick={handleStart}>Start at Time</BigButton>
                    <BigButton onClick={onBack} className={GRAY_BUTTON_CLASSES}>Cancel</BigButton>
                </div>
            </div>
        </div>
    );
};

const seasonColors: Record<Season, string> = {
    spring: 'text-pink-400',
    summer: 'text-yellow-400',
    autumn: 'text-orange-400',
    winter: 'text-blue-400',
};
const seasonIcons: Record<Season, string> = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️',
};

export const GameUI: React.FC<GameUIProps> = ({ status, health, maxHealth, score, onStart, difficultyLevel, timeInMonth, availableSkills, onSelectSkill, season, rocksDestroyed, playerSpeed, onSaveScore, highScores, onShowHighScores, onShowInstructions, onShowAbout, onBackToMenu, extraLives, acquiredSkills, leaderboardState, lastSubmissionResult, characterId, onShowCharacterSelect, onSelectCharacter, onStartDebugGame, onFetchVersionScores, gameVersion, archivedVersions, assetsReady }) => {
    
    const [selectedHighScoreId, setSelectedHighScoreId] = useState<number | null>(null);
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);

    let selectedHighScore = highScores.find(s => s.id === selectedHighScoreId);
    if (!selectedHighScore && lastSubmissionResult && lastSubmissionResult.userScore.id === selectedHighScoreId) {
        selectedHighScore = lastSubmissionResult.userScore;
    }
    
    if (status === 'start') {
        if (showDebugMenu) {
            return <DebugMenuModal onStart={onStartDebugGame} onBack={() => setShowDebugMenu(false)} />;
        }
        return <StartMenu onStart={onStart} onShowHighScores={onShowHighScores} onShowInstructions={onShowInstructions} onShowCharacterSelect={onShowCharacterSelect} onShowAbout={onShowAbout} onShowDebug={() => setShowDebugMenu(true)} assetsReady={assetsReady} />;
    }
    if (status === 'about') {
        if (showChangelog) {
            return <ChangeLogModal onBack={() => setShowChangelog(false)} />;
        }
        return <AboutModal onBack={onBackToMenu} onShowChangelog={() => setShowChangelog(true)} />;
    }
    if (status === 'characterSelect') return <CharacterSelectMenu onSelectCharacter={onSelectCharacter} onBack={onBackToMenu} currentCharacterId={characterId} assetsReady={assetsReady} />;
    if (status === 'instructions') return <InstructionsModal onBack={onBackToMenu} />;
    if (status === 'highScores') {
        if (selectedHighScore) {
            return <HighScoreDetailModal score={selectedHighScore} onBack={() => setSelectedHighScoreId(null)} />;
        }
        return <HighScoreModal
            scores={highScores}
            onBack={onBackToMenu}
            onSelect={setSelectedHighScoreId}
            leaderboardState={leaderboardState as 'loading' | 'error' | 'idle'}
            lastSubmissionResult={lastSubmissionResult}
            onFetchVersionScores={onFetchVersionScores}
            gameVersion={gameVersion}
            archivedVersions={archivedVersions}
        />;
    }
    if (status === 'levelUp') return <LevelUpModal skills={availableSkills} onSelect={onSelectSkill} />;
    if (status === 'enteringName') {
        const totalMonthsSurvived = difficultyLevel - 1;
        const year = Math.floor(totalMonthsSurvived / 12);
        const month = totalMonthsSurvived % 12;
        const finalStats: StatProps = { score, year, month, rocksDestroyed, maxHealth, finalSpeed: playerSpeed, acquiredSkills, characterId };
        return <GameOverModal score={score} onSave={onSaveScore} finalStats={finalStats} leaderboardState={leaderboardState as 'submitting' | 'idle' | 'error'} />;
    }
    
    const year = Math.floor((difficultyLevel - 1) / 12) + 1;
    const month = ((difficultyLevel - 1) % 12) + 1;
    const timeLeft = 30 - timeInMonth;

    return (
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none">
            {/* Main Stats HUD */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-black/50 p-2 rounded-lg border-2 border-black/30">
                <HealthBar health={health} maxHealth={maxHealth} />
                <div className="flex items-center space-x-2 sm:space-x-4 text-sm sm:text-lg">
                    <span>Score: <span className="font-bold text-yellow-300">{Math.floor(score)}</span></span>
                    <span className="hidden lg:inline">|</span>
                    <span className="hidden lg:inline">Year: <span className="font-bold">{year}</span></span>
                    <span className="hidden md:inline">|</span>
                    <span className="hidden md:inline">Month: <span className="font-bold">{month}</span></span>
                    <span>|</span>
                    <span className={`capitalize font-bold ${seasonColors[season]}`}>{seasonIcons[season]} <span className="hidden sm:inline">{season}</span></span>
                </div>
                <div className="flex items-center space-x-2 text-sm sm:text-lg">
                    {extraLives > 0 && <span>❤️ <span className="font-bold text-yellow-400">x{extraLives}</span></span>}
                    <span>Time Left: <span className="font-bold text-cyan-300">{timeLeft.toFixed(1)}s</span></span>
                </div>
            </div>
        </div>
    );
};