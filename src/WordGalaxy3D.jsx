import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Gamepad2 } from 'lucide-react'

const orbColors = [0x8d65ff, 0xff4f87, 0x77c92d, 0xffc72f]
const orbPositions = [
  [-3.4, 0.6, 0.2],
  [-1.15, -0.15, 1.1],
  [1.25, 0.45, 0.6],
  [3.45, -0.1, -0.15],
]

function labelTexture(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 144
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(20, 9, 50, 0.84)'
  context.roundRect(10, 12, 492, 120, 35)
  context.fill()
  context.strokeStyle = 'rgba(255,255,255,0.5)'
  context.lineWidth = 4
  context.stroke()
  context.fillStyle = '#ffffff'
  context.font = `800 ${text.length > 12 ? 42 : 50}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 256, 73, 450)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function WordGalaxy3D({ options, onPick, disabled = false }) {
  const canvasRef = useRef(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x160934, 1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x160934, 0.055)
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.set(0, 4.3, 10.7)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0xc7baff, 0x321568, 2.2))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1)
    keyLight.position.set(1, 8, 5)
    keyLight.castShadow = true
    scene.add(keyLight)
    const pinkLight = new THREE.PointLight(0xff4f87, 28, 14)
    pinkLight.position.set(-4, 2, 3)
    scene.add(pinkLight)
    const greenLight = new THREE.PointLight(0xb8ed45, 22, 14)
    greenLight.position.set(4, 1, 1)
    scene.add(greenLight)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 64),
      new THREE.MeshStandardMaterial({ color: 0x281050, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.92 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.55
    floor.receiveShadow = true
    scene.add(floor)

    const grid = new THREE.GridHelper(18, 26, 0x9f7af4, 0x493070)
    grid.position.y = -1.52
    grid.material.transparent = true
    grid.material.opacity = 0.28
    scene.add(grid)

    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(900)
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = (Math.random() - 0.5) * 28
      starPositions[index + 1] = (Math.random() - 0.2) * 15
      starPositions[index + 2] = (Math.random() - 0.5) * 20
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xe5dcff, size: 0.055, transparent: true, opacity: 0.8 }))
    scene.add(stars)

    const clickable = []
    const orbGroup = new THREE.Group()
    options.forEach((option, index) => {
      const group = new THREE.Group()
      const position = orbPositions[index] || [index * 2 - 3, 0, 0]
      group.position.set(...position)
      group.userData.baseY = position[1]
      group.userData.phase = index * 1.4

      const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.84, 4),
        new THREE.MeshPhysicalMaterial({
          color: orbColors[index],
          emissive: orbColors[index],
          emissiveIntensity: 0.13,
          roughness: 0.18,
          metalness: 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
        }),
      )
      sphere.castShadow = true
      sphere.userData.option = option
      clickable.push(sphere)
      group.add(sphere)

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.025, 12, 80),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
      )
      ring.rotation.x = Math.PI / 2.5
      group.add(ring)

      const spriteMaterial = new THREE.SpriteMaterial({ map: labelTexture(option), transparent: true, depthTest: false })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.position.set(0, 1.42, 0)
      sprite.scale.set(2.6, 0.73, 1)
      group.add(sprite)
      orbGroup.add(group)
    })
    scene.add(orbGroup)

    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.06, 14, 100),
      new THREE.MeshBasicMaterial({ color: 0x9e7bf4, transparent: true, opacity: 0.28 }),
    )
    portal.position.set(0, 1.1, -3.8)
    scene.add(portal)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pointerDown = (event) => {
      if (disabled) return
      const bounds = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(clickable, false)[0]
      if (hit?.object?.userData?.option) onPickRef.current(hit.object.userData.option)
    }
    canvas.addEventListener('pointerdown', pointerDown)

    const resize = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const clock = new THREE.Clock()
    let frame
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      orbGroup.children.forEach((group, index) => {
        group.position.y = group.userData.baseY + Math.sin((elapsed * 1.15) + group.userData.phase) * 0.18
        group.rotation.y = (elapsed * 0.22) + (index * 0.3)
        const ring = group.children[1]
        if (ring) ring.rotation.z = elapsed * (index % 2 ? -0.6 : 0.6)
      })
      stars.rotation.y = elapsed * 0.012
      portal.rotation.z = elapsed * 0.08
      camera.position.x = Math.sin(elapsed * 0.17) * 0.25
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', pointerDown)
      scene.traverse((object) => {
        object.geometry?.dispose?.()
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            material.map?.dispose?.()
            material.dispose?.()
          })
        }
      })
      renderer.dispose()
    }
  }, [options, disabled])

  return (
    <div className={`word-galaxy-3d ${disabled ? 'disabled' : ''}`}>
      <canvas ref={canvasRef} aria-label="Interactive 3D word galaxy" />
      <div className="galaxy-hud"><Gamepad2 size={15} /><span>Tap a floating word orb</span><i>3D</i></div>
      <div className="galaxy-answer-dock">{options.map((option) => <button disabled={disabled} onClick={() => onPick(option)} key={option}>{option}</button>)}</div>
    </div>
  )
}
