"use client";

import { useEffect, useRef, useState } from "react";

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * .5 + .5;
    gl_Position = vec4(aPosition, 0., 1.);
  }
`;

const fragmentSource = `
  precision mediump float;
  uniform sampler2D uPortrait;
  uniform sampler2D uDepth;
  uniform sampler2D uReflection;
  uniform vec2 uPointer;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 uv = vUv - uPointer * (.008 + depth * .032);
    vec4 image = texture2D(uPortrait, uv);
    vec4 reflection = texture2D(uReflection, uv - uPointer * .012);
    image.rgb = mix(image.rgb, image.rgb + reflection.rgb * .28, reflection.a);
    gl_FragColor = image;
  }
`;

export default function Portrait({ introduce, video, mobileVideo }: { introduce: boolean; video: string; mobileVideo: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const media = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const element = media.current;
    if (!element || !element.parentElement) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      if (!visible || document.hidden || motion.matches) element.pause();
      else void element.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element.parentElement);
    element.addEventListener("canplay", update);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      observer.disconnect();
      element.removeEventListener("canplay", update);
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
      element.pause();
    };
  }, []);

  useEffect(() => {
    if (!zoomed) return;
    const exit = () => setZoomed(false);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") exit(); };
    const wheel = (event: WheelEvent) => {
      if (event.deltaY > 0) {
        event.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("scroll", exit, { passive: true });
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", exit);
    };
  }, [zoomed]);

  useEffect(() => {
    const element = canvas.current;
    if (!element || matchMedia("(pointer: coarse), (max-width: 767px), (prefers-reduced-motion: reduce)").matches) return;
    const gl = element.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const program = gl.createProgram();
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    const buffer = gl.createBuffer();
    const disposeProgram = () => {
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
    };
    if (!program || !vertex || !fragment || !buffer) return disposeProgram();

    gl.shaderSource(vertex, vertexSource);
    gl.shaderSource(fragment, fragmentSource);
    gl.compileShader(vertex);
    gl.compileShader(fragment);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return disposeProgram();

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const pointer = gl.getUniformLocation(program, "uPointer");
    const textures = [
      { name: "uPortrait", src: "/home/portrait.webp" },
      { name: "uDepth", src: "/home/depth.webp" },
      { name: "uReflection", src: "/home/shades-reflection.png" },
    ].map((source, index) => {
      const texture = gl.createTexture();
      const image = new Image();
      const ready = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = source.src;
      });
      return { ...source, index, texture, image, ready };
    });

    let disposed = false;
    let animation = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;

    function onPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !element || element.closest("[inert]")) return;
      targetX = (event.clientX / innerWidth) * 2 - 1;
      targetY = 1 - (event.clientY / innerHeight) * 2;
      if (!animation) animation = requestAnimationFrame(draw);
    }

    function draw() {
      animation = 0;
      if (!gl || !element || disposed) return;
      x += (targetX - x) * .095;
      y += (targetY - y) * .095;
      gl.uniform2f(pointer, x, y);
      element.parentElement?.style.setProperty("--lens-x", `${x * 1.6}%`);
      element.parentElement?.style.setProperty("--lens-y", `${y * -1.6}%`);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .004) {
        animation = requestAnimationFrame(draw);
      }
    }

    Promise.all(textures.map(({ ready }) => ready)).then(() => {
      if (disposed) return;
      for (const { name, index, texture, image } of textures) {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.uniform1i(gl.getUniformLocation(program, name), index);
      }
      gl.viewport(0, 0, element.width, element.height);
      draw();
      element.dataset.ready = "true";
      window.addEventListener("pointermove", onPointer);
    }).catch(() => {});

    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      window.removeEventListener("pointermove", onPointer);
      for (const { texture } of textures) gl.deleteTexture(texture);
      delete element.dataset.ready;
      disposeProgram();
    };
  }, []);

  return (
    <div className="jh-portrait" data-intro={introduce && videoReady && !zoomed} data-zoomed={zoomed}>
      <img src="/home/hero.webp" alt="" fetchPriority="high" draggable={false} />
      <canvas ref={canvas} width={1200} height={864} aria-hidden="true" />
      <div className="jh-lenses" data-ready={videoReady} aria-hidden="true">
        <video ref={media} muted loop playsInline preload="auto" onPlaying={() => setVideoReady(true)} onError={() => setVideoReady(false)}>
          <source media="(max-width: 900px)" src={mobileVideo} type="video/mp4" />
          <source src={video} type="video/mp4" />
        </video>
      </div>
      {videoReady && (
        <button className="jh-lens-button" type="button" aria-label={zoomed ? "Zoom out of the glasses video" : "Zoom into the glasses video"}
          aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)} />
      )}
    </div>
  );
}
