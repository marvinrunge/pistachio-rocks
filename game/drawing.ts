import type { PlayerState, ElementState, Season, ShellBreakAnimationState, CharacterId, ShellReformAnimationState, BurningPatchState, CloudState, ParticleState, GameStatus, FloatingScoreState, FloatingTextState, LightningStrike, HealingFountainState } from '../types';
import type { Character } from './characters/index';
import { PLAYER_WIDTH, PLAYER_HEIGHT, GAME_HEIGHT, GROUND_HEIGHT } from '../constants';
import { groundDetails } from './state';
import { darken } from './utils';

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, shellBreakAnimation: ShellBreakAnimationState | null, character: Character, maxHealth: number, shellReformAnimation: ShellReformAnimationState | null, isSlowed: boolean) {
    // The character drawing functions expect the top-left coordinate of the shelled character's bounding box.
    // We calculate the Y position based on the game's coordinate system (where Y=0 is the ground).
    const playerCanvasY = GAME_HEIGHT - player.y - character.hitbox.shelled.height;
    character.draw(ctx, player.x, playerCanvasY, player, shellBreakAnimation, maxHealth, shellReformAnimation, isSlowed);
}

export function drawRainingElement(ctx: CanvasRenderingContext2D, el: ElementState, season: Season) {
    ctx.save();
    ctx.translate(el.x, el.y);

    if (el.type === 'snow') {
        ctx.translate(el.size / 2, el.size / 2);
        ctx.rotate(el.id % 360 * Math.PI / 180);
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 3; i++) {
            ctx.rotate(60 * Math.PI / 180);
            ctx.fillRect(-el.size * 0.1, -el.size / 2, el.size * 0.2, el.size);
        }
        ctx.shadowBlur = 0;
    } else if (el.type === 'water') {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.strokeStyle = '#add8e6'; // Light blue outline
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const w = el.size;
        const h = el.size * 1.5;
        ctx.moveTo(w / 2, 0);
        ctx.bezierCurveTo(w, h * 0.4, w, h * 0.8, w / 2, h);
        ctx.bezierCurveTo(0, h * 0.8, 0, h * 0.4, w / 2, 0);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(el.size * 0.4, el.size * 0.4, el.size * 0.1, 0, 2 * Math.PI);
        ctx.fill();
    } else if (el.type === 'meteor') {
        ctx.save();
        ctx.translate(el.size / 2, el.size / 2);

        const gradient = ctx.createRadialGradient(0, 0, el.size * 0.1, 0, 0, el.size / 2);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(0.4, '#fef08a'); // yellow
        gradient.addColorStop(0.8, '#f97316'); // orange
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.5)'); // transparent red

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, el.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Trail
        const trailLength = el.size * 2.5;
        const trailGradient = ctx.createLinearGradient(0, 0, 0, -trailLength);
        trailGradient.addColorStop(0, '#f97316');
        trailGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -trailLength);
        ctx.lineWidth = el.size / 2;
        ctx.strokeStyle = trailGradient;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    } else { // rock
        const random = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
        const seed = el.id;

        let mainColor: string;
        switch (season) {
            case 'summer': mainColor = `rgb(${190 + random(seed) * 20}, ${170 + random(seed + 1) * 20}, ${140 + random(seed + 2) * 20})`; break;
            case 'winter': mainColor = `rgb(${220 + random(seed) * 20}, ${225 + random(seed + 1) * 20}, ${230 + random(seed + 2) * 20})`; break;
            default: mainColor = `rgb(${100 + random(seed) * 20}, ${100 + random(seed + 1) * 20}, ${100 + random(seed + 2) * 20})`; break;
        }
        const borderColor = '#4a4a4a'; // Dark grey outline

        ctx.fillStyle = mainColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        ctx.translate(el.size / 2, el.size / 2);
        ctx.rotate(random(seed + 3) * 360 * Math.PI / 180);
        ctx.translate(-el.size / 2, -el.size / 2);

        ctx.beginPath();
        const borderRadius = (random(seed + 4) * 30 + 20) / 100 * el.size;
        ctx.moveTo(borderRadius, 0);
        ctx.lineTo(el.size - borderRadius, 0);
        ctx.arcTo(el.size, 0, el.size, borderRadius, borderRadius);
        ctx.lineTo(el.size, el.size - borderRadius);
        ctx.arcTo(el.size, el.size, el.size - borderRadius, el.size, borderRadius);
        ctx.lineTo(borderRadius, el.size);
        ctx.arcTo(0, el.size, 0, el.size - borderRadius, borderRadius);
        ctx.lineTo(0, borderRadius);
        ctx.arcTo(0, 0, borderRadius, 0, borderRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const gradient = ctx.createLinearGradient(0, 0, el.size, el.size);
        gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    ctx.restore();
}

// Caching system for ground rendering to improve performance
const groundCache = {
    base: {
        canvas: null as HTMLCanvasElement | null,
        key: '',
    },
    foreground: {
        canvas: null as HTMLCanvasElement | null,
        key: '',
    }
};

function getCacheKey(season: Season, currentEvent: string | null, gameWidth: number, scale: number, extra?: any) {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return `${season}-${currentEvent}-${gameWidth}-${scale}-${dpr}-${extra || ''}`;
}

export function drawGroundBase(ctx: CanvasRenderingContext2D, season: Season, currentEvent: string | null, gameWidth: number, burningPatches: BurningPatchState[], timeInMonth?: number, scale: number = 1) {
    const cacheKey = getCacheKey(season, currentEvent, gameWidth, scale);

    if (!groundCache.base.canvas || groundCache.base.key !== cacheKey) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        if (!groundCache.base.canvas) groundCache.base.canvas = document.createElement('canvas');

        // High-DPI scaling
        groundCache.base.canvas.width = gameWidth * scale * dpr;
        groundCache.base.canvas.height = GROUND_HEIGHT * scale * dpr;

        const bCtx = groundCache.base.canvas.getContext('2d');
        if (bCtx) {
            bCtx.scale(scale * dpr, scale * dpr);
            const groundY = 0;
            let grassColors = { from: '#22c55e', to: '#166534' };
            if (season === 'summer' || currentEvent === 'meteorShower') grassColors = { from: '#2a7425ff', to: '#44a12dff' };
            if (season === 'autumn') grassColors = { from: '#f97316', to: '#b45309' };
            if (currentEvent === 'thunderstorm') {
                grassColors.from = darken(grassColors.from, 40);
                grassColors.to = darken(grassColors.to, 40);
            }

            const gradient = bCtx.createLinearGradient(0, 0, 0, GROUND_HEIGHT);
            gradient.addColorStop(0, grassColors.from);
            gradient.addColorStop(1, grassColors.to);
            bCtx.fillStyle = gradient;
            bCtx.fillRect(0, 0, gameWidth, GROUND_HEIGHT);

            if (season === 'winter') {
                bCtx.fillStyle = 'white';
                bCtx.fillRect(0, 0, gameWidth, GROUND_HEIGHT);
                const snowGradient = bCtx.createLinearGradient(0, 0, 0, 15);
                snowGradient.addColorStop(0, 'rgba(150, 150, 200, 0.2)');
                snowGradient.addColorStop(1, 'transparent');
                bCtx.fillStyle = snowGradient;
                bCtx.fillRect(0, 0, gameWidth, 15);

                bCtx.fillStyle = 'rgba(173, 216, 230, 0.2)';
                bCtx.beginPath();
                bCtx.ellipse(gameWidth * 0.25, GROUND_HEIGHT * 0.8, 50, 10, 0, 0, 2 * Math.PI);
                bCtx.fill();
                bCtx.beginPath();
                bCtx.ellipse(gameWidth * 0.75, GROUND_HEIGHT * 0.85, 75, 12, 0, 0, 2 * Math.PI);
                bCtx.fill();
            }
        }
        groundCache.base.key = cacheKey;
    }

    const groundY = GAME_HEIGHT - GROUND_HEIGHT;
    if (groundCache.base.canvas) {
        ctx.drawImage(groundCache.base.canvas, 0, groundY, gameWidth, GROUND_HEIGHT);
    }

    burningPatches.forEach(patch => {
        const alpha = Math.min(1, patch.lifespan / 2.0);
        ctx.globalAlpha = alpha;

        // Scorched earth
        ctx.fillStyle = '#3a2d21';
        ctx.beginPath();
        ctx.ellipse(patch.x + patch.width / 2, groundY + 5, patch.width / 2, 8, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Dynamic Embers
        if (Math.random() > 0.5) {
            const emberX = patch.x + Math.random() * patch.width;
            const emberY = groundY + Math.random() * 10 - 5;
            ctx.fillStyle = ['#f97316', '#fef08a'][Math.floor(Math.random() * 2)];
            ctx.beginPath();
            ctx.arc(emberX, emberY, Math.random() * 2 + 1, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    });

    if (currentEvent === 'blizzard' && timeInMonth !== undefined) {
        const progress = timeInMonth / 30;
        const maxSnowHeight = 40;
        const snowHeight = progress * maxSnowHeight;
        if (snowHeight > 1) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            const startY = groundY;
            const segments = 50;
            let firstY = 0;
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * gameWidth;
                const wave1 = Math.sin(i / 7 + 1) * 5;
                const wave2 = Math.sin(i / 2.5) * 3;
                const y = startY - snowHeight + wave1 + wave2;
                if (i === 0) { firstY = y; ctx.moveTo(0, y); }
                else { ctx.lineTo(x, y); }
            }
            ctx.lineTo(gameWidth, startY);
            ctx.lineTo(0, startY);
            ctx.lineTo(0, firstY);
            ctx.closePath();
            ctx.fill();
        }
    }

    let overlayColor = 'transparent';
    switch (currentEvent) {
        case 'storm': overlayColor = 'rgba(71, 85, 105, 0.4)'; break;
    }
    if (overlayColor !== 'transparent') {
        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);
    }
}

