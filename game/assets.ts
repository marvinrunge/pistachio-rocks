import type { CharacterId } from '../types';
import {
    PISTACHIO_SEED_SVG,
    PISTACHIO_SHELL_LEFT_SVG,
    PISTACHIO_SHELL_RIGHT_SVG,
    WALNUT_SEED_SVG,
    WALNUT_SHELL_LEFT_SVG,
    WALNUT_SHELL_RIGHT_SVG,
} from './assets-data';

type CharacterAssetData = {
    seed: string;
    shellLeft: string;
    shellRight: string;
};

type CharacterAssets = {
    seed: HTMLImageElement;
    shellLeft: HTMLImageElement;
    shellRight: HTMLImageElement;
};

const characterSVGData: Record<CharacterId, CharacterAssetData> = {
    pistachio: {
        seed: PISTACHIO_SEED_SVG,
        shellLeft: PISTACHIO_SHELL_LEFT_SVG,
        shellRight: PISTACHIO_SHELL_RIGHT_SVG,
    },
    walnut: {
        seed: WALNUT_SEED_SVG,
        shellLeft: WALNUT_SHELL_LEFT_SVG,
        shellRight: WALNUT_SHELL_RIGHT_SVG,
    }
};

class AssetManager {
    private assets: Partial<Record<CharacterId, CharacterAssets>> = {};
    private loadingPromise: Promise<void> | null = null;
    public isLoaded: boolean = false;

    private loadImage(svgText: string): Promise<HTMLImageElement> {
        if (!svgText) {
            return Promise.resolve(new Image());
        }
        
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(new Error(`Failed to load image from blob URL. Error: ${String(err)}`));
            };
            img.src = url;
        });
    }

    public loadAssets(): Promise<void> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        const promises: Promise<void>[] = [];
        const charactersToLoad = Object.keys(characterSVGData) as CharacterId[];

        for (const charId of charactersToLoad) {
            const data = characterSVGData[charId];
            const promise = Promise.all([
                this.loadImage(data.seed),
                this.loadImage(data.shellLeft),
                this.loadImage(data.shellRight),
            ]).then(([seed, shellLeft, shellRight]) => {
                this.assets[charId] = { seed, shellLeft, shellRight };
            }).catch(err => {
                console.error(`Failed to load assets for character: ${charId}`, err);
                throw err;
            });
            promises.push(promise);
        }

        this.loadingPromise = Promise.all(promises).then(() => {
            this.isLoaded = true;
            console.log('All character assets loaded.');
        }).catch(error => {
            console.error("Asset loading failed:", error);
            this.loadingPromise = null; // Allow retrying
            return Promise.reject(error);
        });

        return this.loadingPromise;
    }

    public getCharacterAssets(characterId: CharacterId): CharacterAssets | null {
        return this.assets[characterId] || null;
    }
}

export const assetManager = new AssetManager();
