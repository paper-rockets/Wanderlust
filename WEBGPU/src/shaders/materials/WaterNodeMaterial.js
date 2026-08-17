import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
    Fn, vec2, vec3, vec4, float, step, dot, mix, clamp, pow,
    positionWorld, color, length, cameraPosition, abs, floor, fract, max, smoothstep
} from 'three/tsl';

const mod289_3 = Fn(([x]) => {
    return x.sub(floor(x.mul(1.0 / 289.0)).mul(289.0));
});

const permuteVec3 = Fn(([x]) => {
    return mod289_3(x.mul(34.0).add(1.0).mul(x));
});

export const snoise2D = Fn(([v]) => {
    const C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    
    // First corner
    const i = floor(v.add(dot(v, C.yy)));
    const x0 = v.sub(i).add(dot(i, C.xx));
    
    // Other corners
    const cond = step(x0.y, x0.x);
    const i1 = vec2(cond, float(1.0).sub(cond));
    
    const x12 = vec4(x0.x.add(C.x), x0.y.add(C.x), x0.x.add(C.z), x0.y.add(C.z)).toVar();
    x12.x.subAssign(i1.x);
    x12.y.subAssign(i1.y);
    
    // Permutations
    const i_mod = mod289_3(vec3(i.x, i.y, 0.0)).xy;
    
    const p = permuteVec3(
        permuteVec3(
            vec3(i_mod.y, i_mod.y.add(i1.y), i_mod.y.add(1.0))
        ).add(vec3(i_mod.x, i_mod.x.add(i1.x), i_mod.x.add(1.0)))
    );
    
    const d0 = dot(x0, x0);
    const d1 = dot(x12.xy, x12.xy);
    const d2 = dot(x12.zw, x12.zw);
    const m = max(vec3(float(0.5).sub(d0), float(0.5).sub(d1), float(0.5).sub(d2)), float(0.0)).toVar();
    m.assign(m.mul(m));
    m.assign(m.mul(m));
    
    const x_grad = fract(p.mul(C.w)).mul(2.0).sub(1.0);
    const h = abs(x_grad).sub(0.5);
    const ox = floor(x_grad.add(0.5));
    const a0 = x_grad.sub(ox);
    
    m.mulAssign(vec3(1.79284291400159).sub(vec3(0.85373472095314).mul(a0.mul(a0).add(h.mul(h)))));
    
    const gx = a0.x.mul(x0.x).add(h.x.mul(x0.y));
    const gyz = a0.yz.mul(vec2(x12.x, x12.z)).add(h.yz.mul(vec2(x12.y, x12.w)));
    const g = vec3(gx, gyz.x, gyz.y);
    
    return float(130.0).mul(dot(m, g));
});

export const createWaterNodeMaterial = (uTime) => {
    const waterMat = new MeshStandardNodeMaterial({
        color: new THREE.Color(0x4da9e8),
        roughness: 0.15,
        metalness: 0.15
    });

    waterMat.colorNode = Fn(() => {
        const baseColor = color(new THREE.Color(0x4da9e8)).toVar();

        const uv = positionWorld.xz.mul(0.1);
        const n1 = float(1.0).sub(abs(snoise2D(uv.add(vec2(uTime.mul(0.1), uTime.mul(0.05))))));
        const n2 = float(1.0).sub(abs(snoise2D(uv.mul(1.5).sub(vec2(uTime.mul(0.15), uTime.mul(-0.05))))));

        const rawCaustics = pow(n1, float(6.0)).add(pow(n2, float(6.0)).mul(0.5));

        const simpleTerrainH = snoise2D(positionWorld.xz.mul(0.003)).mul(15.0);
        const deepWater = smoothstep(float(-0.5), float(-4.0), simpleTerrainH);

        const caustics = clamp(rawCaustics, float(0.0), float(1.0)).mul(deepWater);

        baseColor.rgb.assign(mix(baseColor.rgb, vec3(0.9, 0.95, 1.0), caustics.mul(0.5)));

        const dist = length(positionWorld.xz.sub(cameraPosition.xz));
        const depthFade = smoothstep(float(50.0), float(450.0), dist);
        baseColor.rgb.assign(mix(baseColor.rgb, baseColor.rgb.mul(0.65), depthFade));

        return baseColor;
    })();

    return waterMat;
};

