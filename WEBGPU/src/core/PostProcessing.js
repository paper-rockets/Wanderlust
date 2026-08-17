import * as THREE from 'three';
import { PostProcessing } from 'three/webgpu';
import { pass, vec2, vec3, vec4, mix, smoothstep, max, clamp, dot, float, uv, uniform, Loop, length, Fn, screenCoordinate, fract, sin, toneMapping } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { LOW_GFX } from '../config/constants.js';
import { renderer, scene, camera } from './Engine.js';
import { buildPortalWarpNode, uWarpIntensity } from '../vfx/PortalWarpPass.js';

export let postProcessing;
export let scenePass;
let bloomNode = null;

export const uBloomStrength = uniform(0.35);
export const uBloomRadius = uniform(0.4);
export const uBloomThreshold = uniform(0.85);
export let isBloomOn = !LOW_GFX;

export function initPostProcessing() {
    postProcessing = new PostProcessing(renderer);
    scenePass = pass(scene, camera);
    const sceneColor = scenePass.getTextureNode('output');
    bloomNode = bloom(sceneColor, uBloomStrength, uBloomRadius, uBloomThreshold);
    updatePostProcessingPipeline();
}

// -- Volumetric God Rays Settings (100% matched to flight-merged) --
export const uSunScreenPos = uniform(vec2(0.5, 0.5));
export const uIntensity = uniform(4.0);
export const uDecay = uniform(0.935);
export const uDensity = uniform(0.55);
export const uWeight = uniform(0.80);
export const uSunVisible = uniform(1.0);
export const uRayColor = uniform(new THREE.Color(0xffd580));
export let isGodRaysEnabled = !LOW_GFX;

// Interleaved Gradient Noise (IGN) - clean low-discrepancy sampling, zero noise dust
const ignDither = (p) => {
    const magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z.mul(fract(dot(p, magic.xy))));
};

const buildGodRaysNode = Fn(([baseTex]) => {
    const vUv = uv();

    const deltaUV = vUv.sub(uSunScreenPos).toVar();
    const dist = length(deltaUV);
    deltaUV.mulAssign(float(1.0 / 32.0).mul(uDensity));

    const dither = ignDither(screenCoordinate.xy);
    const sampleUV = vUv.sub(deltaUV.mul(dither)).toVar();

    const illumination = float(0.0).toVar();
    const currentWeight = float(uWeight).toVar();

    Loop({ start: 0, end: 32 }, () => {
        sampleUV.subAssign(deltaUV);
        const clampedUV = clamp(sampleUV, vec2(0.001), vec2(0.999));

        const samp = scenePass.getTextureNode().sample(clampedUV);
        const lum = dot(samp.rgb, vec3(0.299, 0.587, 0.114));
        const distFromSun = length(sampleUV.sub(uSunScreenPos));
        const sunMask = float(1.0).sub(smoothstep(float(0.02), float(0.18), distFromSun));
        const bright = smoothstep(float(0.70), float(0.98), lum).mul(sunMask);

        illumination.addAssign(bright.mul(currentWeight));
        currentWeight.mulAssign(uDecay);
    });

    const edgeFade = float(1.0).sub(smoothstep(float(0.35), float(1.6), dist));
    const rayColor = uRayColor.mul(illumination).mul(uIntensity).mul(edgeFade).mul(uSunVisible);

    return vec4(baseTex.rgb.add(rayColor), baseTex.a);
});

// -- Ghibli Summer Filter (100% matched to WebGL) --
export let isSummerFilterOn = false;

const getLuminance = (col) => dot(col, vec3(0.299, 0.587, 0.114));

const buildGhibliSummerNode = Fn(([baseTex]) => {
    const col = baseTex.rgb;
    const lum = getLuminance(col);
    
    const warmGold = col.mul(vec3(1.07, 1.02, 0.92));
    const azureShadow = col.mul(vec3(0.93, 0.98, 1.07));
    let finalCol = mix(azureShadow, warmGold, smoothstep(0.2, 0.75, lum));
    
    finalCol = mix(vec3(lum), finalCol, 1.18);
    finalCol = finalCol.add(max(vec3(0.0), finalCol.sub(0.55)).mul(vec3(0.12, 0.09, 0.02)));
    
    const vUv = uv();
    const centeredUv = vUv.sub(0.5).mul(2.0);
    const vign = clamp(float(1.0).sub(dot(centeredUv, centeredUv).mul(0.14)), 0.0, 1.0);
    finalCol = finalCol.mul(vign);
    
    return vec4(finalCol, baseTex.a);
});

export const uToneExposure = uniform(1.2);

// Main post processing graph setup
export function updatePostProcessingPipeline() {
    if (!postProcessing || !scenePass) return;
    const sceneColor = scenePass.getTextureNode('output');
    let outputNode = sceneColor;

    if (isBloomOn) {
        if (!bloomNode) {
            bloomNode = bloom(sceneColor, uBloomStrength, uBloomRadius, uBloomThreshold);
        }
        outputNode = outputNode.add(bloomNode);
    }

    if (isGodRaysEnabled) {
        outputNode = buildGodRaysNode(outputNode);
    }
    
    if (isSummerFilterOn) {
        outputNode = buildGhibliSummerNode(outputNode);
    }
    
    if (typeof uWarpIntensity !== 'undefined' && uWarpIntensity.value > 0) {
        outputNode = buildPortalWarpNode(outputNode);
    }

    postProcessing.outputNode = outputNode;
    postProcessing.needsUpdate = true;
}

export const bloomPass = {
    get enabled() {
        return isBloomOn;
    },
    set enabled(v) {
        if (isBloomOn !== v) {
            isBloomOn = v;
            updatePostProcessingPipeline();
        }
    },
    get strength() {
        return uBloomStrength.value;
    },
    set strength(v) {
        uBloomStrength.value = v;
    },
    get radius() {
        return uBloomRadius.value;
    },
    set radius(v) {
        uBloomRadius.value = v;
    },
    get threshold() {
        return uBloomThreshold.value;
    },
    set threshold(v) {
        uBloomThreshold.value = v;
    }
};

export const godRaysPass = { 
    enabled: !LOW_GFX,
    uniforms: {
        uSunScreenPos: uSunScreenPos,
        uIntensity: uIntensity,
        uDecay: uDecay,
        uDensity: uDensity,
        uWeight: uWeight,
        uSunVisible: uSunVisible,
        uRayColor: uRayColor
    }
};

Object.defineProperty(godRaysPass, 'enabled', {
    get: () => isGodRaysEnabled,
    set: (v) => { isGodRaysEnabled = v; updatePostProcessingPipeline(); }
});

export function initPostProcessingUI() {
    const summerBtn = document.getElementById('summer-toggle');
    if (summerBtn) {
        summerBtn.addEventListener('click', () => {
            isSummerFilterOn = !isSummerFilterOn;
            updatePostProcessingPipeline();
            if (typeof window.params !== 'undefined') window.params.summerFilter = isSummerFilterOn;
        });
    }
}
