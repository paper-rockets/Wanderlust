import * as THREE from 'three';

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Asymmetric Sand Dune Profile: Gentle windward (stoss) face + Razor-sharp knife-edge crest + Steep slipface (lee)
function asymmetricDune(coord, wavelength, crestRatio = 0.70) {
    let p = (coord % wavelength) / wavelength;
    if (p < 0) p += 1.0;
    if (p < crestRatio) {
        // Windward face (stoss side): silky-smooth climb curving upward to crest
        const t = p / crestRatio;
        return Math.pow(t, 1.5);
    } else {
        // Slipface (lee side): steep drop-off at angle of repose
        const t = (p - crestRatio) / (1.0 - crestRatio);
        const inv = 1.0 - t;
        return Math.pow(inv, 1.85);
    }
}

export const desertColors = {
    deepWater:      new THREE.Color(0x0d5c75), // Deep turquoise oasis pool
    oasisWater:     new THREE.Color(0x14b8a6), // Vibrant crystal teal shore
    oasisGrass:     new THREE.Color(0x22c55e), // Lush emerald palm foliage
    oasisEdge:      new THREE.Color(0x84cc16), // Bright lime grass boundary
    oasisSand:      new THREE.Color(0xd97706), // Warm golden shore sand

    // Sossusvlei / Namib / Sahara Master Palette
    slipfaceDark:   new THREE.Color(0x6e250c), // Deep rich umber / dark slipface shadow
    slipfaceWarm:   new THREE.Color(0x9c3e16), // Burnt terracotta slipface slope
    valleyShadow:   new THREE.Color(0x873212), // Rich warm amber-umber shadow (GUI bound)
    valleyBase:     new THREE.Color(0xd97220), // Warm rich amber valley floor
    sandBase:       new THREE.Color(0xe88226), // Glowing warm golden-orange sand
    duneSlope:      new THREE.Color(0xf2922a), // Saturated glowing cadmium-orange windward face (GUI bound)
    duneSunlit:     new THREE.Color(0xf8b448), // Brilliant warm sunlit gold
    duneCrest:      new THREE.Color(0xffe89e), // Luminous sun-bleached golden cream crest
    peakHighlight:  new THREE.Color(0xfff7db)  // Radiant warm ivory pinnacle highlight
};

