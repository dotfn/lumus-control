import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type LampKind = 'pendant' | 'floor' | 'table';

export interface LampSpec {
  id: string;
  kind: LampKind;
}

export interface LampLight {
  on: boolean;
  rgb: [number, number, number];
  /** Brillo de 0 a 1. */
  level: number;
}

export interface RoomSceneOptions {
  lamps: LampSpec[];
  /** Se dispara una vez por tirón, cuando la cuerda pasa el punto de clic. */
  onPull: (id: string) => void;
  /** Clic sobre una lámpara (sin arrastrar). */
  onSelect: (id: string) => void;
  /** Posición en pantalla de cada tirador, en px relativos al lienzo. */
  onHandleMove?: (index: number, x: number, y: number) => void;
  /** El usuario movió la cámara a mano: la vista ya no es ninguna de las predefinidas. */
  onUserOrbit?: () => void;
}

export interface RoomScene {
  setLight: (id: string, light: LampLight) => void;
  /** Tirón automático, para accionar una lámpara sin arrastrar (teclado). */
  pull: (id: string) => void;
  /** Lleva la cámara a una lámpara, o a la vista general con `null`. */
  focus: (id: string | null) => void;
  /** Desplaza el encuadre (fracción del ancho) para centrar la escena en el hueco libre. */
  setViewShift: (shift: number) => void;
  dispose: () => void;
}

const FOV = 40;
const CEILING = 3.6;
const WALL_Z = -2;
const ROOM_TARGET = new THREE.Vector3(0, 1.2, -0.7);
/** Medio ancho que debe caber en la vista general: las tres lámparas con margen. */
const ROOM_HALF_WIDTH = 2.25;

const CLICK_PULL = 0.13;
const MAX_PULL = 0.24;
const REARM_PULL = 0.05;
const HIT_RADIUS_PX = 38;
const STEP = 1 / 120;
const GRAVITY = 9.8;

interface Collider {
  local: THREE.Vector3;
  radius: number;
  world: THREE.Vector3;
}

/** Cuerda con tirador, simulada como cadena de Verlet. */
class Cord {
  readonly anchor = new THREE.Vector3();
  readonly target = new THREE.Vector3();
  readonly points: THREE.Vector3[] = [];
  readonly mesh: THREE.Mesh;
  readonly handle = new THREE.Group();
  readonly screen = new THREE.Vector2();
  dragging = false;
  /** Avance del tirón automático (0–1), o -1 si no hay ninguno. */
  auto = -1;
  pull = 0;
  /** Componente horizontal de la dirección del tirón, para mecer la lámpara. */
  pullX = 0;

  private readonly previous: THREE.Vector3[] = [];
  private readonly curve: THREE.CatmullRomCurve3;
  private readonly scratch = new THREE.Vector3();
  private armed = true;

