import { Color, MeshStandardMaterial } from 'three'

const ROUGHNESS = 0.7
const RIM_POWER = 3

/** Matte material with a soft fresnel rim so the silhouette reads clearly on a light background. */
export function rimMaterial(color: Color, rim: Color, rimStrength: number) {
  const material = new MeshStandardMaterial({ color, roughness: ROUGHNESS })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: rim }
    shader.uniforms.rimStrength = { value: rimStrength }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace(
        '#include <opaque_fragment>',
        `float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), ${RIM_POWER.toFixed(1)});
outgoingLight += rimColor * rim * rimStrength;
#include <opaque_fragment>`,
      )
  }
  return material
}
