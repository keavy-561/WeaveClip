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

(globalThis as any).HTMLCanvasElement = class HTMLCanvasElement {
  width = 300;
  height = 150;
  style = {} as CSSStyleDeclaration;
  nodeName = 'CANVAS';
  nodeType = 1;

  getContext() {
    return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
  }

  toDataURL() {
    return '';
  }
  toBlob() {}
  getBoundingClientRect() {
    return { x: 0, y: 0, width: 300, height: 150, top: 0, bottom: 150, left: 0, right: 300 } as unknown as DOMRect;
  }
  addEventListener() {}
  removeEventListener() {}
  getAttribute() {
    return null;
  }
  setAttribute() {}
  removeAttribute() {}
  getClientRects() {
    return [] as unknown as DOMRectList;
  }
  getElementsByTagName() {
    return [] as unknown as HTMLCollection;
  }
  hasAttribute() {
    return false;
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [] as unknown as NodeListOf<Element>;
  }
  removeChild() {
    return null;
  }
  replaceChild() {
    return null;
  }
  insertBefore() {
    return null;
  }
  appendChild() {
    return null;
  }
  cloneNode() {
    return this;
  }
  compareDocumentPosition() {
    return 0;
  }
  contains() {
    return false;
  }
  hasChildNodes() {
    return false;
  }
  insertAdjacentElement() {
    return null;
  }
  insertAdjacentHTML() {}
  insertAdjacentText() {}
  matches() {
    return false;
  }
  closest() {
    return null;
  }
  getAttributeNode() {
    return null;
  }
  getAttributeNodeNS() {
    return null;
  }
  getElementsByClassName() {
    return [] as unknown as HTMLCollection;
  }
  getElementsByTagNameNS() {
    return [] as unknown as HTMLCollection;
  }
  hasAttributeNS() {
    return false;
  }
  removeAttributeNS() {}
  setAttributeNS() {}
  toggleAttribute() {
    return false;
  }
  webkitMatchesSelector() {
    return false;
  }
  msMatchesSelector() {
    return false;
  }
};

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
