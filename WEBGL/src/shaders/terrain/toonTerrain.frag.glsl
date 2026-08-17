uniform float uTime;
uniform vec3 uSunDir;
uniform float uShimmerMult;
uniform sampler2D uSandNoiseMap;
varying vec3 vWorldPos;
varying vec3 vViewPos;

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
        // Procedural micro sand ripples aligned perpendicular to wind (cos=0.796, sin=0.605)
        vec2 duneUV = vec2(vWorldPos.x * 0.796 + vWorldPos.z * 0.605, -vWorldPos.x * 0.605 + vWorldPos.z * 0.796);
        float rippleWarp = sin(duneUV.y * 0.08) * 1.5;
        float ripplePattern = sin(duneUV.x * 0.45 + rippleWarp);
        float rippleRaking = clamp(ripplePattern * 0.10 * (1.2 - lightFacing * 0.8), -0.08, 0.08);
        fragColor.rgb *= (1.0 + rippleRaking);

        // Dune Rim Lighting (Fresnel glow along grazing angles and dune ridges)
        float rim = 1.0 - clamp(dot(norm, viewDir), 0.0, 1.0);
        float rimStrength = pow(rim, 4.0) * (lightFacing * 0.7 + 0.3) * 0.40;
        vec3 rimGlow = vec3(1.0, 0.75, 0.42) * rimStrength;
        
        // Journey Sand Specular Glitter (Blinn-Phong Specular)
        float mainSpec = pow(nDotH, 24.0) * lightFacing * 0.85;
        
        vec2 sandUV1 = vWorldPos.xz * 0.08 + uTime * 0.003;
        vec2 sandUV2 = vWorldPos.xz * 0.22 - uTime * 0.005;
        float textureGlitter = texture2D(uSandNoiseMap, sandUV1).r * 0.65 + texture2D(uSandNoiseMap, sandUV2).g * 0.55;
        textureGlitter = pow(clamp(textureGlitter, 0.0, 1.0), 3.0);
        mainSpec *= textureGlitter;
        
        float rimSpec = pow(rim, 3.0) * textureGlitter * lightFacing * 0.45;
        vec3 specColor = (mainSpec + rimSpec) * vec3(1.0, 0.85, 0.58) * uShimmerMult;
        
        // Warm ambient terracotta backscatter in dune shadows
        vec3 warmBackscatter = vec3(0.08, 0.03, 0.01) * (1.0 - lightFacing);
        
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
