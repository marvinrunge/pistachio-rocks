import React, { useState, useEffect, useRef } from 'react';
import { GameUI } from './components/GameUI';
import { useGameLogic } from './hooks/useGameLogic';
import { GAME_HEIGHT, GAME_VERSION, ARCHIVED_GAME_VERSIONS } from './constants';
import { toggleMute, getMuted } from './utils/audio';


const App: React.FC = () => {
    const [gameDimensions, setGameDimensions] = useState({ width: 800, height: GAME_HEIGHT });
    const [uiTransform, setUiTransform] = useState({ scale: 1, x: 0, y: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appWrapperRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFullScreenSupported, setIsFullScreenSupported] = useState(false);
    const [isMuted, setIsMuted] = useState(getMuted());

    const gameLogic = useGameLogic({ canvasRef, gameDimensions });

    useEffect(() => {
        const updateScale = () => {
            const canvas = canvasRef.current;
            const container = appWrapperRef.current;
            if (!canvas || !container) return;

            const { clientWidth, clientHeight } = container;

            const scale = clientHeight / GAME_HEIGHT;
            const newGameWidth = clientWidth / scale;

            setGameDimensions({ width: newGameWidth, height: GAME_HEIGHT });

            canvas.width = clientWidth;
            canvas.height = clientHeight;

            setUiTransform({ scale, x: 0, y: 0 });
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        const docEl = document.documentElement as any;
        const isSupported = !!(docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen);
        setIsFullScreenSupported(isSupported);

        const handleFullScreenChange = () => {
            const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('mozfullscreenchange', handleFullScreenChange);
        document.addEventListener('MSFullscreenChange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!isFullScreenSupported) return;

        if (!isFullscreen) {
            const docEl = document.documentElement as any;
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen();
            } else if (docEl.mozRequestFullScreen) { // Firefox
                docEl.mozRequestFullScreen();
            } else if (docEl.webkitRequestFullscreen) { // Chrome, Safari and Opera
                docEl.webkitRequestFullscreen();
            } else if (docEl.msRequestFullscreen) { // IE/Edge
                docEl.msRequestFullscreen();
            }
        } else {
            const doc = document as any;
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.mozCancelFullScreen) { // Firefox
                doc.mozCancelFullScreen();
            } else if (doc.webkitExitFullscreen) { // Chrome, Safari and Opera
                doc.webkitExitFullscreen();
            } else if (doc.msExitFullscreen) { // IE/Edge
                doc.msExitFullscreen();
            }
        }
    };

    const handleToggleMute = () => {
        const newMutedState = toggleMute();
        setIsMuted(newMutedState);
    };

    const isMenuVisible = ['start', 'highScores', 'instructions', 'characterSelect', 'about'].includes(gameLogic.status);

    return (
        <div
            ref={appWrapperRef}
            className="relative w-screen h-screen bg-black font-mono text-white overflow-hidden flex items-center justify-center"
            style={{ touchAction: 'none' }}
            onTouchStart={gameLogic.handleTouchStart}
            onTouchMove={gameLogic.handleTouchMove}
            onTouchEnd={gameLogic.handleTouchEnd}
            onTouchCancel={gameLogic.handleTouchEnd}
        >
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
            />

            <div
                className="absolute top-0 left-0"
                style={{
                    width: gameDimensions.width,
                    height: gameDimensions.height,
                    transform: `scale(${uiTransform.scale})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                    zIndex: 4,
                }}
            >
                <div style={{ pointerEvents: 'auto' }}>
                    <GameUI
                        status={gameLogic.status}
                        health={gameLogic.playerHealth}
                        maxHealth={gameLogic.maxHealth}
                        score={gameLogic.score}
                        onStart={gameLogic.startGame}
                        difficultyLevel={gameLogic.monthCounter}
                        timeInMonth={gameLogic.timeInMonth}
                        availableSkills={gameLogic.availableSkills}
                        onSelectSkill={gameLogic.handleSkillSelect}
                        season={gameLogic.season}
                        rocksDestroyed={gameLogic.rocksDestroyed}
                        playerSpeed={gameLogic.maxSpeed}
                        onSaveScore={gameLogic.handleSaveScore}
                        highScores={gameLogic.highScores}
                        onShowHighScores={gameLogic.handleShowHighScores}
                        onShowInstructions={gameLogic.handleShowInstructions}
                        onShowAbout={gameLogic.handleShowAbout}
                        onBackToMenu={gameLogic.handleBackToMenu}
                        extraLives={gameLogic.extraLives}
                        acquiredSkills={gameLogic.acquiredSkills}
                        leaderboardState={gameLogic.leaderboardState}
                        lastSubmissionResult={gameLogic.lastSubmissionResult}
                        characterId={gameLogic.characterId}
                        onShowCharacterSelect={gameLogic.handleShowCharacterSelect}
                        onSelectCharacter={gameLogic.handleSelectCharacter}
                        onStartDebugGame={gameLogic.startDebugGame}
                        onFetchVersionScores={gameLogic.handleFetchVersionScores}
                        gameVersion={GAME_VERSION}
                        archivedVersions={ARCHIVED_GAME_VERSIONS}
                        assetsReady={gameLogic.assetsReady}
                    />
                </div>
                {gameLogic.incomingEventTitle && (
                    <div className="absolute top-0 left-0 w-full flex justify-center mt-16 pointer-events-none" style={{ zIndex: 60 }}>
                        <h2
                            className="text-3xl sm:text-5xl font-bold text-red-500 animate-warning-pulse text-center px-4"
                            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
                        >
                            {gameLogic.incomingEventTitle}
                        </h2>
                    </div>
                )}

                {gameLogic.questNotifications && gameLogic.questNotifications.map(notification => (
                    <div
                        key={notification.id}
                        className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-300 to-yellow-500 text-black px-6 py-3 rounded-xl shadow-2xl z-50 pointer-events-none flex flex-col items-center border-4 border-white"
                        style={{ animation: 'bounce 0.5s infinite alternate' }}
                    >
                        <div className="text-xs font-black uppercase tracking-widest mb-1">Quest Complete!</div>
                        <div className="text-xl font-bold">{notification.questTitle} <span className="text-2xl ml-1">x{notification.level}</span></div>
                    </div>
                ))}
            </div>

            {isFullScreenSupported && (
                <div className="absolute top-4 right-4 z-50 flex space-x-2">
                    <button
                        onClick={handleToggleMute}
                        className="p-2 bg-black/50 rounded-full hover:bg-black/75 transition-colors"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        )}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-black/50 rounded-full hover:bg-black/75 transition-colors"
                        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;