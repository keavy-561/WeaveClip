import '@testing-library/jest-dom/vitest';

// Polyfill webidl.util.markAsUncloneable for jsdom/undici on Node 20
try {
  const webidl = require('webidl');
  if (webidl?.util && typeof webidl.util.markAsUncloneable !== 'function') {
    webidl.util.markAsUncloneable = () => {};
  }
} catch {
  // noop
}

// Mock CacheStorage to avoid undici/webidl incompatibility in Node 20
if (typeof globalThis.CacheStorage === 'undefined') {
  (globalThis as any).CacheStorage = class CacheStorage {
    constructor() {}
  } as any;
}

// Mock canvas to support lottie-web and other canvas-dependent libs in jsdom
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  globalAlpha = 1;
  imageSmoothingEnabled = true;
  canvas = {
    width: 300,
    height: 150,
  } as unknown as HTMLCanvasElement;

  fillRect() {}
  strokeRect() {}
  clearRect() {}
  getImageData() {
    return { data: new Uint8ClampedArray(0) } as ImageData;
  }
  putImageData() {}
  createImageData() {
    return { data: new Uint8ClampedArray(0) } as ImageData;
  }
  setTransform() {}
  drawImage() {}
  createLinearGradient() {
    return { addColorStop: () => {} } as unknown as CanvasGradient;
  }
  createRadialGradient() {
    return { addColorStop: () => {} } as unknown as CanvasGradient;
  }
  getLineDash() {
    return [] as number[];
  }
  setLineDash() {}
  measureText() {
    return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 } as unknown as TextMetrics;
  }
  fillText() {}
  strokeText() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  arcTo() {}
  ellipse() {}
  rect() {}
  fill() {}
  stroke() {}
  clip() {}
  isPointInPath() {
    return false;
  }
  isPointInStroke() {
    return false;
  }
  scale() {}
  rotate() {}
  translate() {}
  transform() {}
  resetTransform() {}
  getContextAttributes() {
    return {};
  }
  createPattern() {
    return null;
  }
  save() {}
  restore() {}
  createImageBitmap() {
    return Promise.resolve(null as unknown as ImageBitmap);
  }
  roundRect() {}
}

// jsdom 的 HTMLCanvasElement.getContext 依赖原生 canvas 包才返回 2d context。
// 在原型层替换 getContext，让 document.createElement('canvas') 创建的元素
// 也走 mock（替换 globalThis.HTMLCanvasElement 不影响 jsdom 内部实现）。
const CanvasElementProto = (globalThis as any).HTMLCanvasElement?.prototype;
if (CanvasElementProto && typeof CanvasElementProto.getContext === 'function') {
  CanvasElementProto.getContext = function () {
    return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
  };
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
(globalThis as typeof globalThis).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress console errors in tests unless debugging
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalError.apply(console, args);
};
