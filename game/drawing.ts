import type { PlayerState, ElementState, Season, ShellBreakAnimationState, CharacterId, ShellReformAnimationState, BurningPatchState } from '../types';
import type { Character } from './characters/index';
import { PLAYER_WIDTH, PLAYER_HEIGHT, GAME_HEIGHT, GROUND_HEIGHT } from '../constants';
import { groundDetails } from './state';
import { darken } from './utils';

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, shellBreakAnimation: ShellBreakAnimationState | null, character: Character, maxHealth: number, shellReformAnimation: ShellReformAnimationState | null) {
    // The character drawing functions expect the top-left coordinate of the shelled character's bounding box.
    // We calculate the Y position based on the game's coordinate system (where Y=0 is the ground).
    const playerCanvasY = GAME_HEIGHT - player.y - character.hitbox.shelled.height;
    character.draw(ctx, player.x, playerCanvasY, player, shellBreakAnimation, maxHealth, shellReformAnimation);
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
            case 'summer': mainColor = `rgb(${190 + random(seed)*20}, ${170 + random(seed+1)*20}, ${140 + random(seed+2)*20})`; break;
            case 'winter': mainColor = `rgb(${220 + random(seed)*20}, ${225 + random(seed+1)*20}, ${230 + random(seed+2)*20})`; break;
            default: mainColor = `rgb(${100 + random(seed)*20}, ${100 + random(seed+1)*20}, ${100 + random(seed+2)*20})`; break;
        }
        const borderColor = '#4a4a4a'; // Dark grey outline

        ctx.fillStyle = mainColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        ctx.translate(el.size / 2, el.size / 2);
        ctx.rotate(random(seed + 3) * 360 * Math.PI / 180);
        ctx.translate(-el.size / 2, -el.size / 2);
        
        ctx.beginPath();
        const borderRadius = (random(seed+4)*30+20) / 100 * el.size;
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

export function drawGround(ctx: CanvasRenderingContext2D, season: Season, currentEvent: string | null, gameWidth: number, burningPatches: BurningPatchState[], timeInMonth?: number) {
    const groundY = GAME_HEIGHT - GROUND_HEIGHT;
    let grassColors = { from: '#22c55e', to: '#166534' };
    if (season === 'summer' || currentEvent === 'meteorShower') grassColors = { from: '#84cc16', to: '#a3e635' };
    if (season === 'autumn') grassColors = { from: '#f97316', to: '#b45309' };

    if (currentEvent === 'thunderstorm') {
        grassColors.from = darken(grassColors.from, 40);
        grassColors.to = darken(grassColors.to, 40);
    }

    const gradient = ctx.createLinearGradient(0, groundY, 0, GAME_HEIGHT);
    gradient.addColorStop(0, grassColors.from);
    gradient.addColorStop(1, grassColors.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);

    if (season === 'spring') {
        groundDetails.spring.forEach(flower => {
            ctx.fillStyle = flower.color;
            ctx.beginPath();
            ctx.arc(flower.x * gameWidth, groundY + flower.y * GROUND_HEIGHT, flower.size / 2, 0, 2*Math.PI);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(flower.x * gameWidth, groundY + flower.y * GROUND_HEIGHT, flower.size / 6, 0, 2*Math.PI);
            ctx.fill();
        });
    } else if (season === 'autumn') {
        groundDetails.autumn.forEach(leaf => {
            ctx.save();
            ctx.translate(leaf.x * gameWidth, groundY + leaf.y * GROUND_HEIGHT);
            ctx.rotate(leaf.rotation * Math.PI / 180);
            ctx.fillStyle = leaf.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, leaf.size/2, leaf.size * 0.35, 0, 0, 2*Math.PI);
            ctx.fill();
            ctx.restore();
        });
    } else if (season === 'winter') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);
        const snowGradient = ctx.createLinearGradient(0, groundY, 0, groundY + 15);
        snowGradient.addColorStop(0, 'rgba(150, 150, 200, 0.2)');
        snowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = snowGradient;
        ctx.fillRect(0, groundY, gameWidth, 15);

        ctx.fillStyle = 'rgba(173, 216, 230, 0.2)';
        ctx.beginPath();
        ctx.ellipse(gameWidth * 0.25, groundY + GROUND_HEIGHT * 0.8, 50, 10, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(gameWidth * 0.75, groundY + GROUND_HEIGHT * 0.85, 75, 12, 0, 0, 2*Math.PI);
        ctx.fill();
    }

    burningPatches.forEach(patch => {
        const alpha = Math.min(1, patch.lifespan / 2.0);
        ctx.globalAlpha = alpha;

        // Scorched earth
        ctx.fillStyle = '#3a2d21';
        ctx.beginPath();
        ctx.ellipse(patch.x + patch.width / 2, groundY + 5, patch.width / 2, 8, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Embers
        if (Math.random() > 0.5) {
            const emberX = patch.x + Math.random() * patch.width;
            const emberY = groundY + Math.random() * 10 - 5;
            ctx.fillStyle = ['#f97316', '#fef08a'][Math.floor(Math.random()*2)];
            ctx.beginPath();
            ctx.arc(emberX, emberY, Math.random() * 2 + 1, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    });

    if (currentEvent === 'blizzard' && timeInMonth !== undefined) {
        const progress = timeInMonth / 30;
        const maxSnowHeight = 40; // Max height of accumulation
        const snowHeight = progress * maxSnowHeight;

        if (snowHeight > 1) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            const startY = groundY;
            
            const segments = 50;
            let firstY = 0;
            // Draw the top wavy line of the snow
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * gameWidth;
                const wave1 = Math.sin(i / 7 + 1) * 5; // Use offsets to avoid starting at 0
                const wave2 = Math.sin(i / 2.5) * 3;
                const y = startY - snowHeight + wave1 + wave2;
                if (i === 0) {
                    firstY = y;
                    ctx.moveTo(0, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Draw lines to close the shape with the ground
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
        // The main blizzard overlay is now handled by the fog gradient
        // case 'blizzard': overlayColor = 'rgba(255, 255, 255, 0.2)'; break;
    }
    if (overlayColor !== 'transparent') {
        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);
    }
}