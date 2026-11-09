/**
 * Lionel Train Card - 3D layout scene.
 *
 * Loaded on demand by the card (dynamic import), so dashboards that turn the
 * 3D view off never download three.js. The layout itself (track, Polar Express
 * consist, village, tree, station, mountains) is the original card's scene;
 * this module adds the renderer, lighting, sky, day/night and the frame loop.
 */
import * as THREE from 'three';

const DAY = {
  skyTop: 0x4d8fd6, skyHorizon: 0xe6f0f8, fog: 0xd9e6f1,
  hemiSky: 0xd8e9ff, hemiGround: 0xf4f7fa, hemi: 1.7,
  sun: 0xfff1dc, sunIntensity: 3.1, exposure: 1.12,
  litWindows: 0.7, glow: 0.35, stars: 0,
};
const NIGHT = {
  skyTop: 0x050a1c, skyHorizon: 0x2b4170, fog: 0x22345a,
  hemiSky: 0x5a70a8, hemiGround: 0x232c44, hemi: 0.9,
  sun: 0xb4c6ff, sunIntensity: 0.9, exposure: 1.35,
  litWindows: 1.0, glow: 1.0, stars: 1,
};

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TrainScene {
  /**
   * @param {HTMLElement} container element the canvas goes into
   * @param {{trainModel?: string}} options
   */
  constructor(container, options = {}) {
    this._container = container;
    this._trainModel = options.trainModel || 'Generic';
    this._rand = mulberry32(1908);
    this._state = { speed: 0, forward: true, lights: true, night: false };
    this._trainProgress = 0.62;
    this._particles3d = [];
    this._glows = [];
    this._running = false;
    this._visible = true;
    this._lastFrame = 0;
    this._clock = 0;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 200;

    this._scene3d = new THREE.Scene();
    this._camera3d = new THREE.PerspectiveCamera(38, width / height, 1, 900);
    this._camera3d.position.set(0, 44, 112);
    this._lookAt = new THREE.Vector3(0, 3, 6);
    this._camera3d.lookAt(this._lookAt);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    this._renderer3d = renderer;
    container.prepend(renderer.domElement);

    this._glowTexture = softTexture();
    this._smokeTexture = softTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.45)');

    this._buildSky();
    this._buildLights();

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(420, 64),
      new THREE.MeshStandardMaterial({ color: 0xe4edf4, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._scene3d.add(ground);

    this._createMountains3D();
    this._createTown3D();
    this._createTrack3D();
    this._createTrain3D();
    this._createTrees3D();
    this._createStation3D();
    this._createSnow3D();
    this._finishScene();

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);
    this._applyTimeOfDay();
    this._positionCars();
    this._start();
  }

  // ------------------------------------------------------------------ public

  /** speed 0-100, forward, lights, night */
  setState(state) {
    const prevNight = this._state.night;
    Object.assign(this._state, state);
    if (state.night !== undefined && state.night !== prevNight) this._applyTimeOfDay();
    this._applyHeadlight();
  }

  /** Pause rendering while off screen or hidden. */
  setVisible(visible) {
    this._visible = visible;
    if (visible) this._start();
  }

  dispose() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this._resizeObserver.disconnect();
    this._scene3d.traverse((obj) => {
      obj.geometry?.dispose?.();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      mats.forEach((m) => m.dispose());
    });
    this._glowTexture.dispose();
    this._smokeTexture.dispose();
    this._renderer3d.dispose();
    this._renderer3d.domElement.remove();
  }

  // -------------------------------------------------------------- environment

  _buildSky() {
    const geo = new THREE.SphereGeometry(600, 32, 16);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this._sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
    }));
    this._scene3d.add(this._sky);
    this._scene3d.fog = new THREE.Fog(0xc9dcec, 110, 430);

    const starPositions = [];
    for (let i = 0; i < 500; i++) {
      const theta = this._rand() * Math.PI * 2;
      const phi = Math.acos(0.15 + this._rand() * 0.85);
      starPositions.push(
        560 * Math.sin(phi) * Math.cos(theta), 560 * Math.cos(phi), 560 * Math.sin(phi) * Math.sin(theta)
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    this._stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false,
      map: this._glowTexture, depthWrite: false,
    }));
    this._scene3d.add(this._stars);

    this._moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._glowTexture, color: 0xe8eeff, transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0,
    }));
    this._moon.position.set(150, 230, -480);
    this._moon.scale.set(70, 70, 1);
    this._scene3d.add(this._moon);
  }

  _paintSky(top, horizon) {
    const pos = this._sky.geometry.attributes.position;
    const col = this._sky.geometry.attributes.color;
    const a = new THREE.Color(top), b = new THREE.Color(horizon), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 600);
      c.copy(b).lerp(a, Math.pow(h, 0.55));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  _buildLights() {
    this._hemi = new THREE.HemisphereLight(0xcfe2ff, 0xeef3f8, 1.15);
    this._scene3d.add(this._hemi);

    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    sun.position.set(-70, 90, 55);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = sun.shadow.camera;
    s.left = -95; s.right = 95; s.top = 70; s.bottom = -70; s.near = 20; s.far = 260;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.4;
    this._sun = sun;
    this._scene3d.add(sun);
  }

  _applyTimeOfDay() {
    const t = this._state.night ? NIGHT : DAY;
    this._paintSky(t.skyTop, t.skyHorizon);
    this._scene3d.fog.color.setHex(t.fog);
    this._hemi.color.setHex(t.hemiSky);
    this._hemi.groundColor.setHex(t.hemiGround);
    this._hemi.intensity = t.hemi;
    this._sun.color.setHex(t.sun);
    this._sun.intensity = t.sunIntensity;
    this._sun.position.set(this._state.night ? 60 : -70, this._state.night ? 110 : 90, 55);
    this._renderer3d.toneMappingExposure = t.exposure;
    this._stars.material.opacity = t.stars;
    this._moon.material.opacity = t.stars;
    for (const { material, base } of this._litMaterials || []) {
      material.color.copy(base).multiplyScalar(t.litWindows);
    }
    for (const g of this._glows) {
      g.material.opacity = g.userData.kind === 'bulb' ? Math.min(1, t.glow + 0.25) : t.glow;
      if (g.userData.kind === 'lamp') g.scale.setScalar((g.userData.size ||= g.scale.x) * (this._state.night ? 1.6 : 1));
    }
    this._applyHeadlight();
    this._requestFrame();
  }

  _applyHeadlight() {
    const on = this._state.lights;
    const night = this._state.night;
    if (this._headlightBulb) this._headlightBulb.material.color.setHex(on ? 0xfff6d0 : 0x333333);
    if (this._spotlight) {
      this._spotlight.color.setHex(0xffe2a0);
      this._spotlight.intensity = on ? (night ? 900 : 350) : 0;
      this._spotlight.decay = 1.6;
      this._spotlight.distance = 90;
    }
    if (this._beam) this._beam.material.opacity = on ? (night ? 0.22 : 0.08) : 0;
    if (this._headGlow) this._headGlow.material.opacity = on ? (night ? 1 : 0.55) : 0;
    this._requestFrame();
  }

  _glow(color, size, x, y, z, kind) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._glowTexture, color, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.35, toneMapped: false,
    }));
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, y, z);
    sprite.userData.kind = kind;
    this._glows.push(sprite);
    return sprite;
  }

  /** Shadows, lit windows, headlight beam and snow look after the layout is built. */
  _finishScene() {
    this._litMaterials = [];
    const seen = new Set();
    this._scene3d.traverse((obj) => {
      if (!obj.isMesh || obj === this._sky) return;
      const m = obj.material;
      if (m && m.isMeshBasicMaterial) {
        const c = m.color;
        if (!seen.has(m) && c.r > 0.6 && c.g > 0.5 && obj !== this._headlightBulb && !m.vertexColors) {
          seen.add(m);
          m.toneMapped = false;
          this._litMaterials.push({ material: m, base: c.clone() });
        }
        return;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    // Visible headlight beam and glow on the locomotive.
    const loco = this._trainCars?.[0]?.mesh;
    if (loco) {
      const beamGeo = new THREE.ConeGeometry(5.5, 26, 24, 1, true);
      beamGeo.translate(0, -13, 0);
      beamGeo.rotateX(-Math.PI / 2);
      this._beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
        color: 0xffe9b0, transparent: true, opacity: 0.1, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      this._beam.position.set(0, 6.6, 10.3);
      this._beam.rotation.x = 0.12;
      loco.add(this._beam);
      this._headGlow = this._glow(0xfff2c0, 4.5, 0, 7, 10.6, 'head');
      loco.add(this._headGlow);
    }

    // Round, soft snowflakes instead of square points.
    if (this._snowSystem) {
      Object.assign(this._snowSystem.material, {
        map: this._glowTexture, size: 1.6, depthWrite: false, opacity: 0.9,
      });
      this._snowSystem.material.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------- frame loop

  _resize() {
    const w = this._container.clientWidth, h = this._container.clientHeight;
    if (!w || !h) return;
    this._camera3d.aspect = w / h;
    // Narrow cards get a wider lens so the whole oval stays in frame.
    this._camera3d.fov = w / h < 1.4 ? 46 : 38;
    this._camera3d.updateProjectionMatrix();
    this._renderer3d.setSize(w, h);
    this._requestFrame();
  }

  _start() {
    if (this._running || !this._visible) return;
    this._running = true;
    this._lastFrame = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      if (!this._visible) { this._running = false; return; }
      this._raf = requestAnimationFrame(loop);
      // Full rate while the train moves; a calm 24 fps for falling snow when stopped.
      const minGap = this._state.speed > 0 ? 0 : 1000 / 24;
      if (now - this._lastFrame < minGap) return;
      const dt = Math.min(0.1, (now - this._lastFrame) / 1000);
      this._lastFrame = now;
      this._tick(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _requestFrame() {
    if (!this._running && this._visible && this._renderer3d) {
      this._renderer3d.render(this._scene3d, this._camera3d);
    }
  }

  _tick(dt) {
    this._clock += dt;
    const { speed, forward } = this._state;
    if (speed > 0) {
      // Same pace as the original card at 60 fps (0.002 of the loop per frame at 100 %).
      const step = (speed / 100) * 0.12 * dt;
      this._trainProgress = (this._trainProgress + (forward ? step : -step) + 1) % 1;
      this._updateSmoke3D(dt);
    } else if (this._particles3d.length) {
      this._updateSmoke3D(dt);
    }
    this._positionCars();
    this._updateSnow3D(dt);
    this._twinkle();

    // Slow drift so the scene feels alive, gently leaning toward the locomotive.
    const loco = this._trainCars[0].mesh.position;
    this._camera3d.position.x = Math.sin(this._clock * 0.07) * 6;
    this._lookAt.x += ((loco.x * 0.12) - this._lookAt.x) * Math.min(1, dt * 0.8);
    this._camera3d.lookAt(this._lookAt);

    this._renderer3d.render(this._scene3d, this._camera3d);
  }

  _positionCars() {
    for (const car of this._trainCars) {
      const prog = (this._trainProgress - car.offset + 1) % 1;
      car.mesh.position.copy(this._trainPath.getPointAt(prog));
      car.mesh.lookAt(this._trainPath.getPointAt((prog + 0.002) % 1));
    }
  }

  _twinkle() {
    if (!this._christmasLights) return;
    const t = this._clock;
    for (let i = 0; i < this._christmasLights.length; i++) {
      const s = 0.65 + 0.35 * Math.sin(t * 2.2 + i * 1.7);
      this._christmasLights[i].mesh.material.color.setHex(this._christmasLights[i].baseColor).multiplyScalar(s);
    }
  }

  _updateSmoke3D(dt) {
    const k = dt * 60;
    const engine = this._trainCars[0].mesh;
    if (this._state.speed > 0 && this._rand() < (0.25 + (this._state.speed / 100) * 0.5) * k) {
      const stack = new THREE.Vector3(0, 8.8, 7).applyMatrix4(engine.matrixWorld);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._smokeTexture, color: this._state.night ? 0x8c97ab : 0xe8ecf0,
        transparent: true, depthWrite: false, opacity: 0.55,
      }));
      sprite.position.copy(stack);
      sprite.scale.set(2.2, 2.2, 1);
      this._scene3d.add(sprite);
      this._particles3d.push({ sprite, life: 1, drift: (this._rand() - 0.5) * 0.08 });
    }
    for (let i = this._particles3d.length - 1; i >= 0; i--) {
      const p = this._particles3d[i];
      p.life -= 0.012 * k;
      p.sprite.position.y += 0.16 * k;
      p.sprite.position.x += p.drift * k;
      const s = p.sprite.scale.x * (1 + 0.018 * k);
      p.sprite.scale.set(s, s, 1);
      p.sprite.material.opacity = Math.max(0, p.life) * 0.55;
      if (p.life <= 0) {
        this._scene3d.remove(p.sprite);
        p.sprite.material.dispose();
        this._particles3d.splice(i, 1);
      }
    }
  }

  _updateSnow3D(dt) {
    if (!this._snowSystem) return;
    const k = dt * 60;
    const positions = this._snowSystem.geometry.attributes.position.array;
    const velocities = this._snowSystem.geometry.userData.velocities;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += velocities[i] * k;
      positions[i + 1] += velocities[i + 1] * k;
      positions[i + 2] += velocities[i + 2] * k;
      if (positions[i + 1] < 0) {
        positions[i] = Math.random() * 300 - 150;
        positions[i + 1] = 200;
        positions[i + 2] = Math.random() * 300 - 150;
      }
    }
    this._snowSystem.geometry.attributes.position.needsUpdate = true;
  }

  // ------------------------------------------------- layout (original scene)