export function drawGroundForeground(ctx: CanvasRenderingContext2D, season: Season, currentEvent: string | null, gameWidth: number, currentFrameTime?: number, scale: number = 1) {
    const cacheKey = getCacheKey(season, currentEvent, gameWidth, scale);

    if (!groundCache.foreground.canvas || groundCache.foreground.key !== cacheKey) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        if (!groundCache.foreground.canvas) groundCache.foreground.canvas = document.createElement('canvas');

        // High-DPI scaling
        groundCache.foreground.canvas.width = gameWidth * scale * dpr;
        groundCache.foreground.canvas.height = (GROUND_HEIGHT + 40) * scale * dpr;

        const fCtx = groundCache.foreground.canvas.getContext('2d');
        if (fCtx) {
            fCtx.scale(scale * dpr, scale * dpr);
            const groundY = 40; // Ground line in the cache canvas

            type GroundItem = {
                y: number;
                draw: (ctx: CanvasRenderingContext2D) => void;
            };

            const items: GroundItem[] = [];

            // 1. Generate Grass Blades (if not winter)
            if (season !== 'winter') {
                const grassCount = Math.floor(gameWidth * 6.0);
                for (let i = 0; i < grassCount; i++) {
                    const seed = (i + 1) * 1234.567;
                    const random = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
                    const x = random(seed) * gameWidth;
                    const y = groundY + random(seed + 1) * GROUND_HEIGHT;
                    const height = random(seed + 2) * 15 + 10;
                    const width = random(seed + 3) * 1.0 + 0.5;
                    const tilt = (random(seed + 4) - 0.5) * 10;

                    let baseHue = 142;
                    if (season === 'summer' || currentEvent === 'meteorShower') baseHue = 110;
                    if (season === 'autumn') baseHue = 30;

                    const hue = baseHue + (random(seed + 5) * 30 - 15);
                    const saturation = 40 + random(seed + 6) * 40;
                    const lightness = 25 + random(seed + 7) * 30;
                    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

                    items.push({
                        y,
                        draw: (c) => {
                            c.fillStyle = color;
                            c.beginPath();
                            c.moveTo(x - width / 2, y);
                            c.quadraticCurveTo(x, y - height, x + tilt, y - height);
                            c.quadraticCurveTo(x + width / 2, y - height / 2, x + width / 2, y);
                            c.fill();
                        }
                    });
                }
            }

            // 2. Generate Flowers (Spring)
            if (season === 'spring') {
                const flowerCount = Math.floor(gameWidth / 6);
                const flowerColors = ['#f87171', '#fbbf24', '#a78bfa', '#f472b6', '#60a5fa', '#ffffff'];
                for (let i = 0; i < flowerCount; i++) {
                    const seed = (i + 1) * 987.654;
                    const random = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
                    const x = random(seed) * gameWidth;
                    const baseY = groundY + random(seed + 1) * GROUND_HEIGHT;
                    const stalkHeight = random(seed + 4) * 15 + 10;
                    const tilt = (random(seed + 5) - 0.5) * 8;
                    const headY = baseY - stalkHeight;
                    const size = random(seed + 2) * 8 + 6;
                    const color = flowerColors[Math.floor(random(seed + 3) * flowerColors.length)];

                    items.push({
                        y: baseY,
                        draw: (c) => {
                            c.strokeStyle = '#064e3b';
                            c.lineWidth = 1.5;
                            c.beginPath();
                            c.moveTo(x, baseY);
                            c.quadraticCurveTo(x, headY + stalkHeight / 2, x + tilt, headY);
                            c.stroke();
                            c.fillStyle = color;
                            c.beginPath();
                            c.arc(x + tilt, headY, size / 2, 0, 2 * Math.PI);
                            c.fill();
                            c.fillStyle = '#052e16';
                            c.beginPath();
                            c.arc(x + tilt, headY, size / 5, 0, 2 * Math.PI);
                            c.fill();
                        }
                    });
                }
            }

            // 3. Generate Leaves (Autumn)
            if (season === 'autumn') {
                groundDetails.autumn.forEach(leaf => {
                    const y = groundY + leaf.y * GROUND_HEIGHT;
                    items.push({
                        y,
                        draw: (c) => {
                            c.save();
                            c.translate(leaf.x * gameWidth, y);
                            c.rotate(leaf.rotation * Math.PI / 180);
                            c.fillStyle = leaf.color;
                            c.globalAlpha = 0.8;
                            c.beginPath();
                            c.ellipse(0, 0, leaf.size / 2, leaf.size * 0.35, 0, 0, 2 * Math.PI);
                            c.fill();
                            c.restore();
                        }
                    });
                });
            }

            // 4. Sort and Draw
            items.sort((a, b) => a.y - b.y);
            items.forEach(item => item.draw(fCtx));
        }
        groundCache.foreground.key = cacheKey;
    }

    if (groundCache.foreground.canvas) {
        ctx.drawImage(groundCache.foreground.canvas, 0, GAME_HEIGHT - GROUND_HEIGHT - 40, gameWidth, GROUND_HEIGHT + 40);
    }
}

