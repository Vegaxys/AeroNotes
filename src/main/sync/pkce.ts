import { createHash, randomBytes } from 'crypto'

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export interface PkcePair {
  verifier: string
  challenge: string
}

/** RFC 7636 S256 verifier/challenge pair. */
export function createPkcePair(): PkcePair {
  const verifier = base64Url(randomBytes(48))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}
