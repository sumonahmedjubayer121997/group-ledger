import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useCursor } from "@react-three/drei";
import { formatMoney } from "../money";
import { type Debt, type LabelSide, type Stage, debtFor, indexOf, labelAt, maxAmount, maxNet, nets, pairs, people } from "./debtModel";
import { type Palette, usePalette } from "./palette";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);

/* ---------- tuning ---------- */

const K_HOME = 3; // pull back towards the resting layout
const K_LINK = 7; // link stiffness; bigger debts pull harder
const DAMPING = 5;
const SETTLE_RUSH = 1.3; // seconds the coins race along the links before the debts clear
const BOUNDS = { x: 3.6, yMin: -2.3, yMax: 2.5 };
const UP = new THREE.Vector3(0, 1, 0);

const radiusOf = (i: number) => 0.3 + 0.24 * Math.sqrt(Math.abs(nets[people[i].id]) / maxNet);
const homeOf = (i: number) => new THREE.Vector3(...people[i].home);
const restLength = pairs.map(({ a, b }) => homeOf(indexOf(a)).distanceTo(homeOf(indexOf(b))));

/** Name labels hang off the sphere's outer edge: anchor point on the sphere, then a CSS shift away from it. */
const labelAnchor: Record<LabelSide, (r: number) => [number, number, number]> = {
  top: (r) => [0, r, 0],
  bottom: (r) => [0, -r, 0],
  left: (r) => [-r, 0, 0],
  right: (r) => [r, 0, 0],
};
const labelShift: Record<LabelSide, string> = {
  top: "translate(-50%, calc(-100% - 6px))",
  bottom: "translate(-50%, 6px)",
  left: "translate(calc(-100% - 8px), -50%)",
  right: "translate(8px, -50%)",
};

/** Pointer capture keeps the drag alive when the cursor leaves the sphere; it can throw for synthetic pointers. */
function capture(e: ThreeEvent<PointerEvent>, on: boolean) {
  const target = e.target as unknown as Element;
  try {
    if (on) target.setPointerCapture(e.pointerId);
    else target.releasePointerCapture(e.pointerId);
  } catch {
    // ignore: dragging still works while the pointer stays over the sphere
  }
}

type LinkState = { amount: number; vis: number; active: boolean; debt: Debt | null };

/* ---------- the web ---------- */

