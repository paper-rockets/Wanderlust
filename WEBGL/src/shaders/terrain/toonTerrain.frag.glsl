uniform float uTime;
uniform vec3 uSunDir;
uniform float uShimmerMult;
uniform sampler2D uSandNoiseMap;
varying vec3 vWorldPos;
varying vec3 vViewPos;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void applyTerrainShaders(inout vec4 fragColor, vec3 normal) {
    vec3 viewDir = normalize(vViewPos);
    vec3 norm = normalize(normal);
    vec3 lightDir = normalize(uSunDir);
    vec3 halfDir = normalize(lightDir + viewDir);
    float lightFacing = clamp(dot(norm, lightDir), 0.0, 1.0);
    float nDotH = clamp(dot(norm, halfDir), 0.0, 1.0);
    
    // 1. Detect Sand / Warm Dune Surface
    float isSand = step(0.45, fragColor.r) * step(fragColor.b, fragColor.r * 0.95);
    
    if (isSand > 0.1) {
        // 1. Broad Radiant Fresnel Edge Glow (Sunlit dune crest rim lighting)
        float rim = 1.0 - clamp(dot(norm, viewDir), 0.0, 1.0);
        float rimGlowStrength = pow(rim, 3.0) * (lightFacing * 0.75 + 0.25) * 0.65;
        vec3 rimGlow = vec3(1.0, 0.82, 0.48) * rimGlowStrength;

        // 2. High-Frequency Sparkling Diamond Sand Grains (Multi-scale Glitter)
        vec2 gridUV1 = floor(vWorldPos.xz * 2.2 + viewDir.xz * 6.0);
        vec2 gridUV2 = floor(vWorldPos.xz * 5.5 - viewDir.xz * 10.0);
        float sparkle1 = hash(gridUV1);
        float sparkle2 = hash(gridUV2 + vec2(7.13, 3.71));
        float sparkle = pow(sparkle1 * sparkle2, 5.0) * 16.0;

        // Texture-assisted micro glints
        vec2 sandUV1 = vWorldPos.xz * 0.15;
        vec2 sandUV2 = vWorldPos.xz * 0.35;
        float texNoise = texture2D(uSandNoiseMap, sandUV1).r * 0.6 + texture2D(uSandNoiseMap, sandUV2).g * 0.4;
        float texSparkle = pow(texNoise, 2.2) * 2.5;

        // 3. Blinn-Phong Specular Sheen
        float specSheen = pow(nDotH, 16.0) * lightFacing * 1.2;
        
        // Combine glittering sparkle with specular sheen & grazing rim sparkle
        float totalGlitter = (specSheen * (sparkle + 0.4) + sparkle * 0.5 + texSparkle * 0.3) * lightFacing;
        vec3 specColor = totalGlitter * vec3(1.0, 0.88, 0.62) * uShimmerMult;

        // Warm ambient terracotta backscatter in dune shadows
        vec3 warmBackscatter = vec3(0.06, 0.02, 0.008) * (1.0 - lightFacing);

        fragColor.rgb += (rimGlow + specColor + warmBackscatter) * isSand;
    }

    // 2. Detect Snow / North Pole Glacial Surface
    float isSnow = step(0.60, fragColor.b) * step(0.50, fragColor.g) * (1.0 - isSand);
    
    if (isSnow > 0.1) {
        // Glacial Rim Lighting (Crisp sky-blue rim highlight)
        float snowRim = 1.0 - clamp(dot(norm, viewDir), 0.0, 1.0);
        float snowRimStrength = pow(snowRim, 4.0) * 0.35;
        vec3 snowRimGlow = vec3(0.65, 0.85, 1.0) * snowRimStrength;
        
        // Diamond Snow & Ice Specular Glitter (Blinn-Phong Specular)
        float mainSnowSpec = clamp(dot(norm, halfDir), 0.0, 1.0);
        mainSnowSpec = pow(mainSnowSpec, 10.0) * 4.0;
        
        float snowGlitter = texture2D(uSandNoiseMap, vWorldPos.xz * 0.12).r * 1.25;
        snowGlitter = pow(clamp(snowGlitter, 0.0, 1.0), 2.0);
        mainSnowSpec *= snowGlitter;
        
        float snowRimSpec = pow(snowRim, 2.8) * snowGlitter * 2.5;
        vec3 snowSpecColor = (mainSnowSpec + snowRimSpec) * vec3(0.85, 0.95, 1.0) * 1.2 * uShimmerMult;
        
        // Apply Diamond Snow Shimmer Effects
        fragColor.rgb += (snowRimGlow + snowSpecColor) * isSnow;
    }
}
