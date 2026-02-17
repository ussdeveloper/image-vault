/**
 * Simple hash function to convert string seed to numeric value.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministic PRNG following Mulberry32.
 */
function getPRNG(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * XOR dynamic cipher using seed.
 */
function xorCipher(text, seed) {
  if (!seed) return text;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ seed.charCodeAt(i % seed.length));
  }
  return result;
}

/**
 * Hides text within the pixel data of an image using LSB (Least Significant Bit) steganography.
 * @param {HTMLCanvasElement} canvas - Canvas containing the image data.
 * @param {string} text - The text to hide.
 * @param {string} seed - Optional seed for encryption and bit placement.
 * @returns {string} - Data URL of the new image.
 */
export function injectText(canvas, text, seed = '') {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert text to Base64
  let processedText = btoa(unescape(encodeURIComponent(text)));
  // Pre-encrypt with XOR if seed is provided
  if (seed) processedText = xorCipher(processedText, seed);
  
  const fullMessage = processedText + '##END##';
  
  // Convert full message to bits
  const bits = [];
  for (let i = 0; i < fullMessage.length; i++) {
    const charCode = fullMessage.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      bits.push((charCode >> j) & 1);
    }
  }

  // Get available pixel indices (skipping Alpha)
  const availableIndices = [];
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 !== 0) availableIndices.push(i);
  }

  if (bits.length > availableIndices.length) {
    throw new Error('Text is too long for this image.');
  }

  // Determine indices for bit placement
  let targetIndices = [];
  if (seed) {
    // Deterministic shuffle of all available indices using seed
    const prng = getPRNG(hashString(seed));
    const shuffled = [...availableIndices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    targetIndices = shuffled.slice(0, bits.length);
  } else {
    targetIndices = availableIndices.slice(0, bits.length);
  }

  // Inject bits
  for (let i = 0; i < bits.length; i++) {
    const idx = targetIndices[i];
    data[idx] = (data[idx] & 0xFE) | bits[i];
    
    // Safety for transparent PNGs: Force Alpha channel to 255 for used pixels 
    // to prevent browser from "optimizing away" RGB data in transparent areas.
    const alphaIdx = idx + (3 - (idx % 4)); 
    data[alphaIdx] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Extracts hidden text from an image data.
 * @param {HTMLCanvasElement} canvas - Canvas containing the image data.
 * @param {string} seed - Optional seed for decryption and bit location.
 * @returns {string} - The extracted text.
 */
export function extractText(canvas, seed = '') {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Get available pixel indices (skipping Alpha)
  const availableIndices = [];
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 !== 0) availableIndices.push(i);
  }

  let bits = [];
  if (seed) {
    // Generate the same shuffled sequence
    const prng = getPRNG(hashString(seed));
    const shuffled = [...availableIndices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Read all bits in shuffled order
    for (let i = 0; i < shuffled.length; i++) {
      bits.push(data[shuffled[i]] & 1);
    }
  } else {
    // Standard linear reading
    for (let i = 0; i < availableIndices.length; i++) {
      bits.push(data[availableIndices[i]] & 1);
    }
  }

  let chars = [];
  for (let i = 0; i < bits.length; i += 8) {
    let charCode = 0;
    for (let j = 0; j < 8; j++) {
      charCode = (charCode << 1) | bits[i + j];
    }
    chars.push(String.fromCharCode(charCode));
  }

  const fullContent = chars.join('');
  const endIndex = fullContent.indexOf('##END##');
  
  if (endIndex === -1) {
    throw new Error('Message not found (invalid Seed?).');
  }

  let processedText = fullContent.substring(0, endIndex);
  
  // Decrypt XOR if seed provided
  if (seed) processedText = xorCipher(processedText, seed);

  try {
    return decodeURIComponent(escape(atob(processedText)));
  } catch (e) {
    throw new Error('Base64 decoding error (invalid Seed?).');
  }
}
