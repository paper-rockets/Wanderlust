// Volumetric Cloud Raymarching GLSL (SpiralNoiseC) — improved three-tone shading

uniform float uTime;
uniform vec3 uSunDir;
uniform float uCloudDensity;
uniform float uCloudHeight;
uniform vec3 uSkyColor;
uniform vec3 uCloudColor;
uniform vec3 uCloudShadowColor;
uniform float uEnableClouds;

varying vec3 vWorldPos;
varying vec3 vViewDir;

const float nudge = 0.739513;
float normalizer = 1.0 / sqrt(1.0 + nudge*nudge);

float SpiralNoiseC(vec3 p) {
    float n = 0.0;
    float iter = 1.0;
    for (int i = 0; i < 5; i++) {
        vec3 spin = sin(p * iter);
        n += -abs(spin.x + spin.y + spin.z) / iter;
        p.xy += vec2(p.y, -p.x) * nudge;
        p.xy *= normalizer;
        p.xz += vec2(p.z, -p.x) * nudge;
        p.xz *= normalizer;
        iter *= 1.733733;
    }
    return n;
}

float getCloud(vec3 pos) {
    vec3 p = pos * 0.0012 + vec3(uTime * 0.015, 0.0, uTime * 0.008);
    float noise = SpiralNoiseC(p);
    float heightFalloff = smoothstep(100.0, 1200.0, pos.y) * smoothstep(5000.0, 2000.0, pos.y);
    float coverage = (uCloudDensity * 0.5 - 0.2);
    float cloudVal = noise * 0.35 + coverage + heightFalloff * 0.4;
    return clamp(cloudVal, 0.0, 1.0);
}

void main() {
    if (uEnableClouds < 0.5 || vViewDir.y < -0.05) {
        discard;
    }

    vec3 dir = normalize(vViewDir);
    float rayT = (uCloudHeight - cameraPosition.y) / max(dir.y, 0.01);

    if (rayT <= 0.0 || rayT > 16000.0) {
        discard;
    }

    vec3 pos = cameraPosition + dir * rayT;
    float cloudDensity = getCloud(pos);

    if (cloudDensity < 0.05) {
        discard;
    }

    // Multi-sample for fake ambient occlusion / depth shading
    float cloudAbove = getCloud(pos + vec3(0.0, 80.0, 0.0));
    float cloudBelow = getCloud(pos - vec3(0.0, 55.0, 0.0));

    // Fake AO: density above & below creates self-shadowing
    float ao = (1.0 - cloudAbove * 0.55) * (1.0 - cloudBelow * 0.35);

    float alpha = smoothstep(0.05, 0.5, cloudDensity);

    // Sun phase: looking toward sun gives warm scatter at cloud edges
    float sunDot = clamp(dot(dir, uSunDir), 0.0, 1.0);
    float scatter = pow(sunDot, 4.0) * (1.0 - cloudDensity * 0.8) * 0.6;

    // Silver lining: thin bright rim when cloud edge faces sun
    float silverLining = pow(sunDot, 10.0) * smoothstep(0.45, 0.1, cloudDensity);

    // Three-tone cel-shade: shadow → mid → highlight
    vec3 shadowCol = mix(uCloudShadowColor, uSkyColor * 0.55, 0.25);
    float shadeLow  = smoothstep(0.2, 0.5, ao);
    float shadeHigh = smoothstep(0.6, 0.85, ao);
    vec3 col = mix(shadowCol, uCloudColor, shadeLow);
    col = mix(col, uCloudColor * 1.22, shadeHigh);

    // Sun scatter warmth at backlit edges
    col += uCloudColor * 0.35 * scatter;
    // Silver lining glow
    col = mix(col, vec3(1.0, 0.97, 0.88) * 1.6, silverLining * 0.7);

    // Blend cloud into sky at soft edges
    col = mix(uSkyColor, col, alpha);

    gl_FragColor = vec4(col, alpha * 0.93);
}
