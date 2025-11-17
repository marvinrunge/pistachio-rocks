import type { PlayerState, ShellBreakAnimationState, CharacterId, ShellPieceState, ShellReformAnimationState } from '../../types';
import { assetManager } from '../assets';

export type CharacterStartingStats = {
    maxHealth?: number;
    maxSpeed?: number;
    extraLives?: number;
    blockChance?: number;
    bonusHeal?: number;
    goldenTouchChance?: number;
};

export type Character = {
    id: CharacterId;
    name: string;
    description: string;
    hitbox: {
        shelled: { width: number; height: number; };
        naked: { width: number; height: number; };
    };
    startingStats: CharacterStartingStats;
    draw: (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        player: PlayerState,
        shellBreakAnimation: ShellBreakAnimationState | null,
        maxHealth: number,
        shellReformAnimation: ShellReformAnimationState | null
    ) => void;
};

export const createDrawFunction = (
    hitbox: Character['hitbox'],
    characterId: CharacterId
): Character['draw'] => {
    return (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        player: PlayerState,
        shellBreakAnimation: ShellBreakAnimationState | null,
        maxHealth: number,
        shellReformAnimation: ShellReformAnimationState | null
    ) => {
        const assets = assetManager.getCharacterAssets(characterId);
        // Ensure assets and their dimensions are loaded before drawing
        if (!assets || !assets.shellLeft.naturalWidth) return; 

        const { seed, shellLeft, shellRight } = assets;
        const { shelled, naked } = hitbox;

        // --- Calculate Aspect-Correct Dimensions ---
        // Assume all assets for a character (seed, shells) have the same natural dimensions.
        const imageAspectRatio = shellLeft.naturalWidth / shellLeft.naturalHeight;
        const drawHeight = shelled.height;
        const drawWidth = drawHeight * imageAspectRatio;
        
        // Calculate offset to center the aspect-correct image within the logical hitbox
        const xOffset = (shelled.width - drawWidth) / 2;
        const drawX = x + xOffset;
        const drawY = y;

        // Inner function for the breaking animation to keep code DRY
        const _drawShellPiece = (ctx: CanvasRenderingContext2D, piece: ShellPieceState, image: HTMLImageElement) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation * Math.PI / 180);
            // Draw the full, aspect-correct image, centered on the piece's animated coordinates
            ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
        }

        if (shellBreakAnimation) {
            _drawShellPiece(ctx, shellBreakAnimation.leftPiece, shellLeft);
            _drawShellPiece(ctx, shellBreakAnimation.rightPiece, shellRight);
        }

        // --- 1. Draw Body (Seed) ---
        // Always drawn, whether shelled or naked.
        const nakedDrawHeight = naked.height;
        const nakedDrawWidth = nakedDrawHeight * imageAspectRatio;
        const nakedXDrawOffset = (shelled.width - nakedDrawWidth) / 2;
        let nakedYDrawOffset = (shelled.height - nakedDrawHeight) / 2; // Default to centered

        if (player.isNaked && !shellReformAnimation) {
            // If the player is naked (shell is broken), align the bottom of the seed sprite
            // with the bottom of where the shelled hitbox would be, so it rests on the ground.
            // This doesn't apply during shell reformation, where we want it centered for the animation.
            nakedYDrawOffset = shelled.height - nakedDrawHeight;
        }
        
        ctx.drawImage(seed, x + nakedXDrawOffset, y + nakedYDrawOffset, nakedDrawWidth, nakedDrawHeight);

        // --- 2. Draw Shells ---
        if ((!player.isNaked || shellReformAnimation) && !shellBreakAnimation) {
            const healthPercentage = maxHealth > 0 ? Math.min(1, Math.max(0, player.health) / maxHealth) : 0;
            
            let reformOffsetX = 0;
            if (shellReformAnimation) {
                const t = 1 - shellReformAnimation.progress;
                const easedProgress = 1 - t * t * t; // easeOutCubic
                // Base the slide offset on the visual width, not the hitbox width
                const maxOffset = drawWidth * 0.25; 
                reformOffsetX = maxOffset * (1 - easedProgress);
            }
            
            const maxAngle = 20;
            const rotationAngle = (1 - healthPercentage) * maxAngle;
            const angleInRadians = rotationAngle * Math.PI / 180;

            const pivotX = x + shelled.width / 2;
            const pivotY = y + shelled.height;

            // --- Draw Left Shell ---
            ctx.save();
            ctx.translate(pivotX, pivotY);
            ctx.rotate(-angleInRadians); // Corrected: Rotate counter-clockwise to open
            ctx.translate(-pivotX, -pivotY);
            ctx.drawImage(shellLeft, drawX - reformOffsetX, drawY, drawWidth, drawHeight);
            ctx.restore();

            // --- Draw Right Shell ---
            ctx.save();
            ctx.translate(pivotX, pivotY);
            ctx.rotate(angleInRadians); // Corrected: Rotate clockwise to open
            ctx.translate(-pivotX, -pivotY);
            ctx.drawImage(shellRight, drawX + reformOffsetX, drawY, drawWidth, drawHeight);
            ctx.restore();
        }
    };
};