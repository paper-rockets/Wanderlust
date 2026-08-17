import * as THREE from 'three';

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// C1-Smooth Asymmetric Dune Profile (60% scale reduction)
function asymmetricDune(coord, wavelength, crestRatio = 0.70) {
    let p = (coord % wavelength) / wavelength;
    if (p < 0) p += 1.0;
    if (p < crestRatio) {
        // Windward face (stoss): Hermite cubic S-curve
        const t = p / crestRatio;
        return t * t * (3.0 - 2.0 * t);
    } else {
        // Slipface (lee): Hermite cubic drop-off
        const t = (p - crestRatio) / (1.0 - crestRatio);
        const inv = 1.0 - t;
        return inv * inv * (3.0 - 2.0 * inv);
    }
}

export const desertColors = {
    deepWater:      new THREE.Color(0x0d5c75), // Deep turquoise oasis pool
    oasisWater:     new THREE.Color(0x14b8a6), // Vibrant crystal teal shore
    oasisGrass:     new THREE.Color(0x22c55e), // Lush emerald palm foliage
    oasisEdge:      new THREE.Color(0x84cc16), // Bright lime grass boundary
    oasisSand:      new THREE.Color(0xd97706), // Warm golden shore sand

    // Sossusvlei / Namib Master Sand Palette
    slipfaceDark:   new THREE.Color(0x6e250c), // Deep rich umber / dark slipface shadow
    slipfaceWarm:   new THREE.Color(0x9c3e16), // Burnt terracotta slipface slope
    valleyShadow:   new THREE.Color(0x873212), // Rich warm amber shadow (GUI bound)
    valleyBase:     new THREE.Color(0xd97220), // Warm rich amber valley floor
    sandBase:       new THREE.Color(0xe88226), // Glowing warm golden-orange sand
    duneSlope:      new THREE.Color(0xf2922a), // Saturated glowing cadmium-orange windward face (GUI bound)
    duneSunlit:     new THREE.Color(0xf8b448), // Brilliant warm sunlit gold
    duneCrest:      new THREE.Color(0xffe89e), // Luminous sun-bleached golden cream crest
    peakHighlight:  new THREE.Color(0xfff7db)  // Radiant warm ivory highlight
};

export default {
    name: "Desert Dunes",
    shoreName: "Desert Shore",
    getHeight(x, z, snoise) {
        // 1. Regional rolling base (60% scale reduction)
        const base = snoise(x * 0.0001, z * 0.0001) * 8.0 + 14.0;

        // 2. Primary Grand Sinuous Dunes (800m wavelength, 50m height)
        const cos1 = 0.796, sin1 = 0.605;
        const u1 = x * cos1 + z * sin1;
        const v1 = -x * sin1 + z * cos1;

        const warp1 = snoise(u1 * 0.000375, v1 * 0.000375) * 140.0;
        const meander1 = Math.sin(v1 * 0.002) * 72.0;
        const uWarped1 = u1 + warp1 + meander1;
        const dune1 = asymmetricDune(uWarped1, 800.0, 0.70) * 50.0;

        // 3. Secondary Intersecting Dunes (400m wavelength, 18m height)
        const cos2 = 0.898, sin2 = -0.438;
        const u2 = x * cos2 + z * sin2;
        const v2 = -x * sin2 + z * cos2;

        const warp2 = snoise(u2 * 0.00075 + 80.0, v2 * 0.00075 + 80.0) * 60.0;
        const meander2 = Math.cos(v2 * 0.003) * 36.0;
        const uWarped2 = u2 + warp2 + meander2;
        const dune2 = asymmetricDune(uWarped2, 400.0, 0.68) * 18.0;

        // Silky smooth total height
        let h = base + dune1 + dune2;

        // Desert oasis depressions
        const oasisNoise = snoise(x * 0.000625 + 800.0, z * 0.000625 - 800.0);
        if (oasisNoise > 0.65) {
            const bowl = (oasisNoise - 0.65) / 0.35;
            const smoothBowl = Math.pow(Math.sin(bowl * Math.PI * 0.5), 2.0);
            const oasisDepth = smoothBowl * 32.0;
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

        // Coordinate calculation for smooth face shading
        const cos1 = 0.796, sin1 = 0.605;
        const u1 = x * cos1 + z * sin1;
        const v1 = -x * sin1 + z * cos1;
        const warp1 = snoise(u1 * 0.000375, v1 * 0.000375) * 140.0;
        const meander1 = Math.sin(v1 * 0.002) * 72.0;
        const uWarped1 = u1 + warp1 + meander1;
        let p1 = (uWarped1 % 800.0) / 800.0;
        if (p1 < 0) p1 += 1.0;

        const isSlip1 = p1 >= 0.70;

        if (isSlip1) {
            // Slipface: Smooth terracotta shadow gradient
            const tSlip = (p1 - 0.70) / 0.30;
            const shadowFactor = Math.sin(tSlip * Math.PI);
            tempColor.lerpColors(desertColors.slipfaceDark, desertColors.slipfaceWarm, shadowFactor);
            if (h < 25.0) {
                tempColor.lerp(desertColors.valleyShadow, (1.0 - tSlip) * 0.4);
            }
        } else {
            // Windward face: Silky smooth golden gradient
            if (h < 22.0) {
                tempColor.lerpColors(desertColors.valleyBase, desertColors.sandBase, ss(10.0, 22.0, h));
            } else if (h < 38.0) {
                tempColor.lerpColors(desertColors.sandBase, desertColors.duneSlope, ss(22.0, 38.0, h));
            } else if (h < 56.0) {
                tempColor.lerpColors(desertColors.duneSlope, desertColors.duneSunlit, ss(38.0, 56.0, h));
            } else {
                tempColor.lerpColors(desertColors.duneSunlit, desertColors.duneCrest, ss(56.0, 75.0, h));
            }
        }

        // Soft crest highlight along the top ridge
        const distCrest = Math.abs(p1 - 0.70);
        if (distCrest < 0.04 && h > 18.0) {
            const crestFactor = (1.0 - distCrest / 0.04) * ss(18.0, 35.0, h);
            tempColor.lerp(desertColors.duneCrest, crestFactor * 0.65);
        }

        // Peak highlight on high elevations
        if (h > 50.0) {
            const peakFactor = ss(50.0, 75.0, h);
            tempColor.lerp(desertColors.peakHighlight, peakFactor * 0.35);
        }
    }
};
