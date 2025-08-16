// src/lib/three/shaders/particles.vert
precision highp float;

/* Built-in attributes and uniforms (position, modelViewMatrix, projectionMatrix) are provided by Three.js. */
attribute float scale;

uniform float u_energyLow;
uniform float u_energyMid;
uniform float u_energyHigh;
uniform float u_time;
uniform float u_intensity;
uniform float u_motionScale;
uniform int u_mode;  /* 0 = nebula, 1 = waves, 2 = strobe */

varying float vEnergy;

void main() {
  float avgE = (u_energyLow + u_energyMid + u_energyHigh) / 3.0;
  vEnergy = avgE * u_intensity;

  vec3 disp = position;

  if (u_mode == 0) {
    // Nebula - soft 3D swirl
    disp += normalize(position + vec3(0.001)) * vEnergy * 0.6;
    disp.z += sin(u_time * 1.3 + position.x * 0.8) * 0.12 * u_motionScale;
    disp.z += cos(u_time * 1.1 + position.y * 0.7) * 0.10 * u_motionScale;
  } else if (u_mode == 1) {
    // Glass Waves - layered sine bands
    float w1 = sin(position.x * 1.25 + u_time * 0.9);
    float w2 = cos(position.y * 1.15 + u_time * 0.7);
    disp.z += (w1 + w2) * (0.18 + vEnergy * 0.4) * u_motionScale;
  } else {
    // Strobe Pulse - minimal displacement, size pulses
    disp += normalize(position + vec3(0.001)) * vEnergy * 0.25;
  }

  vec4 mv = modelViewMatrix * vec4(disp, 1.0);
  gl_Position = projectionMatrix * mv;

  float pulse = 0.5 + 0.5 * sin(u_time * 12.0);
  float size = scale * (1.0 + vEnergy * 2.2);
  if (u_mode == 2) {
    size = scale * (1.0 + vEnergy * 3.0 * smoothstep(0.7, 1.0, pulse));
  }
  gl_PointSize = size;
}
