import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
    Fn, vec2, vec3, float, dot, mix, clamp, pow, normalize,
    positionWorld, normalWorld, cameraPosition, attribute, step, texture
} from 'three/tsl';

export const createTerrainMaterial = (uTime, uSunDir, uSandNoiseMap, uShimmerMult) => {
    const terrainMat = new MeshStandardNodeMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0.0
    });

    const aBiomeType = attribute('aBiomeType', 'float');

    // Clean Cel-Shaded Vertex Colors
    terrainMat.colorNode = Fn(() => {
        return attribute('color', 'vec3');
    })();

    // Journey-style Sand Sparkle and Snow Shimmer (Subtle, non-overblown highlights)
    terrainMat.emissiveNode = Fn(() => {
        const viewDir = normalize(cameraPosition.sub(positionWorld));
        const norm = normalize(normalWorld);
        const lightDir = normalize(uSunDir);
        const halfDir = normalize(lightDir.add(viewDir));

        const lightFacing = clamp(dot(norm, lightDir), 0.0, 1.0);
        const nDotH = clamp(dot(norm, halfDir), 0.0, 1.0);

        // 1. Sand Shimmer & Sparkling Diamond Glitter (aBiomeType == 1.0)
        const isSand = step(0.9, aBiomeType).mul(step(aBiomeType, 1.1));
        const rim = float(1.0).sub(clamp(dot(norm, viewDir), 0.0, 1.0));
        const rimStrength = pow(rim, float(4.0)).mul(lightFacing.mul(0.7).add(0.3)).mul(0.40);
        const rimGlow = vec3(1.0, 0.75, 0.42).mul(rimStrength);

        const mainSpec = pow(nDotH, float(24.0)).mul(lightFacing).mul(0.85).toVar();

        const sandUV1 = positionWorld.xz.mul(0.08).add(vec2(uTime.mul(0.003), uTime.mul(0.002)));
        const sandUV2 = positionWorld.xz.mul(0.22).sub(vec2(uTime.mul(0.005), uTime.mul(0.004)));
        
        let textureGlitter = texture(uSandNoiseMap, sandUV1).r.mul(0.65).add(texture(uSandNoiseMap, sandUV2).g.mul(0.55));
        textureGlitter = pow(clamp(textureGlitter, 0.0, 1.0), 3.0);
        mainSpec.mulAssign(textureGlitter);

        const rimSpec = pow(rim, 3.0).mul(textureGlitter).mul(lightFacing).mul(0.45);
        const specColor = mainSpec.add(rimSpec).mul(vec3(1.0, 0.85, 0.58)).mul(uShimmerMult);
        
        // Warm ambient terracotta backscatter in dune shadows
        const warmBackscatter = vec3(0.08, 0.03, 0.01).mul(float(1.0).sub(lightFacing));
        
        const finalSandGlow = rimGlow.add(specColor).add(warmBackscatter).mul(isSand);

        // 2. Snow Shimmer & Ice Glitter (aBiomeType == 2.0)
        const isSnow = step(1.9, aBiomeType).mul(step(aBiomeType, 2.1));
        const snowRim = float(1.0).sub(clamp(dot(norm, viewDir), 0.0, 1.0));
        const snowRimGlow = vec3(0.65, 0.85, 1.0).mul(pow(snowRim, float(4.0)).mul(lightFacing.mul(0.7).add(0.3)).mul(0.25));

        const mainSnowSpec = pow(nDotH, float(20.0)).mul(lightFacing).mul(0.7).toVar();
        const snowUV1 = positionWorld.xz.mul(0.12).add(vec2(uTime.mul(0.005), uTime.mul(0.003)));
        const snowUV2 = positionWorld.xz.mul(0.28).sub(vec2(uTime.mul(0.007), uTime.mul(0.005)));
        let snowGlitter = texture(uSandNoiseMap, snowUV1).r.mul(0.65).add(texture(uSandNoiseMap, snowUV2).g.mul(0.55));
        snowGlitter = pow(clamp(snowGlitter, 0.0, 1.0), 3.0);
        mainSnowSpec.mulAssign(snowGlitter);

        const snowRimSpec = pow(snowRim, 3.0).mul(snowGlitter).mul(lightFacing).mul(0.35);
        const snowSpecColor = mainSnowSpec.add(snowRimSpec).mul(vec3(0.85, 0.95, 1.0)).mul(uShimmerMult);
        const finalSnowGlow = snowRimGlow.add(snowSpecColor).mul(isSnow);

        return finalSandGlow.add(finalSnowGlow);
    })();

    return terrainMat;
};
