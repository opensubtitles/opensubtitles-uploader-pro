/**
 * Base64 encoding helpers for binary data
 */

/**
 * Number of bytes converted per String.fromCharCode call.
 *
 * String.fromCharCode.apply() passes every byte as a separate function argument,
 * so the argument-count limit of the JS engine caps how much can be converted at
 * once. WKWebView (macOS/iOS Tauri builds) throws "Maximum call stack size
 * exceeded" at roughly 65k arguments, so stay well under that.
 */
const CHUNK_SIZE = 0x8000;

/**
 * Convert a byte array to a base64 string.
 *
 * Chunked on purpose - the obvious btoa(String.fromCharCode.apply(null, bytes))
 * blows the stack on larger inputs (a ~380 KB subtitle is already enough).
 *
 * @param {Uint8Array|Array<number>} bytes - Raw bytes to encode
 * @returns {string} - Base64 encoded data
 */
export function uint8ArrayToBase64(bytes) {
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray
      ? bytes.subarray(offset, offset + CHUNK_SIZE)
      : bytes.slice(offset, offset + CHUNK_SIZE);

    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}
