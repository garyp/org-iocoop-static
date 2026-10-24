// Shared format checks for the forms. Deliberately plain, and strict about the characters that
// matter in an email header.
export const emailPattern = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/

// A fully qualified domain name: at least two labels, the last one a TLD.
export const hostnamePattern =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

// One OpenSSH public key line: a key type, base64 data, and an optional comment.
const keyLine =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(?:256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) ([A-Za-z0-9+/]+={0,2})(?: [^\r\n]{0,200})?$/

// Checks the shape and also the contents. The base64 of a real key starts with the key type's
// name (a 4-byte length, then the name), so a made-up blob like "ssh-ed25519 abc" is refused.
export function isSshPublicKey(line) {
  const match = keyLine.exec(line)
  if (!match) return false
  const [, type, data] = match

  let bytes
  try {
    bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
  } catch {
    return false
  }
  if (bytes.length < 4 + type.length + 4) return false
  if (new DataView(bytes.buffer).getUint32(0) !== type.length) return false
  return new TextDecoder().decode(bytes.slice(4, 4 + type.length)) === type
}
