// Lens Flare Fragment Shader - Performance Optimized
precision mediump float;

uniform sampler2D lensFlareTexture;
uniform bool useTexture;
uniform float time;
uniform float intensity;
uniform vec2 resolution;

varying vec3 vColor;
varying float vSize;
varying float vDistance;
varying float vIntensity;
varying vec2 vUv;

// Optimized procedural lens flare function
vec4 proceduralLensFlare(vec2 uv, vec3 color, float intensity) {
    // Single distance calculation
    float dist = length(uv);
    
    // Early discard for performance
    if (dist > 1.0) {
        discard;
    }
    
    // Optimized core calculation
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    
    // Simplified glow layers
    float innerGlow = (1.0 - smoothstep(0.0, 0.4, dist)) * 0.6;
    float outerGlow = (1.0 - smoothstep(0.0, 0.9, dist)) * 0.2;
    
    // Optimized lens flare spikes
    float angle = atan(uv.y, uv.x);
    float spikes = max(abs(cos(angle * 2.0)), abs(sin(angle * 2.0))) * 0.5;
    float spikeIntensity = (1.0 - smoothstep(0.0, 0.7, dist)) * spikes * 0.3;
    
    // Combine components with single multiply
    float totalIntensity = (core + innerGlow + outerGlow + spikeIntensity) * intensity;
    
    return vec4(color * totalIntensity, totalIntensity);
}

// Optimized texture-based lens flare function
vec4 textureLensFlare(vec2 uv, vec3 color, float intensity) {
    // Sample texture with clamped coordinates
    vec2 texCoord = clamp(uv * 0.5 + 0.5, 0.0, 1.0);
    vec4 flareTexture = texture2D(lensFlareTexture, texCoord);
    
    // Single multiply for color tinting
    vec3 tintedColor = flareTexture.rgb * color;
    float alpha = flareTexture.a * intensity;
    
    return vec4(tintedColor, alpha);
}

void main() {
    // Convert gl_PointCoord to centered UV coordinates
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    
    // Choose lens flare method
    vec4 finalColor;
    
    if (useTexture) {
        finalColor = textureLensFlare(uv, vColor, vIntensity);
    } else {
        finalColor = proceduralLensFlare(uv, vColor, vIntensity);
    }
    
    // Optimized distance-based fade
    float distanceFade = 1.0 - smoothstep(12000.0, 18000.0, vDistance);
    finalColor.a *= distanceFade;
    
    // Reduced shimmer calculation
    float shimmer = 1.0 + sin(time * 1.5 + vUv.x * 5.0) * 0.03;
    finalColor.rgb *= shimmer;
    
    // Performance-optimized alpha test
    if (finalColor.a < 0.02) {
        discard;
    }
    
    // Tone mapping for better color reproduction
    finalColor.rgb = finalColor.rgb / (finalColor.rgb + vec3(1.0));
    
    gl_FragColor = finalColor;
}