import fs from 'fs';

const filePath = './src/main.js';
let content = fs.readFileSync(filePath, 'utf8');
const isCRLF = content.includes('\r\n');
let norm = content.replace(/\r\n/g, '\n');

// 1. Procedural sky initialization
const targetInit = `    const { mesh: proceduralSkyMesh, material: proceduralSkyMat, uniforms: skyUniforms } = createProceduralSky();
    window._skyDbg = skyUniforms;
    scene.background = new THREE.Color(0x8cbce6);
    let currentWeather = 'clear';`;

const replInit = `    const { mesh: proceduralSkyMesh, material: proceduralSkyMat, uniforms: skyUniforms } = createProceduralSky();
    window._skyDbg = skyUniforms;
    scene.add(proceduralSkyMesh);
    scene.background = null;
    let currentWeather = 'clear';`;

// 2. Animate loop sky update
const targetAnim = `        // Procedural Sky — per-biome lerp + night factor
        if (skyUniforms && typeof playerGrp !== 'undefined') {
            const pYaw = playerPhysics ? playerPhysics.currentYaw : 0;
            const skyBiomeName = getBiomeAt(
                playerGrp.position.x + Math.sin(pYaw) * 200,
                playerGrp.position.z + Math.cos(pYaw) * 200
            ).name;
            const biomeTarget = BIOME_SKY_CONFIGS[skyBiomeName] || BIOME_SKY_CONFIGS['🌊 Open Ocean'];
            const decaySky = 1.0 - Math.exp(-0.8 * dt);

            skyUniforms.uCloudCoverage.value += (biomeTarget.coverage - skyUniforms.uCloudCoverage.value) * decaySky;
            skyUniforms.uCloudEdge.value += (biomeTarget.edge - skyUniforms.uCloudEdge.value) * decaySky;
            skyUniforms.uCloudSpeed.value += (biomeTarget.speed - skyUniforms.uCloudSpeed.value) * decaySky;
            skyUniforms.uCloudTurbulence.value += (biomeTarget.turbulence - skyUniforms.uCloudTurbulence.value) * decaySky;
            skyUniforms.uStormDarken.value += (biomeTarget.stormDarken - skyUniforms.uStormDarken.value) * decaySky;
            skyUniforms.uSkyColorZenith.value.lerp(tempColorTarget.setHex(biomeTarget.skyZenith), decaySky);
            skyUniforms.uSkyColorHorizon.value.lerp(tempColorTarget.setHex(biomeTarget.skyHorizon), decaySky);
            skyUniforms.uCloudColor.value.lerp(tempColorTarget.setHex(biomeTarget.cloudCol), decaySky);
            skyUniforms.uCloudShadowColor.value.lerp(tempColorTarget.setHex(biomeTarget.cloudShadow), decaySky);
            skyUniforms.uSunColor.value.lerp(tempColorTarget.setHex(target.dir), decaySky);
            
            // Weather override (storm/overcast)
            if (currentWeather !== 'clear') {
                const wp = WEATHER_PRESETS[currentWeather];
                if (wp) {
                    if (wp.coverage !== null) skyUniforms.uCloudCoverage.value += (wp.coverage - skyUniforms.uCloudCoverage.value) * decaySky;
                    if (wp.edge !== null) skyUniforms.uCloudEdge.value += (wp.edge - skyUniforms.uCloudEdge.value) * decaySky;
                    if (wp.speed !== null) skyUniforms.uCloudSpeed.value += (wp.speed - skyUniforms.uCloudSpeed.value) * decaySky;
                    skyUniforms.uCloudTurbulence.value += (wp.turbulence - skyUniforms.uCloudTurbulence.value) * decaySky;
                    skyUniforms.uStormDarken.value += (wp.stormDarken - skyUniforms.uStormDarken.value) * decaySky;
                }
            }

            // Night factor from sun Y position
            const nightFactor = THREE.MathUtils.smoothstep(-currentSunY, -200, 800);
            skyUniforms.uNightFactor.value = nightFactor;

            // Dusk factor: peaks when sun is low (sunY ~100-400), 0 at morning (1500) and night (-8000)
            const duskHigh = 1.0 - THREE.MathUtils.smoothstep(currentSunY, 300, 800);
            const duskLow = THREE.MathUtils.smoothstep(currentSunY, -500, 0);
            const duskFactor = duskHigh * duskLow;
            skyUniforms.uDuskFactor.value = duskFactor;
            skyUniforms.uStarDensity.value = Math.max(nightFactor, duskFactor * 0.7);
        }`;

