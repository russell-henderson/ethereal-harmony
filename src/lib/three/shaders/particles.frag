// src/lib/three/shaders/particles.frag
precision highp float;

uniform vec3 u_baseColor;
uniform vec3 u_accentColor;
uniform float u_time;
uniform int u_mode; /* 0 = nebula, 1 = waves, 2 = strobe */

varying float vEnergy;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;

  vec3 color = mix(u_baseColor, u_accentColor, clamp(vEnergy * 1.2, 0.0, 1.0));

  if (u_mode == 2) {
    // Strobe Pulse - quick flash on highs
    float pulse = 0.5 + 0.5 * sin(u_time * 12.0);
    color *= 0.8 + 0.6 * smoothstep(0.75, 1.0, pulse);
  }

  float edge = smoothstep(0.5, 0.3, d);
  gl_FragColor = vec4(color, edge);
}
