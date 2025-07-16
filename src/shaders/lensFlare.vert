// Lens Flare Vertex Shader - Performance Optimized
precision mediump float;

attribute float size;

uniform float time;
uniform float globalScale;

varying vec3 vColor;
varying float vSize;
varying float vDistance;
varying float vIntensity;
varying vec2 vUv;

void main() {
    // Transform position to view space
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Early distance calculation - single sqrt operation
    vDistance = length(mvPosition.xyz);
    
    // 🌟 ENHANCED VISIBILITY: Increased falloff distance and intensity
    vIntensity = 1.0 - smoothstep(0.0, 100000.0, vDistance);
    
    // 🌟 ENHANCED SIZE: Improved base size and intensity boost
    float baseSize = size * globalScale * 1.5; // Increased base size multiplier
    float intensityBoost = 1.0 + vIntensity * 0.8; // Increased intensity boost
    
    // 🌟 ENHANCED PULSING: More noticeable pulsing effect
    float colorSum = dot(color, vec3(0.299, 0.587, 0.114)); // Perceptual brightness
    float pulseFreq = 0.3 + colorSum * 0.4;
    float pulse = 1.0 + sin(time * pulseFreq) * 0.15; // Increased pulse amplitude
    
    vSize = baseSize * intensityBoost * pulse;
    vColor = color;
    
    // 🌟 ENHANCED SIZE: Increased maximum point size for better visibility
    gl_PointSize = clamp(vSize, 1.0, 256.0);
    
    // Pass normalized position for fragment shader
    vUv = position.xy * 0.001; // Scale down for better precision
    
    // Final position
    gl_Position = projectionMatrix * mvPosition;
}