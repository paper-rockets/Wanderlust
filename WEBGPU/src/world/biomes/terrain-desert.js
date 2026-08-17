import * as THREE from 'three';

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export const desertColors = {
    deepWater:      new THREE.Color(0x0d5c75), // Deep turquoise oasis pool
    oasisWater:     new THREE.Color(0x14b8a6), // Vibrant crystal teal shore
    oasisGrass:     new THREE.Color(0x22c55e), // Lush emerald palm foliage
    oasisEdge:      new THREE.Color(0x84cc16), // Bright lime grass boundary
    oasisSand:      new THREE.Color(0xd97706), // Warm golden shore sand

    // Unified Master Sand Palette (single uniform material; light and shadow define contours)
    sandBase:       new THREE.Color(0xe88f38), // Warm radiant rich golden sand
    sandSunlit:     new THREE.Color(0xf2a144), // Slightly lighter sunlit sand
    sandPeak:       new THREE.Color(0xf7b65c), // Gentle peak highlight
};

export default {
    name: "Desert Dunes",
    shoreName: "Desert Shore",
    getHeight(x, z, snoise) {
        // 1. Domain Warping: Chaotic, natural curving ridge lines
        const cosW = 0.796, sinW = 0.605; // ~37 degree dominant wind angle
        const u = x * cosW + z * sinW;
        const v = -x * sinW + z * cosW;

        // Multi-octave domain coordinate perturbation
        const qx = snoise(u * 0.0003, v * 0.0003) * 350.0 + snoise(u * 0.0008 + 43.1, v * 0.0008 - 19.5) * 120.0;
        const qz = snoise(v * 0.0003 + 52.3, u * 0.0003 + 13.7) * 350.0 + snoise(v * 0.0008 - 31.7, u * 0.0008 + 64.2) * 120.0;

        const wx = u + qx;
        const wz = v + qz;

        // 2. Ridged Multifractal Noise: 1.0 - abs(snoise) for sharp peaks with wide swooping valleys
        // Primary Mega-Ridge Dunes
        const r1 = 1.0 - Math.abs(snoise(wx * 0.0008, wz * 0.0008));
        const dune1 = Math.pow(r1, 2.0) * 52.0;

        // Secondary Cross-Dune Ridges (rotated domain for intersecting barchan/transverse arcs)
        const rx = wx * 0.866 - wz * 0.5;
        const rz = wx * 0.5 + wz * 0.866;
        const r2 = 1.0 - Math.abs(snoise(rx * 0.0016 + 100.0, rz * 0.0016 - 100.0));
        const dune2 = Math.pow(r2, 2.2) * 22.0;

        // Rolling regional base
        const base = snoise(x * 0.0001, z * 0.0001) * 8.0 + 12.0;

        let h = base + dune1 + dune2;

        // Desert oasis depressions
        const oasisNoise = snoise(x * 0.000625 + 800.0, z * 0.000625 - 800.0);
        if (oasisNoise > 0.65) {
            const bowl = (oasisNoise - 0.65) / 0.35;
            const smoothBowl = Math.pow(Math.sin(bowl * Math.PI * 0.5), 2.0);
            const oasisDepth = smoothBowl * 30.0;
            h -= oasisDepth;
        }

        return Math.max(6.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstepFn) {
        const ss = smoothstepFn || smoothstep;

        // Oasis coloring
        const oasisNoise = snoise(x * 0.000625 + 800.0, z * 0.000625 - 800.0);
        if (oasisNoise > 0.52 && h < 10.0) {
            if (h < 6.1) {
                tempColor.lerpColors(desertColors.deepWater, desertColors.oasisWater, ss(5.0, 6.1, h));
            } else if (h < 7.5) {
                tempColor.lerpColors(desertColors.oasisWater, desertColors.oasisGrass, ss(6.1, 7.5, h));
            } else if (h < 8.8) {
                tempColor.lerpColors(desertColors.oasisGrass, desertColors.oasisEdge, ss(7.5, 8.8, h));
            } else {
                tempColor.lerpColors(desertColors.oasisEdge, desertColors.oasisSand, ss(8.8, 10.0, h));
            }
            return;
        }

        // 3. Unified Single Material Palette (no artificial dark brown stripes)
        // Uniform base sand with subtle elevation warmth
        tempColor.copy(desertColors.sandBase);
        if (h > 25.0) {
            const peakFactor = ss(25.0, 75.0, h);
            tempColor.lerp(desertColors.sandSunlit, peakFactor * 0.7);
        }
        if (h > 60.0) {
            const highFactor = ss(60.0, 85.0, h);
            tempColor.lerp(desertColors.sandPeak, highFactor * 0.5);
        }
    }
};