export function drawGame(
    ctx: CanvasRenderingContext2D,
    renderContext: { scale: number, offsetX: number, offsetY: number },
    screenShake: { x: number, y: number },
    season: Season,
    currentEvent: string | null,
    gameDimensions: { width: number, height: number },
    clouds: CloudState[],
    burningPatches: BurningPatchState[],
    timeInMonth: number,
    gameState: { player: PlayerState, elements: ElementState[], healingFountains?: HealingFountainState[] },
    particles: ParticleState[],
    gameStatus: GameStatus,
    shellBreakAnimation: ShellBreakAnimationState | null,
    character: Character,
    maxHealth: number,
    shellReformAnimation: ShellReformAnimationState | null,
    floatingScores: FloatingScoreState[],
    floatingTexts: FloatingTextState[],
    lightningStrikes: LightningStrike[],
    screenFlash: number,
    currentFrameTime: number,
    isSlowed: boolean
) {
    const clientWidth = gameDimensions.width * renderContext.scale;
    const clientHeight = gameDimensions.height * renderContext.scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity matrix
    ctx.clearRect(0, 0, clientWidth, clientHeight);

    // Apply global scaling and transformations
    ctx.save();
    ctx.translate(renderContext.offsetX, renderContext.offsetY);
    ctx.scale(renderContext.scale, renderContext.scale);
    ctx.translate(screenShake.x, screenShake.y);

    // Draw Background
    let bgColor = { from: '#87CEEB', to: '#4682B4' };
    if (season === 'summer') bgColor = { from: '#418b9eff', to: '#52b1b8ff' };
    if (season === 'autumn') bgColor = { from: '#fde68a', to: '#fb923c' };
    if (season === 'winter') bgColor = { from: '#e0f2fe', to: '#bae6fd' };
    if (currentEvent === 'thunderstorm' || currentEvent === 'storm') bgColor = { from: '#4b5563', to: '#1f2937' };
    if (currentEvent === 'meteorShower') bgColor = { from: '#1e1b4b', to: '#0c0a09' };
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, bgColor.from);
    gradient.addColorStop(1, bgColor.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);

    // Draw clouds
    clouds.forEach(cloud => {
        ctx.fillStyle = cloud.isStormCloud ? 'rgba(50, 50, 70, 0.7)' : 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(cloud.x + cloud.width / 2, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Draw fog for blizzard
    if (currentEvent === 'blizzard') {
        const fogGradient = ctx.createLinearGradient(0, GAME_HEIGHT, 0, GAME_HEIGHT - GROUND_HEIGHT - 150);
        fogGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);
    }

    drawGroundBase(ctx, season, currentEvent, gameDimensions.width, burningPatches, timeInMonth, renderContext.scale);

    // Draw Healing Fountains
    if (gameState.healingFountains) {
        gameState.healingFountains.forEach(f => {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.fillStyle = '#8899aa';
            ctx.fillRect(0, -10, f.width, 10);
            const time = Date.now() / 1000;
            const waterHeight = Math.sin(time * 5) * 10 + 40;
            const gradient = ctx.createLinearGradient(0, -10, 0, -waterHeight);
            gradient.addColorStop(0, '#3b82f6');
            gradient.addColorStop(1, '#93c5fd');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(10, -10);
            ctx.quadraticCurveTo(f.width / 2, -waterHeight - 20, f.width - 10, -10);
            ctx.fill();
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(f.width / 2 + (Math.random() - 0.5) * 30, -Math.random() * waterHeight, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            const barWidth = 40;
            const barHeight = 6;
            const barY = -waterHeight - 35;
            const percent = Math.max(0, Math.min(1, f.currentCapacity / f.maxCapacity));
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(f.width / 2 - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
            ctx.fillStyle = percent > 0.5 ? '#22c55e' : percent > 0.2 ? '#eab308' : '#ef4444';
            ctx.fillRect(f.width / 2 - barWidth / 2, barY, barWidth * percent, barHeight);
            ctx.restore();
        });
    }

    // Draw elements
    gameState.elements.forEach(el => drawRainingElement(ctx, el, season));

    // Draw particles
    particles.forEach(p => {
        if (p.type === 'leaf') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation || 0) * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.lifespan / 2);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size / 2, p.size * 0.35, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'dust') {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.lifespan);
            ctx.fillRect(p.x, p.y, p.size * 5, p.size / 3);
            ctx.globalAlpha = 1;
        } else if (p.type === 'fire') {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.lifespan);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.lifespan);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });

    if (gameStatus === 'playing') {
        drawPlayer(ctx, gameState.player, shellBreakAnimation, character, maxHealth, shellReformAnimation, isSlowed);

        // Draw Seismic Slam Indicator (Electric Sparks)
        if (gameState.player.seismicSlamReady) {
            ctx.save();
            ctx.translate(gameState.player.x + PLAYER_WIDTH / 2, GAME_HEIGHT - gameState.player.y - PLAYER_HEIGHT / 2);
            const time = Date.now() / 100;
            const radius = 60;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                const offset = (i * Math.PI * 2 / 3) + time;
                let angle = offset;
                let r = radius + Math.sin(time * 5 + i) * 5;
                ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                for (let j = 0; j < 10; j++) {
                    angle += 0.2;
                    r = radius + (Math.random() - 0.5) * 20;
                    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // Draw foreground decorations (grass, flowers, etc.) last to ensure they are in front of the player
    drawGroundForeground(ctx, season, currentEvent, gameDimensions.width, currentFrameTime, renderContext.scale);

    // Draw floating scores and texts
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    floatingScores.forEach(fs => {
        ctx.globalAlpha = fs.lifespan;
        ctx.fillStyle = fs.isGolden ? '#fef08a' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        const text = `+${fs.amount}`;
        const textWidth = ctx.measureText(text).width;
        ctx.strokeText(text, fs.x - textWidth / 2, fs.y);
        ctx.fillText(text, fs.x - textWidth / 2, fs.y);
    });

    ctx.font = 'bold 24px "Press Start 2P", monospace';
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.lifespan;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        const textWidth = ctx.measureText(ft.text).width;
        ctx.strokeText(ft.text, ft.x - textWidth / 2, ft.y);
        ctx.fillText(ft.text, ft.x - textWidth / 2, ft.y);
    });

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;

    // Draw lightning strikes
    if (currentEvent === 'thunderstorm') {
        lightningStrikes.forEach(strike => {
            const timeSinceWarning = currentFrameTime - strike.warningStartTime;
            if (timeSinceWarning > 0 && !strike.hasStruck) {
                // Warning indicator
                const warningOpacity = Math.min(0.5, timeSinceWarning / 1000);
                ctx.fillStyle = `rgba(255, 255, 100, ${warningOpacity})`;
                ctx.fillRect(strike.x, 0, strike.width, GAME_HEIGHT - GROUND_HEIGHT);
            }
            if (strike.hasStruck) {
                // Actual strike
                ctx.fillStyle = 'white';
                ctx.fillRect(strike.x, 0, strike.width, GAME_HEIGHT - GROUND_HEIGHT);
            }
        });
    }

    if (screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash})`;
        ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);
    }

    ctx.restore(); // Restore from global scaling
}
