import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
    Fn, vec2, vec3, vec4, uniform, positionWorld, cameraPosition, normalize,
    dot, clamp, mix, pow, smoothstep, float, sin, cos, fract, abs, floor,
    max, min, sqrt, exp, length
} from 'three/tsl';

export function createProceduralSky() {
    const uTime = uniform(0.0);
    const uSunPosition = uniform(new THREE.Vector3(0.0, 0.5, -0.866).normalize());
    const uSkyColorZenith = uniform(new THREE.Color(0x4a90d9));
    const uSkyColorHorizon = uniform(new THREE.Color(0xb8d4e8));
    const uSunColor = uniform(new THREE.Color(0xfffaeb));
    const uCloudColor = uniform(new THREE.Color(0xfff8f0));
    const uCloudShadowColor = uniform(new THREE.Color(0x8898a8));
    const uCloudCoverage = uniform(0.45);
    const uCloudEdge = uniform(0.07);
    const uCloudSpeed = uniform(0.02);
    const uCloudTurbulence = uniform(0.0);
    const uCloudOpacity = uniform(1.0);
    const uStarDensity = uniform(0.0);
    const uStormDarken = uniform(0.0);
    const uNightFactor = uniform(0.0);
    const uDuskFactor = uniform(0.0);

    const material = new MeshBasicNodeMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,
        fog: false
    });

    const hash12 = Fn(([p]) => {
        return fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453123));
    });

    const valueNoise = Fn(([p]) => {
        const i = floor(p);
        const f = fract(p);
        const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)));
        const a = hash12(i);
        const b = hash12(i.add(vec2(1.0, 0.0)));
        const c = hash12(i.add(vec2(0.0, 1.0)));
        const d = hash12(i.add(vec2(1.0, 1.0)));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    });

    const fbm3 = Fn(([p_in]) => {
        const p = p_in.toVar();
        const val = float(0.0).toVar();
        val.addAssign(valueNoise(p).mul(0.500));
        p.assign(vec2(p.x.mul(0.80).sub(p.y.mul(0.60)), p.x.mul(0.60).add(p.y.mul(0.80))).mul(2.1));
        val.addAssign(valueNoise(p).mul(0.240));
        p.assign(vec2(p.x.mul(0.80).sub(p.y.mul(0.60)), p.x.mul(0.60).add(p.y.mul(0.80))).mul(2.1));
        val.addAssign(valueNoise(p).mul(0.115));
        return val.div(0.855);
    });

    const fbm4 = Fn(([p_in]) => {
        const p = p_in.toVar();
        const val = float(0.0).toVar();
        val.addAssign(valueNoise(p).mul(0.5000));
        p.assign(vec2(p.x.mul(0.80).sub(p.y.mul(0.60)), p.x.mul(0.60).add(p.y.mul(0.80))).mul(2.1));
        val.addAssign(valueNoise(p).mul(0.2400));
        p.assign(vec2(p.x.mul(0.80).sub(p.y.mul(0.60)), p.x.mul(0.60).add(p.y.mul(0.80))).mul(2.1));
        val.addAssign(valueNoise(p).mul(0.1152));
        p.assign(vec2(p.x.mul(0.80).sub(p.y.mul(0.60)), p.x.mul(0.60).add(p.y.mul(0.80))).mul(2.1));
        val.addAssign(valueNoise(p).mul(0.0553));
        return val.div(0.9105);
    });

    const henyeyGreenstein = Fn(([cosTheta, g]) => {
        const g2 = g.mul(g);
        const denom = pow(float(1.0).add(g2).sub(float(2.0).mul(g).mul(cosTheta)), 1.5).mul(4.0 * 3.14159265);
        return float(1.0).sub(g2).div(denom);
    });

    const cloudShapeFn = Fn(([uv, coverage, edge]) => {
        const noise = fbm4(uv);
        return smoothstep(coverage, coverage.add(edge), noise);
    });

    material.colorNode = Fn(() => {
        const dir = normalize(positionWorld.sub(cameraPosition));
        const elevation = dir.y;
        const normSunDir = normalize(uSunPosition);
        const sunDot = max(dot(dir, normSunDir), float(0.0));

        // Atmosphere day gradient (thinner, clearer horizon transition)
        const tDay = smoothstep(0.0, 0.35, elevation);
        const dayColor = mix(uSkyColorHorizon, uSkyColorZenith, tDay);

        // Ghibli Dusk 5-stop anime gradient (cerulean zenith -> twilight blue -> soft lavender -> fiery amber -> gold)
        const duskGold = vec3(1.0, 0.72, 0.20);
        const duskAmber = vec3(0.98, 0.42, 0.10);
        const duskMid = vec3(0.48, 0.38, 0.52);
        const duskUpper = vec3(0.22, 0.46, 0.68);
        const duskZenith = vec3(0.12, 0.40, 0.70);

        const e1 = smoothstep(-0.05, 0.12, elevation);
        const e2 = smoothstep(0.10, 0.32, elevation);
        const e3 = smoothstep(0.30, 0.58, elevation);
        const e4 = smoothstep(0.55, 0.85, elevation);

        const duskSky = mix(duskGold, duskAmber, e1).toVar();
        duskSky.assign(mix(duskSky, duskMid, e2));
        duskSky.assign(mix(duskSky, duskUpper, e3));
        duskSky.assign(mix(duskSky, duskZenith, e4));

        const horizonBand = float(1.0).sub(smoothstep(0.0, 0.28, elevation));
        const sunWarmth = vec3(1.0, 0.60, 0.18);
        duskSky.assign(mix(duskSky, sunWarmth, sunDot.mul(sunDot).mul(horizonBand).mul(0.75)));


        // Blend day with dusk
        const sky = mix(dayColor, duskSky, uDuskFactor).toVar();

        // Brighter localized sun corona & crisp sun disc
        const sunGlow = pow(sunDot, 16.0);
        const sunDisc = pow(sunDot, 256.0).mul(3.5);
        const sunContrib = uSunColor.mul(sunGlow.mul(0.6).add(sunDisc.mul(0.8))).mul(float(1.0).sub(uDuskFactor.mul(0.2)));

        // Night darkening applied to sky color (matches WebGL)
        const nightSkyColor = vec3(0.03, 0.05, 0.15);
        sky.assign(mix(sky, nightSkyColor, uNightFactor.mul(0.92)));

        // Storm darkening (multiplicative, matches WebGL)
        sky.assign(sky.mul(float(1.0).sub(uStormDarken.mul(0.55))));

        // Add sun contribution, attenuated by night factor to prevent sun glow in night mode
        sky.assign(sky.add(sunContrib.mul(float(1.0).sub(uNightFactor))));

        // Procedural Clouds (Thinned at the horizon so it does not block the sun)
        const cloudAlpha = float(0.0).toVar();
        const cloudFinal = vec3(0.0).toVar();

        const cloudUV = dir.xz.div(clamp(dir.y.add(0.12), 0.05, 1.0));
        const windOffset = vec2(uTime.mul(uCloudSpeed), uTime.mul(uCloudSpeed).mul(0.3));

        const warpUV = cloudUV.mul(0.6).add(windOffset.mul(0.3));
        const warpX = fbm3(warpUV);
        const warpY = fbm3(warpUV.add(vec2(5.2, 1.3)));
        const warp = vec2(warpX, warpY).sub(0.5).mul(1.4);

        const mainUV = cloudUV.add(warp).mul(1.6).add(windOffset);
        const threshold = float(1.0).sub(clamp(uCloudCoverage, float(0.05), float(0.95)));
        const mainCloud = cloudShapeFn(mainUV, threshold, uCloudEdge).toVar();

        const detailUV = cloudUV.mul(3.2).add(windOffset.mul(1.5)).add(vec2(100.0));
        const detailCloud = cloudShapeFn(detailUV, threshold.add(0.08), uCloudEdge.mul(0.7));
        mainCloud.assign(max(mainCloud, detailCloud.mul(0.5)));

        // Height mask: Thinned at the horizon (elevation < 0.12) to reveal the sun and distant vista
        const heightMask = smoothstep(0.03, 0.12, dir.y).mul(float(1.0).sub(smoothstep(0.55, 0.92, dir.y)));
        mainCloud.mulAssign(heightMask);

        const sunDir2D = normalize(uSunPosition.xz.add(vec2(0.001)));
        const shadowUV = mainUV.sub(sunDir2D.mul(0.25));
        const shadowCloud = cloudShapeFn(shadowUV, threshold.add(0.06), uCloudEdge.mul(1.5)).mul(heightMask);

        const litFactor = smoothstep(0.0, 0.45, clamp(mainCloud.sub(shadowCloud.mul(0.7)), 0.0, 1.0));

        const litColor = uCloudColor.toVar();
        const shadowColor = uCloudShadowColor.toVar();

        const cosTheta = max(dot(dir, normSunDir), float(0.0));
        const hgPhase = henyeyGreenstein(cosTheta, float(0.68));

        // Crepuscular Sun Rays streaming around cloud silhouettes & through cloud gaps
        const stepVec = sunDir2D.mul(0.35);
        const raySample1 = cloudShapeFn(mainUV.sub(stepVec.mul(0.6)), threshold, uCloudEdge);
        const raySample2 = cloudShapeFn(mainUV.sub(stepVec.mul(1.2)), threshold, uCloudEdge);
        const raySample3 = cloudShapeFn(mainUV.sub(stepVec.mul(1.8)), threshold, uCloudEdge);
        const rayOcclusion = raySample1.add(raySample2).add(raySample3).div(3.0).mul(heightMask);

        const crepuscularShaft = float(1.0).sub(rayOcclusion.mul(0.85)).mul(pow(cosTheta, 6.0)).mul(hgPhase.mul(0.3).add(0.7));
        const shaftColor = mix(uSunColor, duskGold, uDuskFactor.mul(0.6));
        sky.assign(sky.add(shaftColor.mul(crepuscularShaft).mul(0.55).mul(float(1.0).sub(uNightFactor))));

        // Cloud edge sunlight wrap (sun rays bending around cloud perimeter)
        const edgeGlow = smoothstep(float(0.02), float(0.35), mainCloud).mul(float(1.0).sub(smoothstep(float(0.35), float(0.80), mainCloud)));
        const rimWrap = edgeGlow.mul(pow(cosTheta, 4.0)).mul(hgPhase.mul(0.5).add(0.5));
        const rimColor = mix(uSunColor, duskGold, uDuskFactor.mul(0.75));
        litColor.addAssign(rimColor.mul(rimWrap).mul(1.2));

        const duskLit = vec3(1.0, 0.68, 0.42);
        const duskShadow = vec3(0.38, 0.28, 0.50);
        litColor.assign(mix(litColor, duskLit, uDuskFactor.mul(hgPhase.mul(0.25).add(0.6))));
        shadowColor.assign(mix(shadowColor, duskShadow, uDuskFactor.mul(0.7)));

        const rimLight = pow(cosTheta, 32.0).mul(mainCloud);
        litColor.addAssign(uSunColor.mul(rimLight).mul(0.5));

        const moonlitCloud = vec3(0.32, 0.38, 0.55);
        const moonlitShadow = vec3(0.12, 0.15, 0.28);
        litColor.assign(mix(litColor, moonlitCloud, uNightFactor.mul(0.88)));
        shadowColor.assign(mix(shadowColor, moonlitShadow, uNightFactor.mul(0.88)));

        cloudFinal.assign(mix(shadowColor, litColor, litFactor));
        cloudAlpha.assign(mainCloud);

        const finalColor = mix(sky, cloudFinal, cloudAlpha.mul(uCloudOpacity));
        return vec4(finalColor, 1.0);
    })();

    const geometry = new THREE.SphereGeometry(20000, 64, 32);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1000;
    mesh.frustumCulled = false;

    return {
        mesh,
        material,
        uniforms: {
            uTime, uSunPosition, uSkyColorZenith, uSkyColorHorizon, uSunColor,
            uCloudColor, uCloudShadowColor, uCloudCoverage, uCloudEdge, uCloudSpeed,
            uCloudTurbulence, uCloudOpacity, uStarDensity, uStormDarken, uNightFactor, uDuskFactor
        }
    };
}
