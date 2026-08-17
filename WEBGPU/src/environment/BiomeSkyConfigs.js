export const BIOME_SKY_CONFIGS = {
    'Archipelago': {
        coverage: 0.40, edge: 0.09, speed: 0.02,
        skyZenith: 0x3a78c4, skyHorizon: 0x9cc4dc,
        cloudCol: 0xfce8d8, cloudShadow: 0x8878a0,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Ghibli Land': {
        coverage: 0.45, edge: 0.08, speed: 0.018,
        skyZenith: 0x3878b8, skyHorizon: 0xa8c8dc,
        cloudCol: 0xfce4d0, cloudShadow: 0x7868a0,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Vast Plains': {
        coverage: 0.35, edge: 0.10, speed: 0.025,
        skyZenith: 0x4a98d0, skyHorizon: 0xb8d8e8,
        cloudCol: 0xfdeee0, cloudShadow: 0x9088a8,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Misty Mountains': {
        coverage: 0.60, edge: 0.14, speed: 0.015,
        skyZenith: 0x5878a0, skyHorizon: 0x90a8b8,
        cloudCol: 0xe8e0e8, cloudShadow: 0x706888,
        turbulence: 0.0, stormDarken: 0.1
    },
    'Lush Jungle': {
        coverage: 0.50, edge: 0.10, speed: 0.012,
        skyZenith: 0x4888b0, skyHorizon: 0x88b898,
        cloudCol: 0xf0e8e0, cloudShadow: 0x788890,
        turbulence: 0.0, stormDarken: 0.05
    },
    'Crystal Land': {
        coverage: 0.25, edge: 0.06, speed: 0.01,
        skyZenith: 0x5a3888, skyHorizon: 0xa890d0,
        cloudCol: 0xe8d0f0, cloudShadow: 0x7060a0,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Open Ocean': {
        coverage: 0.30, edge: 0.09, speed: 0.022,
        skyZenith: 0x2870b0, skyHorizon: 0x88b8d8,
        cloudCol: 0xfce8d0, cloudShadow: 0x8878a0,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Desert Dunes': {
        coverage: 0.08, edge: 0.12, speed: 0.008,
        skyZenith: 0xb89048, skyHorizon: 0xe8c890,
        cloudCol: 0xf8e0b0, cloudShadow: 0xa88860,
        turbulence: 0.0, stormDarken: 0.0
    },
    'Badlands Canyon': {
        coverage: 0.20, edge: 0.10, speed: 0.015,
        skyZenith: 0x906838, skyHorizon: 0xc8a870,
        cloudCol: 0xf0d4b0, cloudShadow: 0x987858,
        turbulence: 0.0, stormDarken: 0.0
    },
    'North Pole': {
        coverage: 0.45, edge: 0.12, speed: 0.01,
        skyZenith: 0x80a8c0, skyHorizon: 0xc0d0e0,
        cloudCol: 0xf0f0f8, cloudShadow: 0x90a0b8,
        turbulence: 0.0, stormDarken: 0.0
    }
};

export const WEATHER_PRESETS = {
    'clear': {
        coverage: null, edge: null, speed: null,
        turbulence: 0.0, stormDarken: 0.0,
        description: 'Clear weather — biome defaults'
    },
    'overcast': {
        coverage: 0.70, edge: 0.15, speed: 0.03,
        turbulence: 0.2, stormDarken: 0.2,
        description: 'Heavy cloud cover, diffused light'
    },
    'storm': {
        coverage: 0.85, edge: 0.18, speed: 0.05,
        turbulence: 0.8, stormDarken: 0.6,
        description: 'Dark turbulent storm clouds'
    }
};
