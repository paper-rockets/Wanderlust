import * as THREE from 'three';

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export const desertColors = {
    deepWater:    new THREE.Color(0x0d5c75), // Deep turquoise oasis pool
    oasisWater:   new THREE.Color(0x14b8a6), // Vibrant crystal teal shore
    oasisGrass:   new THREE.Color(0x22c55e), // Lush emerald palm foliage
    oasisEdge:    new THREE.Color(0x84cc16), // Bright lime grass boundary
    oasisSand:    new THREE.Color(0xd97706), // Warm golden shore sand
    valleyShadow: new THREE.Color(0x7a2e19), // Burnt terracotta / mahogany valley shadow
    sandBase:     new THREE.Color(0xd96d27), // Deep warm amber sand
    duneSlope:    new THREE.Color(0xf5a047), // Vibrant glowing gold dune slope
    duneCrest:    new THREE.Color(0xfcd385), // Radiant sunlit crest
    peakHighlight:new THREE.Color(0xfef0d2)  // Warm ivory-peach razor peak
};

export default {
    name: "Desert Dunes",
    shoreName: "Desert Shore",
    getHeight(x, z, snoise) {
        // 1. Macro landscape rolling elevation (high desert plateau)
        const macroNoise = snoise(x * 0.00008, z * 0.00008);
        const macroHeight = macroNoise * 30.0 + 45.0;
        
        // 2. Domain warping for wind-sculpted curved barchan dunes (50% scale)
        const warpX = snoise(x * 0.0008, z * 0.0008) * 75.0;
        const warpZ = snoise(x * 0.0008 + 120.0, z * 0.0008 + 120.0) * 75.0;
        
        // 3. Primary smooth sweeping dune crests (50% size scale)
        const duneRaw = snoise((x + warpX) * 0.0020, (z + warpZ) * 0.0020);
        const ridge = Math.max(0.0, 1.0 - Math.abs(duneRaw));
        const smoothRidge = ridge * ridge * (3.0 - 2.0 * ridge);
        const duneRidge = Math.pow(smoothRidge, 1.4);
        
        // 4. Secondary cross-dunes (50% size scale)
        const duneRaw2 = snoise((x - warpZ) * 0.0040 + 50.0, (z + warpX) * 0.0040 + 50.0);
        const ridge2 = Math.max(0.0, 1.0 - Math.abs(duneRaw2));
        const smoothRidge2 = ridge2 * ridge2 * (3.0 - 2.0 * ridge2);
        const duneRidge2 = Math.pow(smoothRidge2, 1.2) * 0.35;
        
        const h = macroHeight + duneRidge * 32.5 + duneRidge2 * 12.5;
        return Math.max(16.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstepFn) {
        const ss = smoothstepFn || smoothstep;

        // Pure Sweeping Sand Dune Gradient (Valley Shadow -> Base -> Slope -> Crest -> Peak)
        const colVar = snoise(x * 0.004, z * 0.004) * 0.06;
        
        if (h < 26.0) {
            tempColor.lerpColors(desertColors.valleyShadow, desertColors.sandBase, ss(12.0, 26.0, h));
        } else if (h < 42.0) {
            tempColor.lerpColors(desertColors.sandBase, desertColors.duneSlope, ss(26.0, 42.0, h));
        } else if (h < 65.0) {
            tempColor.lerpColors(desertColors.duneSlope, desertColors.duneCrest, ss(42.0, 65.0, h));
        } else {
            tempColor.lerpColors(desertColors.duneCrest, desertColors.peakHighlight, ss(65.0, 95.0, h));
        }
        
        if (colVar !== 0) {
            tempColor.r = Math.max(0, Math.min(1, tempColor.r + colVar));
            tempColor.g = Math.max(0, Math.min(1, tempColor.g + colVar * 0.6));
        }
    }
};