function Web({ stage, palette }: { stage: Stage; palette: Palette }) {
  const pos = useRef(people.map((_, i) => homeOf(i)));
  const vel = useRef(people.map(() => new THREE.Vector3()));
  const dragged = useRef<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  useCursor(hovered !== null || grabbing, grabbing ? "grabbing" : "grab");

  const nodeGroups = useRef<(THREE.Group | null)[]>([]);
  const nodeMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const linkMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const labelGroups = useRef<(THREE.Group | null)[]>([]);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const coinMeshes = useRef<(THREE.Mesh | null)[]>([]);

  const links = useRef<LinkState[]>(
    pairs.map((p) => {
      const debt = debtFor("tangled", p.key);
      return { amount: debt?.amount ?? 0, vis: debt ? 1 : 0, active: !!debt, debt };
    }),
  );
  const rush = useRef(0);
  const flow = useRef(0);
  const previousStage = useRef(stage);

  useEffect(() => {
    if (stage === "settled" && previousStage.current !== "settled") rush.current = SETTLE_RUSH;
    previousStage.current = stage;
  }, [stage]);

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const scratch = useMemo(
    () => ({ hit: new THREE.Vector3(), force: new THREE.Vector3(), d: new THREE.Vector3(), home: new THREE.Vector3(), color: new THREE.Color() }),
    [],
  );

  const grab = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    capture(e, true);
    plane.constant = -pos.current[i].z;
    dragged.current = i;
    setGrabbing(true);
  };
  const move = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    if (dragged.current !== i || !e.ray.intersectPlane(plane, scratch.hit)) return;
    const p = pos.current[i];
    p.x = THREE.MathUtils.clamp(scratch.hit.x, -BOUNDS.x, BOUNDS.x);
    p.y = THREE.MathUtils.clamp(scratch.hit.y, BOUNDS.yMin, BOUNDS.yMax);
    vel.current[i].set(0, 0, 0);
  };
  const release = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    if (dragged.current !== i) return;
    capture(e, false);
    dragged.current = null;
    setGrabbing(false);
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    if (rush.current > 0) rush.current = Math.max(0, rush.current - dt);
    const settling = stage === "settled" && rush.current > 0;
    const square = stage === "settled" && rush.current === 0;
    const ease = 1 - Math.exp(-dt * 5);

    // 1. Each link eases towards this stage's debt (or away, if the pair owes nothing now).
    pairs.forEach((pair, k) => {
      const link = links.current[k];
      const target = settling ? (link.active ? link.debt : null) : debtFor(stage, pair.key);
      link.active = !!target;
      if (target) link.debt = target;
      link.vis += ((target ? 1 : 0) - link.vis) * ease;
      link.amount += ((target?.amount ?? link.amount) - link.amount) * ease;
    });

    // 2. Springs: every friend is pulled home, and pulled along each link they're part of.
    const steps = 2;
    const h = dt / steps;
    for (let step = 0; step < steps; step++) {
      people.forEach((person, i) => {
        if (dragged.current === i) return;
        const p = pos.current[i];
        scratch.home.set(...person.home);
        scratch.home.y += Math.sin(t * 0.8 + i * 1.7) * 0.06; // gentle breathing
        scratch.force.copy(scratch.home).sub(p).multiplyScalar(K_HOME);

        pairs.forEach((pair, k) => {
          const link = links.current[k];
          if (link.vis < 0.02) return;
          const ia = indexOf(pair.a);
          const ib = indexOf(pair.b);
          if (ia !== i && ib !== i) return;
          scratch.d.copy(pos.current[ia === i ? ib : ia]).sub(p);
          const len = scratch.d.length() || 1e-6;
          const strength = K_LINK * link.vis * (0.4 + link.amount / maxAmount);
          scratch.force.addScaledVector(scratch.d, (strength * (len - restLength[k])) / len);
        });

        const v = vel.current[i];
        v.addScaledVector(scratch.force, h).multiplyScalar(Math.exp(-DAMPING * h));
        p.addScaledVector(v, h);
      });
    }

    // 3. Draw: friends, links, labels and the coins flowing from debtor to creditor.
    people.forEach((person, i) => {
      nodeGroups.current[i]?.position.copy(pos.current[i]);
      const material = nodeMaterials.current[i];
      if (material) {
        scratch.color.set(square ? palette.settled : nets[person.id] > 0 ? palette.ink : palette.owes);
        material.color.lerp(scratch.color, 1 - Math.exp(-dt * 4));
      }
    });

    flow.current += dt * (settling ? 1.6 : 0.3);
    pairs.forEach((pair, k) => {
      const link = links.current[k];
      const a = pos.current[indexOf(pair.a)];
      const b = pos.current[indexOf(pair.b)];

      const mesh = linkMeshes.current[k];
      if (mesh) {
        scratch.d.copy(b).sub(a);
        const len = scratch.d.length();
        const r = link.vis * (0.018 + (0.06 * link.amount) / maxAmount);
        mesh.visible = link.vis > 0.01;
        mesh.position.copy(a).addScaledVector(scratch.d, 0.5);
        mesh.quaternion.setFromUnitVectors(UP, scratch.d.normalize());
        mesh.scale.set(r, len, r);
      }

      const from = link.debt ? pos.current[indexOf(link.debt.from)] : a;
      const to = link.debt ? pos.current[indexOf(link.debt.to)] : b;
      labelGroups.current[k]?.position.lerpVectors(from, to, labelAt[pair.key] ?? 0.5);
      const chip = chips.current[k];
      if (chip) chip.style.opacity = String(THREE.MathUtils.clamp((link.vis - 0.4) / 0.6, 0, 1));

      for (let c = 0; c < 2; c++) {
        const coin = coinMeshes.current[k * 2 + c];
        if (!coin) continue;
        coin.position.lerpVectors(from, to, (flow.current + c * 0.5 + k * 0.17) % 1);
        coin.scale.setScalar(Math.max(0.0001, link.vis * (0.055 + (0.03 * link.amount) / maxAmount)));
        coin.visible = link.vis > 0.05;
      }
    });

    // 4. The camera drifts a little with the pointer, for depth.
    if (dragged.current === null) {
      const follow = 1 - Math.exp(-dt * 2);
      state.camera.position.x += (state.pointer.x * 0.6 - state.camera.position.x) * follow;
      state.camera.position.y += (1.2 + state.pointer.y * 0.4 - state.camera.position.y) * follow;
      state.camera.lookAt(0, 0.5, 0);
    }
  });

  return (
    <>
      {pairs.map((pair, k) => {
        const amount =
          debtFor(stage, pair.key)?.amount ?? debtFor("simplified", pair.key)?.amount ?? debtFor("tangled", pair.key)?.amount ?? 0;
        return (
          <group key={pair.key}>
            <mesh ref={(m) => (linkMeshes.current[k] = m)}>
              <cylinderGeometry args={[1, 1, 1, 12, 1, true]} />
              <meshBasicMaterial color={palette.ink} />
            </mesh>
            {[0, 1].map((c) => (
              <mesh key={c} ref={(m) => (coinMeshes.current[k * 2 + c] = m)}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshBasicMaterial color={palette.owes} />
              </mesh>
            ))}
            <group ref={(g) => (labelGroups.current[k] = g)}>
              <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
                <div
                  ref={(el) => (chips.current[k] = el)}
                  className="whitespace-nowrap rounded-md border border-lp-rule bg-lp-paper px-1.5 py-0.5 font-inter text-[12px] tabular-nums text-lp-ink"
                >
                  {taka(amount)}
                </div>
              </Html>
            </group>
          </group>
        );
      })}

      {people.map((person, i) => {
        const r = radiusOf(i);
        return (
          <group key={person.id} ref={(g) => (nodeGroups.current[i] = g)} position={person.home}>
            <mesh
              onPointerDown={grab(i)}
              onPointerMove={move(i)}
              onPointerUp={release(i)}
              onPointerCancel={release(i)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(i);
              }}
              onPointerOut={() => setHovered((h) => (h === i ? null : h))}
            >
              <sphereGeometry args={[r, 48, 32]} />
              <meshStandardMaterial
                ref={(m) => (nodeMaterials.current[i] = m)}
                color={nets[person.id] > 0 ? palette.ink : palette.owes}
                roughness={0.45}
              />
            </mesh>
            <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <span className="select-none font-inter text-[13px] font-semibold text-lp-paper">{person.name[0]}</span>
            </Html>
            <Html position={labelAnchor[person.label](r)} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <span
                className="block select-none whitespace-nowrap font-inter text-[13px] font-medium text-lp-ink"
                style={{ transform: labelShift[person.label] }}
              >
                {person.name}
              </span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* ---------- canvas ---------- */

/** Switching frameloop from "never" back to "always" doesn't restart R3F's render loop by itself. */
function ResumeOnActive({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  return null;
}

export default function DebtWeb({ stage, active }: { stage: Stage; active: boolean }) {
  const palette = usePalette();
  return (
    <div className="h-full w-full" style={{ touchAction: "pan-y" }}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 1.2, 12.5], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={palette.dark ? 0.85 : 0.7} />
        <directionalLight position={[3, 5, 6]} intensity={1.3} />
        <ResumeOnActive active={active} />
        <Web stage={stage} palette={palette} />
      </Canvas>
    </div>
  );
}