  constructor(
    readonly length: number,
    private readonly thickness: number,
    handleScale: number,
    private readonly colliders: Collider[],
    private readonly onClick: () => void,
  ) {
    const count = Math.max(8, Math.round(length / 0.04) + 1);
    for (let i = 0; i < count; i++) {
      this.points.push(new THREE.Vector3());
      this.previous.push(new THREE.Vector3());
    }
    this.curve = new THREE.CatmullRomCurve3(this.points);
    this.mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xa39f94, roughness: 0.8 }),
    );
    this.mesh.frustumCulled = false;

    const material = new THREE.MeshStandardMaterial({ color: 0xc9a468, roughness: 0.5, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.06, 0.17, 20), material);
    body.position.y = -0.085;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), material);
    tip.position.y = -0.17;
    this.handle.add(body, tip);
    this.handle.scale.setScalar(handleScale);
  }

  get pinned() {
    return this.dragging || this.auto >= 0;
  }

  reset() {
    const segment = this.length / (this.points.length - 1);
    this.points.forEach((point, i) => {
      point.set(this.anchor.x, this.anchor.y - segment * i, this.anchor.z);
      this.previous[i].copy(point);
    });
  }

  step() {
    const { points, previous, scratch, anchor, target } = this;
    const last = points.length - 1;
    const segment = this.length / last;
    this.pull = 0;
    this.pullX = 0;

    if (this.auto >= 0) {
      this.auto += STEP / 0.46;
      const depth = Math.sin(Math.min(this.auto, 1) * Math.PI) * (CLICK_PULL + 0.05);
      target.set(anchor.x, anchor.y - this.length - depth, anchor.z);
      if (this.auto >= 1) this.auto = -1;
    }

    const pinned = this.pinned;
    if (pinned) {
      // La cuerda cede un poco y hace tope: no se puede estirar sin límite.
      scratch.copy(target).sub(anchor);
      const distance = scratch.length() || 1e-6;
      const limit = this.length + MAX_PULL;
      if (distance > limit) target.copy(anchor).addScaledVector(scratch, limit / distance);
      this.pull = Math.max(0, Math.min(distance, limit) - this.length);
      this.pullX = scratch.x / distance;

      if (this.armed && this.pull > CLICK_PULL) {
        this.armed = false;
        this.onClick();
      } else if (!this.armed && this.pull < REARM_PULL) {
        this.armed = true;
      }
    } else {
      this.armed = true;
    }

    for (let i = 1; i <= last; i++) {
      if (pinned && i === last) continue;
      const point = points[i];
      scratch.copy(point).sub(previous[i]).multiplyScalar(0.988);
      previous[i].copy(point);
      point.add(scratch);
      // El tirador pesa más que la cuerda: cae con más decisión.
      point.y -= GRAVITY * (i === last ? 1.5 : 1) * STEP * STEP;
    }

    for (let iteration = 0; iteration < 14; iteration++) {
      points[0].copy(anchor);
      if (pinned) points[last].copy(target);
      for (let i = 0; i < last; i++) {
        const a = points[i];
        const b = points[i + 1];
        scratch.copy(b).sub(a);
        const distance = scratch.length() || 1e-6;
        const correction = (distance - segment) / distance;
        const aFixed = i === 0;
        const bFixed = pinned && i + 1 === last;
        if (aFixed && bFixed) continue;
        if (aFixed) b.addScaledVector(scratch, -correction);
        else if (bFixed) a.addScaledVector(scratch, correction);
        else {
          a.addScaledVector(scratch, correction * 0.5);
          b.addScaledVector(scratch, -correction * 0.5);
        }
      }
      for (let i = 1; i <= last; i++) {
        if (pinned && i === last) continue;
        for (const collider of this.colliders) {
          scratch.copy(points[i]).sub(collider.world);
          const distance = scratch.length();
          if (distance < collider.radius && distance > 1e-6) {
            points[i].copy(collider.world).addScaledVector(scratch, collider.radius / distance);
          }
        }
      }
    }
  }

  updateMesh() {
    const { points, scratch } = this;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(this.curve, points.length * 2, this.thickness, 5);

    const end = points[points.length - 1];
    this.handle.position.copy(end);
    scratch.copy(points[points.length - 2]).sub(end).normalize();
    this.handle.quaternion.setFromUnitVectors(UP, scratch);
  }
}

const UP = new THREE.Vector3(0, 1, 0);

interface Glow {
  material: THREE.MeshStandardMaterial;
  gain: number;
}

interface Lamp {
  id: string;
  root: THREE.Object3D;
  focus: THREE.Vector3;
  focusDistance: number;
  light: THREE.PointLight;
  lightGain: number;
  glows: Glow[];
  halo: THREE.Sprite;
  haloSize: number;
  cord: Cord;
  anchorLocal: THREE.Vector3;
  colliders: Collider[];
  pick: THREE.Mesh;
  level: number;
  targetLevel: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  /** Dinámica propia de la lámpara (el péndulo de la colgante). */
  step?: () => void;
}

function haloTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoomScene(canvas: HTMLCanvasElement, options: RoomSceneOptions): RoomScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x060607);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // ── Habitación ──
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x35353b, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, CEILING), wallMaterial);
  wall.position.set(0, CEILING / 2, WALL_Z);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 24),
    new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.82 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = WALL_Z + 12;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), wallMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEILING, WALL_Z + 12);
  const baseboard = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.09, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x47474d, roughness: 0.8 }),
  );
  baseboard.position.set(0, 0.045, WALL_Z + 0.01);
  scene.add(wall, floor, ceiling, baseboard);

  // Penumbra: lo justo para adivinar los muebles y las cuerdas a oscuras.
  scene.add(new THREE.HemisphereLight(0xb4bccb, 0x0a0a0c, 0.34));
  const moon = new THREE.DirectionalLight(0xc3cbdb, 0.8);
  moon.position.set(4, 3, 6);
  scene.add(moon);

  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.7 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.5, metalness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb9975b, roughness: 0.35, metalness: 0.9 });
  const haloMap = haloTexture();

  const lamps: Lamp[] = [];

  const makeLamp = (
    spec: LampSpec,
    config: {
      root: THREE.Object3D;
      lightParent: THREE.Object3D;
      lightAt: THREE.Vector3;
      lightGain: number;
      glows: Glow[];
      haloSize: number;
      focus: THREE.Vector3;
      focusDistance: number;
      anchorLocal: THREE.Vector3;
      cordLength: number;
      cordThickness: number;
      handleScale: number;
      colliders: Omit<Collider, 'world'>[];
      pick: THREE.Mesh;
    },
  ): Lamp => {
    const light = new THREE.PointLight(0xffffff, 0, 0, 2);
    light.position.copy(config.lightAt);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloMap,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        opacity: 0,
      }),
    );
    halo.position.copy(config.lightAt);
    halo.renderOrder = 2;
    config.lightParent.add(light, halo);

    const colliders = config.colliders.map((c) => ({ ...c, world: new THREE.Vector3() }));
    const cord = new Cord(config.cordLength, config.cordThickness, config.handleScale, colliders, () =>
      options.onPull(spec.id),
    );
    (config.pick.material as THREE.Material).visible = false;
    config.pick.userData.lampId = spec.id;
    config.root.add(config.pick);
    scene.add(config.root, cord.mesh, cord.handle);

    return {
      id: spec.id,
      root: config.root,
      focus: config.focus,
      focusDistance: config.focusDistance,
      light,
      lightGain: config.lightGain,
      glows: config.glows,
      halo,
      haloSize: config.haloSize,
      cord,
      anchorLocal: config.anchorLocal,
      colliders,
      pick: config.pick,
      level: 0,
      targetLevel: 0,
      color: new THREE.Color(1, 0.76, 0.42),
      targetColor: new THREE.Color(1, 0.76, 0.42),
    };
  };

  /** Bombilla colgante sobre un escritorio; se mece como un péndulo al tirar. */
  const buildPendant = (spec: LampSpec, x: number): Lamp => {
    const z = -0.75;
    const size = 0.5;
    const drop = 1.3;
    const cableLength = drop / size;
    const armReach = 0.58;

    const root = new THREE.Group();
    const swing = new THREE.Group();
    swing.position.set(x, CEILING, z);
    swing.scale.setScalar(size);
    root.add(swing);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, cableLength, 8), darkMetal);
    cable.position.y = -cableLength / 2;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24), darkMetal);
    rose.position.y = -0.04;
    swing.add(cable, rose);

    const socket = new THREE.Group();
    socket.position.y = -cableLength;
    swing.add(socket);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 32), darkMetal);
    body.position.y = 0.15;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.17, 0.14, 32), darkMetal);
    cap.position.y = 0.37;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.178, 0.035, 32), brass);
    ring.position.y = 0.02;
    // Brazo del interruptor: saca la cuerda fuera del radio de la bombilla.
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, armReach - 0.15, 12), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.set((armReach + 0.15) / 2, 0.2, 0);
    const eyelet = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), brass);
    eyelet.position.set(armReach, 0.2, 0);

    // El torno espera el perfil de abajo hacia arriba para que las normales miren afuera.
    const neckProfile = [
      new THREE.Vector2(0.37, -0.44),
      new THREE.Vector2(0.3, -0.32),
      new THREE.Vector2(0.2, -0.16),
      new THREE.Vector2(0.15, -0.04),
      new THREE.Vector2(0.13, 0),
    ];
    const diffuserProfile: THREE.Vector2[] = [];
    for (let i = 14; i >= 0; i--) {
      const a = (i / 14) * (Math.PI / 2);
      diffuserProfile.push(new THREE.Vector2(0.42 * Math.cos(a), -0.62 - 0.4 * Math.sin(a)));
    }
    diffuserProfile.push(new THREE.Vector2(0.405, -0.53), new THREE.Vector2(0.37, -0.44));
    const neckMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d7d2, roughness: 0.5 });
    const diffuserMaterial = new THREE.MeshStandardMaterial({ color: 0xcfccc6, roughness: 0.42 });
    socket.add(
      body,
      cap,
      ring,
      arm,
      eyelet,
      new THREE.Mesh(new THREE.LatheGeometry(neckProfile, 48), neckMaterial),
      new THREE.Mesh(new THREE.LatheGeometry(diffuserProfile, 48), diffuserMaterial),
    );

    const desk = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.045, 0.62), wood);
    top.position.set(x, 0.74, z - 0.1);
    desk.add(top);
    for (const dx of [-0.62, 0.62]) {
      for (const dz of [-0.26, 0.26]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.72, 0.045), wood);
        leg.position.set(x + dx, 0.36, z - 0.1 + dz);
        desk.add(leg);
      }
    }
    root.add(desk);

    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial());
    pick.position.set(x, CEILING - drop - 0.28, z);

    const lamp = makeLamp(spec, {
      root,
      lightParent: socket,
      lightAt: new THREE.Vector3(0, -0.66, 0),
      lightGain: 30,
      glows: [
        { material: diffuserMaterial, gain: 1.9 },
        { material: neckMaterial, gain: 0.75 },
      ],
      haloSize: 2.6,
      focus: new THREE.Vector3(x, CEILING - drop - 0.35, z),
      focusDistance: 2.7,
      anchorLocal: new THREE.Vector3(armReach, -cableLength + 0.2, 0),
      cordLength: 1.15 * size,
      cordThickness: 0.0055,
      handleScale: size,
      colliders: [
        { local: new THREE.Vector3(0, -cableLength - 0.62, 0), radius: 0.47 * size },
        { local: new THREE.Vector3(0, -cableLength - 0.3, 0), radius: 0.32 * size },
      ],
      pick,
    });
    // La cuerda y los topes cuelgan del péndulo, no de la raíz.
    lamp.root = swing;

    let angle = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.05;
    let velocity = 0;
    let sag = 0;
    lamp.step = () => {
      const { cord } = lamp;
      const torque = (cord.pull / size) * 9 * cord.pullX;
      velocity += (-14 * Math.sin(angle) - 1.5 * velocity + torque) * STEP;
      angle += velocity * STEP;
      sag += (cord.pull * 0.07 - sag) * Math.min(1, 30 * STEP);
      swing.rotation.z = angle;
      swing.position.y = CEILING - sag;
    };
    return lamp;
  };

  const shadeMaterial = () =>
    new THREE.MeshStandardMaterial({ color: 0xd8ccb6, roughness: 0.9, side: THREE.DoubleSide });
  const bulbMaterial = () => new THREE.MeshStandardMaterial({ color: 0xcfccc6, roughness: 0.4 });

  /** Lámpara de pie con pantalla. */
  const buildFloor = (spec: LampSpec, x: number): Lamp => {
    const z = -1.15;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.03, 40), darkMetal);
    base.position.y = 0.015;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.52, 12), darkMetal);
    pole.position.y = 0.79;
    const shade = shadeMaterial();
    const shadeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.34, 48, 1, true), shade);
    shadeMesh.position.y = 1.62;
    const bulb = bulbMaterial();
    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 16), bulb);
    bulbMesh.position.y = 1.58;
    const armX = 0.11;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, armX, 8), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(armX / 2, 1.5, 0);
    root.add(base, pole, shadeMesh, bulbMesh, arm);

    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.85, 10), new THREE.MeshBasicMaterial());
    pick.position.y = 0.92;

    return makeLamp(spec, {
      root,
      lightParent: root,
      lightAt: new THREE.Vector3(0, 1.58, 0),
      lightGain: 15,
      glows: [
        { material: shade, gain: 0.85 },
        { material: bulb, gain: 2.4 },
      ],
      haloSize: 1.5,
      focus: new THREE.Vector3(x, 1.3, z),
      focusDistance: 3.2,
      anchorLocal: new THREE.Vector3(armX, 1.5, 0),
      cordLength: 0.36,
      cordThickness: 0.004,
      handleScale: 0.36,
      colliders: [],
      pick,
    });
  };

  /** Velador sobre una mesa de luz. */
  const buildTable = (spec: LampSpec, x: number): Lamp => {
    const z = -1.35;
    const tableTop = 0.58;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const table = new THREE.Mesh(new THREE.BoxGeometry(0.58, tableTop, 0.44), wood);
    table.position.y = tableTop / 2;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), brass);
    knob.position.set(0, tableTop - 0.14, 0.225);
    const foot = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0x5d6b78, roughness: 0.35 }),
    );
    foot.scale.y = 0.85;
    foot.position.y = tableTop + 0.09;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 12), brass);
    stem.position.y = tableTop + 0.26;
    const shade = shadeMaterial();
    const shadeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.19, 0.23, 48, 1, true), shade);
    shadeMesh.position.y = tableTop + 0.43;
    const bulb = bulbMaterial();
    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), bulb);
    bulbMesh.position.y = tableTop + 0.4;
    const armX = 0.08;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, armX, 8), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(armX / 2, tableTop + 0.34, 0.03);
    root.add(table, knob, foot, stem, shadeMesh, bulbMesh, arm);

    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.62, tableTop + 0.6, 0.48), new THREE.MeshBasicMaterial());
    pick.position.y = (tableTop + 0.6) / 2;

    return makeLamp(spec, {
      root,
      lightParent: root,
      lightAt: new THREE.Vector3(0, tableTop + 0.4, 0),
      lightGain: 9,
      glows: [
        { material: shade, gain: 0.85 },
        { material: bulb, gain: 2.4 },
      ],
      haloSize: 1.1,
      focus: new THREE.Vector3(x, tableTop + 0.25, z),
      focusDistance: 2.3,
      anchorLocal: new THREE.Vector3(armX, tableTop + 0.34, 0.03),
      cordLength: 0.2,
      cordThickness: 0.0035,
      handleScale: 0.3,
      colliders: [{ local: new THREE.Vector3(0, tableTop + 0.09, 0), radius: 0.11 }],
      pick,
    });
  };

  const builders: Record<LampKind, (spec: LampSpec, x: number) => Lamp> = {
    pendant: buildPendant,
    floor: buildFloor,
    table: buildTable,
  };
  const slots: Record<LampKind, number> = { floor: -1.5, pendant: 0, table: 1.5 };
  options.lamps.forEach((spec) => lamps.push(builders[spec.kind](spec, slots[spec.kind])));

  const syncLamp = (lamp: Lamp) => {
    lamp.root.updateMatrixWorld(true);
    lamp.cord.anchor.copy(lamp.anchorLocal).applyMatrix4(lamp.root.matrixWorld);
    lamp.colliders.forEach((c) => c.world.copy(c.local).applyMatrix4(lamp.root.matrixWorld));
  };
  lamps.forEach((lamp) => {
    lamp.step?.();
    syncLamp(lamp);
    lamp.cord.reset();
  });

  // ── Cámara ──
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 1.1;
  controls.minPolarAngle = 0.95;
  controls.maxPolarAngle = 1.66;
  controls.minAzimuthAngle = -1.05;
  controls.maxAzimuthAngle = 1.05;

  let width = 1;
  let height = 1;
  let shift = 0;
  let targetShift = 0;
  let appliedShift = NaN;
  let roomDistance = 7;

  const fly = {
    active: false,
    t: 0,
    fromPosition: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toPosition: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  };
  let currentFocus: string | null = null;

  const viewOf = (id: string | null, position: THREE.Vector3, target: THREE.Vector3) => {
    const lamp = id ? lamps.find((l) => l.id === id) : undefined;
    const distance = lamp ? lamp.focusDistance : roomDistance;
    target.copy(lamp ? lamp.focus : ROOM_TARGET);
    position.set(target.x, target.y + distance * 0.06, target.z + distance);
  };

  const flyTo = (id: string | null) => {
    currentFocus = id;
    fly.fromPosition.copy(camera.position);
    fly.fromTarget.copy(controls.target);
    viewOf(id, fly.toPosition, fly.toTarget);
    fly.t = 0;
    fly.active = true;
  };

  const updateRoomDistance = () => {
    // La escena se encuadra en el hueco que deja libre la ventana de la app.
    const free = 1 - 2 * Math.abs(targetShift);
    roomDistance = Math.max(5.2, ROOM_HALF_WIDTH / (tanHalfFov * camera.aspect * free));
    controls.maxDistance = roomDistance * 1.2;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    appliedShift = NaN;
    updateRoomDistance();
    if (currentFocus === null && userMoved === false) flyTo(null);
  };

  let userMoved = false;
  const markUserMoved = () => {
    fly.active = false;
    if (userMoved) return;
    userMoved = true;
    options.onUserOrbit?.();
  };

  // ── Interacción ──
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane();
  const ndc = new THREE.Vector2();
  const scratch = new THREE.Vector3();
  const picks = lamps.map((lamp) => lamp.pick);
  let dragged: Lamp | null = null;
  let pointerId: number | null = null;
  let downX = 0;
  let downY = 0;
  let pressed = false;

  const toNdc = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };

  const handleAt = (clientX: number, clientY: number): Lamp | null => {
    const rect = canvas.getBoundingClientRect();
    let best: Lamp | null = null;
    let bestDistance = HIT_RADIUS_PX * HIT_RADIUS_PX;
    for (const lamp of lamps) {
      const dx = clientX - rect.left - lamp.cord.screen.x;
      const dy = clientY - rect.top - lamp.cord.screen.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = lamp;
        bestDistance = distance;
      }
    }
    return best;
  };

  const lampAt = (clientX: number, clientY: number): string | null => {
    toNdc(clientX, clientY);
    const hit = raycaster.intersectObjects(picks, false)[0];
    return hit ? (hit.object.userData.lampId as string) : null;
  };

  // El tirador se arrastra en un plano de cara a la cámara que pasa por su anclaje.
  const moveDragTarget = (lamp: Lamp, clientX: number, clientY: number) => {
    toNdc(clientX, clientY);
    camera.getWorldDirection(scratch);
    dragPlane.setFromNormalAndCoplanarPoint(scratch, lamp.cord.anchor);
    raycaster.ray.intersectPlane(dragPlane, lamp.cord.target);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || dragged) return;
    downX = e.clientX;
    downY = e.clientY;
    pressed = true;
    const lamp = handleAt(e.clientX, e.clientY);
    if (!lamp) return;
    // Agarrar una cuerda no debe girar la cámara.
    controls.enabled = false;
    dragged = lamp;
    pointerId = e.pointerId;
    lamp.cord.dragging = true;
    lamp.cord.auto = -1;
    moveDragTarget(lamp, e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragged) {
      if (e.pointerId === pointerId) moveDragTarget(dragged, e.clientX, e.clientY);
      return;
    }
    if (pressed) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) markUserMoved();
      return;
    }
    canvas.style.cursor = handleAt(e.clientX, e.clientY) ? 'grab' : lampAt(e.clientX, e.clientY) ? 'pointer' : '';
  };

  const onPointerUp = (e: PointerEvent) => {
    if (dragged) {
      if (e.pointerId !== pointerId) return;
      dragged.cord.dragging = false;
      dragged = null;
      pointerId = null;
      pressed = false;
      controls.enabled = true;
      canvas.style.cursor = 'grab';
      return;
    }
    if (!pressed) return;
    pressed = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (e.type === 'pointerup' && moved < 6) {
      const id = lampAt(e.clientX, e.clientY);
      if (id) options.onSelect(id);
    }
  };

  // Capturado antes que OrbitControls, para que la cuerda tenga prioridad.
  canvas.addEventListener('pointerdown', onPointerDown, true);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', markUserMoved, { passive: true });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  // Entrada: la cámara arranca un poco más lejos y se acerca a la vista general.
  viewOf(null, camera.position, controls.target);
  camera.position.z += roomDistance * 0.18;
  flyTo(null);

  let lastTime = performance.now();
  let accumulator = 0;
  let frame = 0;

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    accumulator += dt;
    while (accumulator >= STEP) {
      for (const lamp of lamps) {
        lamp.step?.();
        syncLamp(lamp);
        lamp.cord.step();
      }
      accumulator -= STEP;
    }

    if (fly.active) {
      fly.t = Math.min(1, fly.t + dt / 1.1);
      const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
      camera.position.lerpVectors(fly.fromPosition, fly.toPosition, k);
      controls.target.lerpVectors(fly.fromTarget, fly.toTarget, k);
      if (fly.t >= 1) fly.active = false;
    }
    controls.update();

    shift += (targetShift - shift) * (1 - Math.exp(-dt * 6));
    if (Math.abs(shift - targetShift) < 0.0005) shift = targetShift;
    if (shift !== appliedShift) {
      appliedShift = shift;
      if (shift === 0) camera.clearViewOffset();
      else camera.setViewOffset(width, height, shift * width, 0, width, height);
      camera.updateProjectionMatrix();
    }

    for (let i = 0; i < lamps.length; i++) {
      const lamp = lamps[i];
      // Luz: enciende rápido, se apaga con una cola un poco más larga.
      lamp.level += (lamp.targetLevel - lamp.level) * (1 - Math.exp(-dt * (lamp.targetLevel > lamp.level ? 16 : 9)));
      lamp.color.lerp(lamp.targetColor, 1 - Math.exp(-dt * 10));
      lamp.light.color.copy(lamp.color);
      lamp.light.intensity = lamp.level * lamp.lightGain;
      for (const glow of lamp.glows) {
        glow.material.emissive.copy(lamp.color);
        glow.material.emissiveIntensity = lamp.level * glow.gain;
      }
      lamp.halo.material.color.copy(lamp.color);
      lamp.halo.material.opacity = Math.min(1, lamp.level * 0.8);
      lamp.halo.scale.setScalar(lamp.haloSize * (0.55 + lamp.level * 0.5));

      const { cord } = lamp;
      cord.updateMesh();
      scratch.copy(cord.handle.position);
      scratch.y -= 0.1 * cord.handle.scale.y;
      scratch.project(camera);
      cord.screen.set(((scratch.x + 1) / 2) * width, ((1 - scratch.y) / 2) * height);
      options.onHandleMove?.(i, cord.screen.x, cord.screen.y);
    }

    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);

  const find = (id: string) => lamps.find((lamp) => lamp.id === id);

  return {
    setLight: (id, { on, rgb, level }) => {
      const lamp = find(id);
      if (!lamp) return;
      lamp.targetLevel = on ? THREE.MathUtils.clamp(level, 0, 1) : 0;
      // Al apagarse conserva su color mientras se desvanece.
      if (!on) return;
      lamp.targetColor.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
      // Desde apagada no hay transición de color: enciende ya en el suyo.
      if (lamp.level < 0.01) lamp.color.copy(lamp.targetColor);
    },
    pull: (id) => {
      const cord = find(id)?.cord;
      if (cord && !cord.pinned) cord.auto = 0;
    },
    focus: (id) => {
      userMoved = false;
      flyTo(id);
    },
    setViewShift: (next) => {
      if (next === targetShift) return;
      targetShift = next;
      updateRoomDistance();
      if (currentFocus === null && !userMoved) flyTo(null);
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', markUserMoved);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
      haloMap.dispose();
      renderer.dispose();
    },
  };
}
