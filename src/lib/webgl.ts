/** Whether this device can create a WebGL 2 context; the probe context is released straight away. */
export function hasWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}
