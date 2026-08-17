import * as THREE from 'three';

const vertexShader = /* glsl */`
varying vec3 vDirection;
varying vec3 vWorldPos;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    // Direction from camera to sky dome vertex
    vDirection = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */`
precision highp float;

uniform float uTime;
uniform vec3 uSunPosition; // Normalized vector pointing to sun
uniform vec3 uSkyColorZenith;
uniform vec3 uSkyColorHorizon;
uniform vec3 uSunColor;
uniform vec3 uCloudColor;
uniform vec3 uCloudShadowColor;
uniform float uCloudCoverage;
uniform float uCloudEdge;
uniform float uCloudSpeed;
uniform float uCloudTurbulence;
uniform float uCloudOpacity;
uniform float uStarDensity;
uniform float uStormDarken;
uniform float uNightFactor;
uniform float uDuskFactor;

varying vec3 vDirection;
varying vec3 vWorldPos;

// ---- Noise primitives (GLSL ES 1.00 compliant) ----

float hash12(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Unrolled 3-octave FBM
float fbm3(vec2 p) {
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    float val = 0.0;
    val += 0.500 * valueNoise(p); p = rot * p * 2.1;
    val += 0.240 * valueNoise(p); p = rot * p * 2.1;
    val += 0.115 * valueNoise(p);
    return val / 0.855;
}

// Unrolled 4-octave FBM
float fbm4(vec2 p) {
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    float val = 0.0;
    val += 0.5000 * valueNoise(p); p = rot * p * 2.1;
    val += 0.2400 * valueNoise(p); p = rot * p * 2.1;
    val += 0.1152 * valueNoise(p); p = rot * p * 2.1;
    val += 0.0553 * valueNoise(p);
    return val / 0.9105;
}

// Henyey-Greenstein phase scattering for silver lining effect
float henyeyGreenstein(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// ---- Stars & Milky Way ----

float singleStarLayer(vec2 uv, float density, float seed) {
    vec2 cell = floor(uv);
    vec2 f = fract(uv);
    float h = hash12(cell + seed);

    if (h > density) return 0.0;

    // Jitter star position within cell
    vec2 starPos = vec2(hash12(cell + seed + 0.1), hash12(cell + seed + 0.2));
    float d = length(f - starPos);

    // Soft star disc (1.0 - smoothstep min, max)
    float size = 0.02 + hash12(cell + seed + 0.3) * 0.06;
    float star = 1.0 - smoothstep(size * 0.3, size, d);

    float brightness = 0.3 + hash12(cell + seed + 0.4) * 0.7;
    float twinkle = 0.6 + 0.4 * sin(uTime * (0.2 + h * 0.3) + h * 6.2831);

    return star * brightness * twinkle;
}

float starField(vec3 dir, float starDensity) {
    if (dir.y < 0.0) return 0.0;

    float theta = atan(dir.z, dir.x);
    float phi = acos(clamp(dir.y, -1.0, 1.0));
    vec2 starUV = vec2(theta * 5.0, phi * 8.0);
    starUV += uTime * 0.0008 * vec2(0.3, 0.1);

    float s1 = singleStarLayer(starUV * 40.0, 0.04, 0.0);
    float s2 = singleStarLayer(starUV * 70.0, 0.025, 100.0);
    float s3 = singleStarLayer(starUV * 120.0, 0.015, 200.0);

    float stars = s1 + s2 * 0.6 + s3 * 0.3;

    float horizonFade = smoothstep(0.0, 0.2, dir.y);
    float zenithBoost = smoothstep(0.1, 0.7, dir.y) * 0.3 + 0.7;

    return stars * horizonFade * zenithBoost * starDensity;
}

float milkyWay(vec3 dir, float nightFactor) {
    if (dir.y < 0.05) return 0.0;

    float angle = 0.6;
    float ca = cos(angle), sa = sin(angle);
    vec2 bandUV = vec2(dir.x * ca + dir.z * sa, dir.y) * 3.0;

    float band = fbm3(bandUV * 2.0 + vec2(uTime * 0.002, 0.0));
    float bandMask = exp(-6.0 * bandUV.x * bandUV.x);
    float heightFade = smoothstep(0.1, 0.5, dir.y) * (1.0 - smoothstep(0.6, 0.95, dir.y));

    return band * bandMask * heightFade * 0.14 * nightFactor;
}

// ---- Atmosphere ----

vec3 atmosphere(vec3 dir, float duskFactor, float nightFactor) {
    float elevation = dir.y;
    vec3 normSunDir = normalize(uSunPosition);
    float sunDot = max(dot(dir, normSunDir), 0.0);

    // --- 1. Day Sky: horizon -> zenith gradient (thinner, clearer horizon transition) ---
    vec3 dayColor;
    if (elevation >= 0.0) {
        float t = smoothstep(0.0, 0.35, elevation);
        dayColor = mix(uSkyColorHorizon, uSkyColorZenith, t);
    } else {
        float t = smoothstep(0.0, -0.4, elevation);
        dayColor = mix(uSkyColorHorizon, uSkyColorZenith * 0.6, t);
    }

    // --- 2. Ghibli Dusk Sky: 5-stop anime gradient (cerulean zenith -> twilight blue -> soft lavender -> fiery amber -> gold) ---
    vec3 duskGold    = vec3(1.0, 0.72, 0.20);  // Radiant golden horizon
    vec3 duskAmber   = vec3(0.98, 0.42, 0.10);  // Deep fiery amber
    vec3 duskMid     = vec3(0.48, 0.38, 0.52);  // Soft twilight transition
    vec3 duskUpper   = vec3(0.22, 0.46, 0.68);  // Vibrant twilight blue
    vec3 duskZenith  = vec3(0.12, 0.40, 0.70);  // Crisp anime cerulean zenith

    float e1 = smoothstep(-0.05, 0.12, elevation);
    float e2 = smoothstep(0.10, 0.32, elevation);
    float e3 = smoothstep(0.30, 0.58, elevation);
    float e4 = smoothstep(0.55, 0.85, elevation);

    vec3 duskSky = mix(duskGold, duskAmber, e1);
    duskSky = mix(duskSky, duskMid, e2);
    duskSky = mix(duskSky, duskUpper, e3);
    duskSky = mix(duskSky, duskZenith, e4);

    // Localized sun horizon warmth glow
    float horizonBand = 1.0 - smoothstep(0.0, 0.28, elevation);
    vec3 sunWarmth = vec3(1.0, 0.60, 0.18);
    duskSky = mix(duskSky, sunWarmth, sunDot * sunDot * horizonBand * 0.75);

    // Blend day with dusk
    vec3 skyColor = mix(dayColor, duskSky, duskFactor);

    // Brighter localized sun corona & crisp sun disc
    float sunGlow = pow(sunDot, 16.0);
    float sunDisc = pow(sunDot, 256.0) * 3.5;
    vec3 sunContrib = uSunColor * (sunGlow * 0.6 + sunDisc * 0.8);
    sunContrib *= (1.0 - duskFactor * 0.2);

    // Night Darkening
    vec3 nightSkyColor = vec3(0.03, 0.05, 0.15);
    skyColor = mix(skyColor, nightSkyColor, nightFactor * 0.92);

    // Storm Darkening
    skyColor *= (1.0 - uStormDarken * 0.55);

    return skyColor + sunContrib;
}

// ---- Clouds ----

float cloudShape(vec2 uv, float coverage, float edge) {
    float noise = fbm4(uv);
    return smoothstep(coverage, coverage + edge, noise);
}

void main() {
    vec3 dir = normalize(vDirection);

    // Dynamic phase factors evaluated directly from sun elevation if uniforms not fed
    float sunElevY = uSunPosition.y;
    float nightFactor = max(uNightFactor, smoothstep(0.02, -0.22, sunElevY));
    float dayFactor = smoothstep(0.02, 0.20, sunElevY);
    float duskFactor = max(uDuskFactor, (1.0 - dayFactor) * (1.0 - nightFactor * 0.8));
    float starDensity = max(uStarDensity, smoothstep(0.05, -0.18, sunElevY));

    // --- 1. Atmosphere Gradient ---
    vec3 sky = atmosphere(dir, duskFactor, nightFactor);

    // --- 2. Stars & Milky Way ---
    float stars = starField(dir, starDensity);
    float mw = milkyWay(dir, nightFactor);
    vec3 starColor = vec3(0.95, 0.95, 1.0);
    sky += starColor * (stars * 1.6) + vec3(0.55, 0.65, 0.95) * mw;

    // --- 3. Procedural Clouds (Thinned at the horizon so it does not block the sun) ---
    float cloudAlpha = 0.0;
    vec3 cloudFinal = vec3(0.0);

    if (dir.y > 0.02) {
        vec2 cloudUV = dir.xz / (dir.y + 0.12);
        vec2 windOffset = uTime * uCloudSpeed * vec2(1.0, 0.3);

        // Domain warping for organic cumulus forms
        vec2 warpUV = cloudUV * 0.6 + windOffset * 0.3;
        float warpX = fbm3(warpUV);
        float warpY = fbm3(warpUV + vec2(5.2, 1.3));
        vec2 warp = (vec2(warpX, warpY) - 0.5) * 1.4;

        vec2 mainUV = (cloudUV + warp) * 1.6 + windOffset;
        float threshold = 1.0 - clamp(uCloudCoverage, 0.05, 0.95);
        float mainCloud = cloudShape(mainUV, threshold, uCloudEdge);

        // Detail cloud layer
        vec2 detailUV = cloudUV * 3.2 + windOffset * 1.5 + vec2(100.0);
        float detailCloud = cloudShape(detailUV, threshold + 0.08, uCloudEdge * 0.7);
        mainCloud = max(mainCloud, detailCloud * 0.5);

        // Storm turbulence
        if (uCloudTurbulence > 0.01) {
            float turb = fbm3(mainUV * 3.5 + vec2(uTime * 0.06, uTime * 0.03));
            mainCloud = mix(mainCloud, max(mainCloud, turb * 0.8), uCloudTurbulence * 0.5);
            mainCloud = smoothstep(0.1, 0.5, mainCloud);
        }

        // Height mask: Thinned at the horizon (elevation < 0.12) to reveal the sun and distant vista
        float heightMask = smoothstep(0.03, 0.12, dir.y) * (1.0 - smoothstep(0.55, 0.92, dir.y));
        mainCloud *= heightMask;

        // Faked volume & shadow
        vec2 sunDir2D = normalize(uSunPosition.xz + vec2(0.001));
        vec2 shadowUV = mainUV - sunDir2D * 0.25;
        float shadowCloud = cloudShape(shadowUV, threshold + 0.06, uCloudEdge * 1.5) * heightMask;

        float litFactor = clamp(mainCloud - shadowCloud * 0.7, 0.0, 1.0);
        litFactor = smoothstep(0.0, 0.45, litFactor);

        // Ghibli cloud color bands
        vec3 litColor = uCloudColor;
        vec3 shadowColor = uCloudShadowColor;

        float cosTheta = max(dot(dir, normalize(uSunPosition)), 0.0);
        float hgPhase = henyeyGreenstein(cosTheta, 0.68);

        // Crepuscular Sun Rays streaming around cloud silhouettes & through cloud gaps
        vec2 stepVec = sunDir2D * 0.35;
        float raySample1 = cloudShape(mainUV - stepVec * 0.6, threshold, uCloudEdge);
        float raySample2 = cloudShape(mainUV - stepVec * 1.2, threshold, uCloudEdge);
        float raySample3 = cloudShape(mainUV - stepVec * 1.8, threshold, uCloudEdge);
        float rayOcclusion = ((raySample1 + raySample2 + raySample3) / 3.0) * heightMask;

        float crepuscularShaft = (1.0 - rayOcclusion * 0.85) * pow(cosTheta, 6.0) * (hgPhase * 0.3 + 0.7);
        vec3 shaftColor = mix(uSunColor, vec3(1.0, 0.72, 0.20), uDuskFactor * 0.6);
        sky += shaftColor * (crepuscularShaft * 0.55) * (1.0 - uNightFactor);

        // Cloud edge sunlight wrap (sun rays bending around cloud perimeter)
        float edgeGlow = smoothstep(0.02, 0.35, mainCloud) * (1.0 - smoothstep(0.35, 0.80, mainCloud));
        float rimWrap = edgeGlow * pow(cosTheta, 4.0) * (hgPhase * 0.5 + 0.5);
        vec3 rimColor = mix(uSunColor, vec3(1.0, 0.72, 0.20), uDuskFactor * 0.75);
        litColor += rimColor * (rimWrap * 1.2);

        // Dusk Ghibli cloud tinting
        vec3 duskLit = vec3(1.0, 0.68, 0.42);
        vec3 duskShadow = vec3(0.38, 0.28, 0.50);
        litColor = mix(litColor, duskLit, duskFactor * (0.6 + hgPhase * 0.25));
        shadowColor = mix(shadowColor, duskShadow, duskFactor * 0.7);

        // Silver lining highlight
        float rimLight = pow(cosTheta, 32.0) * mainCloud;
        litColor += uSunColor * rimLight * 0.5;

        // Night moonlit cloud tinting
        vec3 moonlitCloud = vec3(0.32, 0.38, 0.55);
        vec3 moonlitShadow = vec3(0.12, 0.15, 0.28);
        litColor = mix(litColor, moonlitCloud, nightFactor * 0.88);
        shadowColor = mix(shadowColor, moonlitShadow, nightFactor * 0.88);

        cloudFinal = mix(shadowColor, litColor, litFactor);
        cloudAlpha = mainCloud;
    }

    // --- 4. Compositing ---
    vec3 finalColor = mix(sky, cloudFinal, cloudAlpha * uCloudOpacity);

    // Opaque background output
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createProceduralSky() {
    const uniforms = {
        uTime:              { value: 0.0 },
        uSunPosition:       { value: new THREE.Vector3(0.0, 0.5, -0.866).normalize() },
        uSkyColorZenith:    { value: new THREE.Color(0x4a90d9) },
        uSkyColorHorizon:   { value: new THREE.Color(0xb8d4e8) },
        uSunColor:          { value: new THREE.Color(0xfffaeb) },
        uCloudColor:        { value: new THREE.Color(0xfff8f0) },
        uCloudShadowColor:  { value: new THREE.Color(0x8898a8) },
        uCloudCoverage:     { value: 0.45 },
        uCloudEdge:         { value: 0.07 },
        uCloudSpeed:        { value: 0.02 },
        uCloudTurbulence:   { value: 0.0 },
        uCloudOpacity:      { value: 1.0 },
        uStarDensity:       { value: 0.0 },
        uStormDarken:       { value: 0.0 },
        uNightFactor:       { value: 0.0 },
        uDuskFactor:        { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        transparent: false,
        depthWrite: false,
        depthTest: true,
    });

    const geometry = new THREE.SphereGeometry(20000, 64, 32);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1000;
    mesh.frustumCulled = false;

    return { mesh, material, uniforms };
}