export default {
    name: "Desert Dunes",
    shoreName: "Desert Shore",
    getHeight(x, z, snoise) {
        // 1. Regional high desert rolling base
        const base = snoise(x * 0.00004, z * 0.00004) * 20.0 + 35.0;

        // 2. Primary Grand Sinuous Mega-Dunes (~37 deg wind direction)
        const cos1 = 0.796, sin1 = 0.605;
        const u1 = x * cos1 + z * sin1;
        const v1 = -x * sin1 + z * cos1;

        const warp1 = snoise(u1 * 0.00025, v1 * 0.00025) * 450.0 + snoise(u1 * 0.0006 + 50.0, v1 * 0.0006 - 50.0) * 160.0;
        const meander1 = Math.sin(v1 * 0.0011 + snoise(v1 * 0.0005, u1 * 0.0005) * 2.0) * 220.0;
        const uWarped1 = u1 + warp1 + meander1;
        const dune1 = asymmetricDune(uWarped1, 1600.0, 0.70) * 120.0;

        // 3. Secondary Intersecting Crescent / Barchan Dunes (~ -26 deg)
        const cos2 = 0.898, sin2 = -0.438;
        const u2 = x * cos2 + z * sin2;
        const v2 = -x * sin2 + z * cos2;

        const warp2 = snoise(u2 * 0.0006 + 120.0, v2 * 0.0006 + 120.0) * 180.0;
        const meander2 = Math.cos(v2 * 0.0022 + snoise(u2 * 0.001, v2 * 0.001) * 1.5) * 110.0;
        const uWarped2 = u2 + warp2 + meander2;
        const dune2 = asymmetricDune(uWarped2, 680.0, 0.68) * 50.0;

        // 4. Tertiary Sinuous Knife-Edge Ridges
        const cos3 = 0.980, sin3 = 0.198;
        const u3 = x * cos3 + z * sin3;
        const v3 = -x * sin3 + z * cos3;
        const warp3 = snoise(u3 * 0.0018, v3 * 0.0018) * 50.0;
        const uWarped3 = u3 + warp3 + Math.sin(v3 * 0.005) * 40.0;
        const dune3 = asymmetricDune(uWarped3, 240.0, 0.72) * 18.0;

        // Clean silky-smooth total height without any artificial geometric ripple lines
        let h = base + dune1 + dune2 + dune3;

        // Desert oasis depressions
        const oasisNoise = snoise(x * 0.00025 + 800.0, z * 0.00025 - 800.0);
        if (oasisNoise > 0.65) {
            const bowl = (oasisNoise - 0.65) / 0.35;
            const smoothBowl = Math.pow(Math.sin(bowl * Math.PI * 0.5), 2.0);
            const oasisDepth = smoothBowl * 80.0;
            h -= oasisDepth;
        }

        return Math.max(6.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstepFn) {
        const ss = smoothstepFn || smoothstep;

        // Oasis coloring check
        const oasisNoise = snoise(x * 0.00025 + 800.0, z * 0.00025 - 800.0);
        if (oasisNoise > 0.52 && h < 18.0) {
            if (h < 6.1) {
                tempColor.lerpColors(desertColors.deepWater, desertColors.oasisWater, ss(5.0, 6.1, h));
            } else if (h < 9.5) {
                tempColor.lerpColors(desertColors.oasisWater, desertColors.oasisGrass, ss(6.1, 9.5, h));
            } else if (h < 13.5) {
                tempColor.lerpColors(desertColors.oasisGrass, desertColors.oasisEdge, ss(9.5, 13.5, h));
            } else {
                tempColor.lerpColors(desertColors.oasisEdge, desertColors.oasisSand, ss(13.5, 18.0, h));
            }
            return;
        }

        // Coordinate calculation for primary and secondary dune phases
        const cos1 = 0.796, sin1 = 0.605;
        const u1 = x * cos1 + z * sin1;
        const v1 = -x * sin1 + z * cos1;
        const warp1 = snoise(u1 * 0.00025, v1 * 0.00025) * 450.0 + snoise(u1 * 0.0006 + 50.0, v1 * 0.0006 - 50.0) * 160.0;
        const meander1 = Math.sin(v1 * 0.0011 + snoise(v1 * 0.0005, u1 * 0.0005) * 2.0) * 220.0;
        const uWarped1 = u1 + warp1 + meander1;
        let p1 = (uWarped1 % 1600.0) / 1600.0;
        if (p1 < 0) p1 += 1.0;

        const isSlip1 = p1 >= 0.70;

        if (isSlip1) {
            // Slipface: Deep rich umber and terracotta shadow
            const tSlip = (p1 - 0.70) / 0.30;
            const shadowIntensity = Math.sin(tSlip * Math.PI);
            tempColor.lerpColors(desertColors.slipfaceDark, desertColors.slipfaceWarm, shadowIntensity);
            if (h < 55.0) {
                tempColor.lerp(desertColors.valleyShadow, (1.0 - tSlip) * 0.45);
            }
        } else {
            // Windward face: Clean, smooth golden gradient
            if (h < 48.0) {
                tempColor.lerpColors(desertColors.valleyBase, desertColors.sandBase, ss(20.0, 48.0, h));
            } else if (h < 85.0) {
                tempColor.lerpColors(desertColors.sandBase, desertColors.duneSlope, ss(48.0, 85.0, h));
            } else if (h < 125.0) {
                tempColor.lerpColors(desertColors.duneSlope, desertColors.duneSunlit, ss(85.0, 125.0, h));
            } else {
                tempColor.lerpColors(desertColors.duneSunlit, desertColors.duneCrest, ss(125.0, 175.0, h));
            }
        }

        // Razor-sharp knife-edge crest line highlight
        const distCrest = Math.abs(p1 - 0.70);
        if (distCrest < 0.035 && h > 45.0) {
            const crestFactor = (1.0 - distCrest / 0.035) * ss(45.0, 75.0, h);
            tempColor.lerp(desertColors.duneCrest, crestFactor * 0.75);
        }

        // Peak highlight on high elevations
        if (h > 120.0) {
            const peakFactor = ss(120.0, 180.0, h);
            tempColor.lerp(desertColors.peakHighlight, peakFactor * 0.40);
        }
    }
};
