/**
 * The start page's 3D phone (spec 2026-11-04 §5), built in code: no model
 * file, no lighting file. Only Phone3D imports this, through import(), so
 * three.js is its own chunk that the shop and the dashboard never load.
 */
import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from 'three'

export type Shot = 'hero' | 0 | 1 | 2 | 3
export type Finish = 'titanium' | 'navy' | 'black'

export interface PhoneScene {
  /** Load this screenshot, then fade it in over 0.4 s. */
  setScreen(url: string): void
  /** Ease the phone and the camera to this shot's framing over about 1 s. */
  setShot(shot: Shot): void
  /** Lean toward the pointer, -1 to 1 each way; (0, 0) is at rest. */
  setPointer(x: number, y: number): void
  /** 0 to 1: the first screen's slow push in as it scrolls. */
  setScroll(progress: number): void
  /** One band of light across the edge and the glass. */
  sweep(): void
  /** Draw or stop drawing (off screen, hidden tab). */
  setRunning(on: boolean): void
  dispose(): void
}

type Pose = { ry: number; rx: number; z: number; y: number }

// Each shot's framing: the phone's turn (radians), the camera's distance,
// and how far the phone rises. At z 10.8 the phone is as big as the still
// picture under the canvas. Closer shots grow it at most about 8%, from its
// middle: on an iPhone in Safari there's only about 30 px between the top
// bar and the phone, so a bigger or lifted phone went under the bar
// (founder's video, 2026-11-06).
const SHOTS: Record<Shot, Pose> = {
  hero: { ry: -0.35, rx: 0.08, z: 10.8, y: 0 },
  0: { ry: -0.45, rx: 0.12, z: 11.4, y: 0 }, // wide, from a little below
  1: { ry: -0.15, rx: 0.04, z: 10.4, y: 0 }, // push in
  2: { ry: 0.12, rx: -0.04, z: 10, y: 0 }, // close on the QR
  3: { ry: 0.42, rx: 0.06, z: 11, y: 0 }, // pull back, turned the other way
}
// Never far enough to show the back.
const MAX_TURN = 0.6
const FINISHES: Record<Finish, number> = { titanium: 0xc4bdb1, navy: 0x34466a, black: 0x222326 }

// Scene units. The screen is 390:844, like the screenshots.
const SCREEN = { w: 1.95, h: 4.22, r: 0.24 }
const BODY = { w: 2.19, h: 4.46, r: 0.36, depth: 0.12, bevel: 0.045 }
const FRONT = BODY.depth / 2 + BODY.bevel

const FADE_S = 0.4
const SWEEP_S = 1.1
// The first 60 frames averaging over this (under 40 a second): too slow,
// back to the picture, so scrolling stays smooth (was 40 ms, 2026-11-06).
const SLOW_MS = 25

/** A rounded rectangle centred on 0, its UVs 0 to 1 across it. */
function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2
  const y = -height / 2
  const shape = new Shape()
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

function flatRect(width: number, height: number, radius: number): ShapeGeometry {
  const geometry = new ShapeGeometry(roundedRect(width, height, radius), 16)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5)
  }
  return geometry
}

