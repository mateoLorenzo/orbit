'use client'

import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);

  // Base direction matches the original CSS linear-gradient(96.07deg, ...)
  // ~horizontal sweep, slight downward tilt.
  float base = uv.x + (uv.y - 0.5) * 0.11;

  // Two layers of low-frequency flow, drifting slowly.
  float flow1 = fbm(p * 1.4 + vec2(u_time * 0.045, u_time * 0.02));
  float flow2 = fbm(p * 0.7 - vec2(u_time * 0.03, u_time * 0.05));

  float t = base + (flow1 - 0.5) * 0.18 + (flow2 - 0.5) * 0.10;
  t = clamp(t, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t);

  // Same palette as the original gradient.
  vec3 colorA = vec3(0.0, 132.0 / 255.0, 1.0); // rgb(0, 132, 255)
  vec3 colorB = vec3(0.0, 0.0, 0.0);            // black

  vec3 color = mix(colorA, colorB, t);

  gl_FragColor = vec4(color, 1.0);
}
`

export default function CareerProgressShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const posLoc = gl.getAttribLocation(program, 'a_position')
    const resLoc = gl.getUniformLocation(program, 'u_resolution')
    const timeLoc = gl.getUniformLocation(program, 'u_time')

    gl.useProgram(program)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf = 0
    const start = performance.now()
    const render = () => {
      const t = (performance.now() - start) / 1000
      gl.uniform2f(resLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, t)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
