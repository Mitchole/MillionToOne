import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock canvas context for testing
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (contextType: string) => {
    if (
      contextType === 'webgl' ||
      contextType === 'webgl2' ||
      contextType === 'experimental-webgl'
    ) {
      return {
        // WebGL context mock
        drawingBufferWidth: 1024,
        drawingBufferHeight: 768,
        getParameter: vi.fn(),
        getExtension: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        viewport: vi.fn(),
        bindBuffer: vi.fn(),
        createBuffer: vi.fn(),
        deleteBuffer: vi.fn(),
        bufferData: vi.fn(),
        createProgram: vi.fn(),
        createShader: vi.fn(),
        compileShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        getAttribLocation: vi.fn(),
        getUniformLocation: vi.fn(),
        vertexAttribPointer: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        canvas: { width: 1024, height: 768 },
      };
    }

    // 2D context mock
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      canvas: { width: 1024, height: 768 },
    };
  },
});

// Mock getBoundingClientRect
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: () => ({
    width: 1024,
    height: 768,
    top: 0,
    left: 0,
    right: 1024,
    bottom: 768,
    x: 0,
    y: 0,
    toJSON: () => {},
  }),
});

// Mock requestAnimationFrame
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (cb: FrameRequestCallback) => setTimeout(cb, 16),
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
});

// Mock requestIdleCallback
Object.defineProperty(globalThis, 'requestIdleCallback', {
  value: (cb: IdleRequestCallback) => setTimeout(cb, 16),
});

Object.defineProperty(globalThis, 'cancelIdleCallback', {
  value: (id: number) => clearTimeout(id),
});

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
});

// Mock window.matchMedia for reduced motion queries
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