/** A canvas drawn once, as a texture. */
function painted(size: number, paint: (g: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paint(canvas.getContext('2d')!, size)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping
  return texture
}

const ease = (t: number) => 1 - (1 - t) ** 3

export function createPhoneScene(
  canvas: HTMLCanvasElement,
  options: { screen: string; shot: Shot; finish: Finish; onFirstFrame: () => void; onFail: () => void },
): PhoneScene {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  // iPhones commonly have 3 physical pixels per CSS pixel. A 2x canvas
  // blurred their screen text even with the original 3x screenshots.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping

  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 1, 0.1, 100)
  const key = new DirectionalLight(0xffffff, 1.4)
  key.position.set(-3, 4, 5)
  // From behind, warm: it draws the titanium edge, and flares in a sweep.
  const rim = new DirectionalLight(0xffe2b8, 1.6)
  rim.position.set(4, 2, -3)
  scene.add(key, rim)

  const phone = new Group()
  scene.add(phone)
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(thing: T) => (disposables.push(thing), thing)

  // The titanium body, its edges rounded.
  const body = keep(
    new ExtrudeGeometry(roundedRect(BODY.w - 2 * BODY.bevel, BODY.h - 2 * BODY.bevel, BODY.r), {
      depth: BODY.depth,
      bevelEnabled: true,
      bevelThickness: BODY.bevel,
      bevelSize: BODY.bevel,
      bevelSegments: 6,
      curveSegments: 20,
    }),
  )
  body.center()
  // Standard, not physical, materials: they compile far faster on phones.
  // Keep a little diffuse response so the edge stays visible without an
  // environment map. Generating one blocks the main thread on mobile GPUs.
  const metal = keep(new MeshStandardMaterial({ color: FINISHES[options.finish], metalness: 0.68, roughness: 0.34 }))
  phone.add(new Mesh(body, metal))

  // The black glass around the screen.
  const glass = new Mesh(
    keep(flatRect(BODY.w - 0.05, BODY.h - 0.05, BODY.r - 0.02)),
    keep(new MeshStandardMaterial({ color: 0x050607, roughness: 0.08, metalness: 0 })),
  )
  glass.position.z = FRONT + 0.001
  phone.add(glass)

  // The screen: two layers, the new screenshot fading in over the old.
  // They don't write depth, so their draw order alone puts one on top.
  const screenShape = keep(flatRect(SCREEN.w, SCREEN.h, SCREEN.r))
  const layer = (order: number) => {
    const material = keep(new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }))
    const mesh = new Mesh(screenShape, material)
    mesh.position.z = FRONT + 0.002
    mesh.renderOrder = order
    phone.add(mesh)
    return { mesh, material }
  }
  let shown = layer(1)
  let coming = layer(2)

  const island = new Mesh(keep(flatRect(0.58, 0.16, 0.08)), keep(new MeshBasicMaterial({ color: 0x000000 })))
  island.position.set(0, SCREEN.h / 2 - 0.16, FRONT + 0.004)
  island.renderOrder = 3
  phone.add(island)

  // A band of light that crosses the glass in a sweep.
  const band = keep(
    painted(256, (g, size) => {
      const gradient = g.createLinearGradient(0, 0, size, 0)
      gradient.addColorStop(0.38, 'rgba(255,255,255,0)')
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)')
      gradient.addColorStop(0.62, 'rgba(255,255,255,0)')
      g.fillStyle = gradient
      g.fillRect(0, 0, size, size)
    }),
  )
  band.center.set(0.5, 0.5)
  band.rotation = 0.35
  band.offset.x = 1
  const bandMesh = new Mesh(
    screenShape,
    keep(new MeshBasicMaterial({ map: band, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
  )
  bandMesh.position.z = FRONT + 0.005
  bandMesh.renderOrder = 4
  phone.add(bandMesh)

  // A soft shadow under the phone, on an unseen floor: narrower than the
  // canvas, or the light page shows its cut-off sides (2026-11-06).
  const shadow = new Mesh(
    keep(new PlaneGeometry(2.5, 1.1)),
    keep(
      new MeshBasicMaterial({
        map: keep(
          painted(128, (g, size) => {
            const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
            gradient.addColorStop(0, 'rgba(15,23,42,0.32)')
            gradient.addColorStop(1, 'rgba(0,0,0,0)')
            g.fillStyle = gradient
            g.fillRect(0, 0, size, size)
          }),
        ),
        transparent: true,
        depthWrite: false,
      }),
    ),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -BODY.h / 2 - 0.32
  scene.add(shadow)

  // Screenshots, loaded once each.
  const loader = new TextureLoader()
  const textures = new Map<string, Promise<Texture>>()
  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  const load = (url: string) => {
    let texture = textures.get(url)
    if (!texture) {
      texture = loader.loadAsync(url).then((loaded) => {
        loaded.colorSpace = SRGBColorSpace
        loaded.anisotropy = anisotropy
        return keep(loaded)
      })
      textures.set(url, texture)
    }
    return texture
  }

  // Where things are, and where they're going.
  let target: Pose = { ...SHOTS[options.shot] }
  const now: Pose = { ...target }
  const pointer = { x: 0, y: 0, nowX: 0, nowY: 0 }
  let push = 0
  let wanted = ''
  let fade = -1
  let sweepAt = -1
  let clock = 0

  let frame = 0
  let last = 0
  // Shaders compile in the background first (where the browser can).
  let compiled = false
  let wantRunning = true
  let firstDrawn = false
  let timed = 0
  let timedMs = 0
  let failed = false

  const fail = () => {
    if (failed) return
    failed = true
    stop()
    options.onFail()
  }
  const lost = (event: Event) => {
    event.preventDefault()
    fail()
  }
  canvas.addEventListener('webglcontextlost', lost)

  const resize = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const watcher = new ResizeObserver(resize)
  watcher.observe(canvas)
  resize()

  const draw = (time: number) => {
    frame = requestAnimationFrame(draw)
    const dt = Math.min(0.1, (time - last) / 1000)
    if (firstDrawn && timed < 60) {
      timed += 1
      timedMs += time - last
      if (timed === 60 && timedMs / 60 > SLOW_MS) return fail()
    }
    last = time
    clock += dt

    const follow = 1 - Math.exp(-dt * 3.5)
    now.ry += (target.ry - now.ry) * follow
    now.rx += (target.rx - now.rx) * follow
    now.z += (target.z - now.z) * follow
    now.y += (target.y - now.y) * follow
    pointer.nowX += (pointer.x - pointer.nowX) * follow
    pointer.nowY += (pointer.y - pointer.nowY) * follow
    const turn = now.ry + pointer.nowX * 0.22 + Math.sin(clock * 0.35) * 0.04
    phone.rotation.y = Math.max(-MAX_TURN, Math.min(MAX_TURN, turn))
    phone.rotation.x = now.rx - pointer.nowY * 0.12
    phone.position.y = now.y + Math.sin(clock * 0.9) * 0.05
    camera.position.z = now.z - push * 0.8

    if (fade >= 0) {
      fade = Math.min(1, fade + dt / FADE_S)
      coming.material.opacity = ease(fade)
      if (fade === 1) {
        // The new screen is on top and opaque: it becomes the shown one.
        shown.material.opacity = 0
        ;[shown, coming] = [coming, shown]
        shown.mesh.renderOrder = 1
        coming.mesh.renderOrder = 2
        fade = -1
      }
    }
    if (sweepAt >= 0) {
      const t = Math.min(1, (clock - sweepAt) / SWEEP_S)
      band.offset.x = 0.75 - ease(t) * 1.5
      rim.intensity = 1.6 + Math.sin(t * Math.PI) * 4
      if (t === 1) sweepAt = -1
    }

    renderer.render(scene, camera)
    if (!firstDrawn && shown.material.map) {
      firstDrawn = true
      options.onFirstFrame()
    }
  }
  const start = () => {
    if (frame || failed || !compiled || !wantRunning) return
    last = performance.now()
    // A pause resets the speed watch: only frames in a row count.
    timed = timedMs = 0
    frame = requestAnimationFrame(draw)
  }
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  const setScreen = (url: string) => {
    if (url === wanted) return
    wanted = url
    load(url)
      .then((texture) => {
        if (url !== wanted || failed) return
        if (!shown.material.map) {
          shown.material.map = texture
          shown.material.opacity = 1
          shown.material.needsUpdate = true
          return
        }
        if (!coming.material.map) coming.material.needsUpdate = true
        coming.material.map = texture
        coming.material.opacity = 0
        fade = 0
      })
      .catch(fail)
  }

  setScreen(options.screen)
  renderer
    .compileAsync(scene, camera)
    .then(() => {
      compiled = true
      start()
    })
    .catch(fail)

  return {
    setScreen,
    setShot: (shot) => {
      target = { ...SHOTS[shot] }
    },
    setPointer: (x, y) => {
      pointer.x = Math.max(-1, Math.min(1, x))
      pointer.y = Math.max(-1, Math.min(1, y))
    },
    setScroll: (progress) => {
      push = Math.max(0, Math.min(1, progress))
    },
    sweep: () => {
      sweepAt = clock
    },
    setRunning: (on) => {
      wantRunning = on
      if (on) start()
      else stop()
    },
    dispose: () => {
      stop()
      failed = true
      watcher.disconnect()
      canvas.removeEventListener('webglcontextlost', lost)
      // After a lost GPU some of this can throw: the picture is back anyway.
      try {
        for (const thing of disposables) thing.dispose()
        renderer.dispose()
      } catch {
        // Nothing left to free.
      }
    },
  }
}