const replAnim = `        // Procedural Sky — per-biome lerp + time phase syncing
        if (skyUniforms && typeof playerGrp !== 'undefined') {
            skyUniforms.uTime.value = time;
            if (typeof staticSun !== 'undefined') {
                skyUniforms.uSunPosition.value.copy(staticSun.position).sub(playerGrp.position).normalize();
            }
            if (typeof proceduralSkyMesh !== 'undefined' && proceduralSkyMesh) {
                proceduralSkyMesh.position.copy(playerGrp.position);
            }
            const pYaw = playerPhysics ? playerPhysics.currentYaw : 0;
            const skyBiomeName = getBiomeAt(
                playerGrp.position.x + Math.sin(pYaw) * 200,
                playerGrp.position.z + Math.cos(pYaw) * 200
            ).name;
            const biomeTarget = BIOME_SKY_CONFIGS[skyBiomeName] || BIOME_SKY_CONFIGS['Open Ocean'];
            const decaySky = 1.0 - Math.exp(-0.8 * dt);

            if (biomeTarget) {
                skyUniforms.uCloudCoverage.value += (biomeTarget.coverage - skyUniforms.uCloudCoverage.value) * decaySky;
                skyUniforms.uCloudEdge.value += (biomeTarget.edge - skyUniforms.uCloudEdge.value) * decaySky;
                skyUniforms.uCloudSpeed.value += (biomeTarget.speed - skyUniforms.uCloudSpeed.value) * decaySky;
                skyUniforms.uCloudTurbulence.value += (biomeTarget.turbulence - skyUniforms.uCloudTurbulence.value) * decaySky;
                skyUniforms.uStormDarken.value += (biomeTarget.stormDarken - skyUniforms.uStormDarken.value) * decaySky;
                skyUniforms.uSkyColorZenith.value.lerp(tempColorTarget.setHex(biomeTarget.skyZenith), decaySky);
                skyUniforms.uSkyColorHorizon.value.lerp(tempColorTarget.setHex(biomeTarget.skyHorizon), decaySky);
                skyUniforms.uCloudColor.value.lerp(tempColorTarget.setHex(biomeTarget.cloudCol), decaySky);
                skyUniforms.uCloudShadowColor.value.lerp(tempColorTarget.setHex(biomeTarget.cloudShadow), decaySky);
                skyUniforms.uSunColor.value.lerp(tempColorTarget.setHex(target.dir), decaySky);
            }
            
            // Weather override (storm/overcast)
            if (currentWeather !== 'clear') {
                const wp = WEATHER_PRESETS[currentWeather];
                if (wp) {
                    if (wp.coverage !== null) skyUniforms.uCloudCoverage.value += (wp.coverage - skyUniforms.uCloudCoverage.value) * decaySky;
                    if (wp.edge !== null) skyUniforms.uCloudEdge.value += (wp.edge - skyUniforms.uCloudEdge.value) * decaySky;
                    if (wp.speed !== null) skyUniforms.uCloudSpeed.value += (wp.speed - skyUniforms.uCloudSpeed.value) * decaySky;
                    skyUniforms.uCloudTurbulence.value += (wp.turbulence - skyUniforms.uCloudTurbulence.value) * decaySky;
                    skyUniforms.uStormDarken.value += (wp.stormDarken - skyUniforms.uStormDarken.value) * decaySky;
                }
            }

            if (timePhase === 0) {
                skyUniforms.uDuskFactor.value += (0.0 - skyUniforms.uDuskFactor.value) * decaySky;
                skyUniforms.uNightFactor.value += (0.0 - skyUniforms.uNightFactor.value) * decaySky;
                skyUniforms.uStarDensity.value += (0.0 - skyUniforms.uStarDensity.value) * decaySky;
            } else if (timePhase === 1) {
                skyUniforms.uDuskFactor.value += (1.0 - skyUniforms.uDuskFactor.value) * decaySky;
                skyUniforms.uNightFactor.value += (0.0 - skyUniforms.uNightFactor.value) * decaySky;
                skyUniforms.uStarDensity.value += (0.2 - skyUniforms.uStarDensity.value) * decaySky;
            } else {
                skyUniforms.uDuskFactor.value += (0.0 - skyUniforms.uDuskFactor.value) * decaySky;
                skyUniforms.uNightFactor.value += (1.0 - skyUniforms.uNightFactor.value) * decaySky;
                skyUniforms.uStarDensity.value += (1.0 - skyUniforms.uStarDensity.value) * decaySky;
            }
        }`;

if (norm.includes(targetInit) && norm.includes(targetAnim)) {
    norm = norm.replace(targetInit, replInit).replace(targetAnim, replAnim);
    const finalContent = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log('Successfully updated WEBGPU main.js with procedural sky');
} else {
    console.error('Failed to find targets in main.js:', {
        hasTargetInit: norm.includes(targetInit),
        hasTargetAnim: norm.includes(targetAnim)
    });
}
