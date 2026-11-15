// Printer explorer: a simplified, not-to-scale 3D illustration of the Bambu Lab H2S.
// Source for assets/js/explorer.bundle.js. Rebuild with: npm run build
//
// Parts and what they do follow Bambu Lab's "H2S introduction" wiki page.
// Shapes and positions are schematic. This is not an engineering model.

import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("explorer-canvas");
const stage = canvas && canvas.parentElement;
const label = document.getElementById("explorer-label");
const fallback = document.getElementById("explorer-fallback");
const status = document.getElementById("part-status");
const explodeButton = document.getElementById("explode-toggle");
const resetButton = document.getElementById("reset-view");
const partButtons = Array.from(document.querySelectorAll(".part-button"));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function token(name, fallbackValue) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallbackValue;
}

function start() {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    return false;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  const HOME = new Vector3(11.5, 7.5, 15.5);
  const TARGET = new Vector3(0, 3.5, 0.4);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 9;
  controls.maxDistance = 34;
  controls.maxPolarAngle = Math.PI * 0.55;

  scene.add(new AmbientLight(0xffffff, 1.5));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 10, 8);
  scene.add(key);
  const fill = new DirectionalLight(0xffffff, 0.8);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  // Colours come from the page so light and dark themes both work.
  const colours = {
    body: new Color(token("--ink-soft", "#4a5157")),
    dark: new Color(token("--ink", "#1b1f23")),
    light: new Color(token("--rule", "#c7cac4")),
    accent: new Color(token("--accent", "#14633c")),
  };

  function material(colour, options) {
    return new MeshStandardMaterial(
      Object.assign({ color: colour.clone(), roughness: 0.65, metalness: 0.1 }, options || {})
    );
  }

  function box(w, h, d, mat, x, y, z) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  // Overall size from the spec sheet: about 49 x 51 x 63 cm. One unit is 10 cm.
  const W = 4.9;
  const D = 5.1;
  const Hh = 6.3;
  const parts = {};

  function part(id, offset) {
    const group = new Group();
    group.userData = { id: id, offset: new Vector3(offset[0], offset[1], offset[2]) };
    parts[id] = group;
    scene.add(group);
    return group;
  }

  // Frame and enclosure: base, four posts, top ring.
  const frame = part("frame", [0, 0, 0]);
  const frameMat = material(colours.body);
  frame.add(box(W, 0.9, D, frameMat, 0, 0.45, 0));
  [-1, 1].forEach(function (sx) {
    [-1, 1].forEach(function (sz) {
      frame.add(box(0.28, Hh - 0.9, 0.28, frameMat, sx * (W / 2 - 0.14), 0.9 + (Hh - 0.9) / 2, sz * (D / 2 - 0.14)));
    });
  });
  frame.add(box(W, 0.22, 0.28, frameMat, 0, Hh - 0.11, D / 2 - 0.14));
  frame.add(box(W, 0.22, 0.28, frameMat, 0, Hh - 0.11, -(D / 2 - 0.14)));
  frame.add(box(0.28, 0.22, D, frameMat, W / 2 - 0.14, Hh - 0.11, 0));
  frame.add(box(0.28, 0.22, D, frameMat, -(W / 2 - 0.14), Hh - 0.11, 0));
  frame.add(box(W - 0.3, Hh - 1.2, 0.08, material(colours.body, { transparent: true, opacity: 0.35 }), 0, 0.9 + (Hh - 1.2) / 2, -(D / 2 - 0.05)));

  // Top cover and front door: see-through panels.
  const glass = { transparent: true, opacity: 0.28, roughness: 0.2 };
  const top = part("top", [0, 1.6, 0]);
  top.add(box(W - 0.1, 0.1, D - 0.1, material(colours.light, glass), 0, Hh + 0.06, 0));
  const door = part("door", [0, 0, 2.1]);
  door.add(box(W - 0.6, Hh - 1.3, 0.1, material(colours.light, glass), 0, 0.95 + (Hh - 1.3) / 2, D / 2 + 0.02));

  // CoreXY motion system: two side rails, the moving cross rail, two motors at the back.
  const gantry = part("gantry", [0, 0.8, 0]);
  const railMat = material(colours.dark);
  gantry.add(box(0.14, 0.14, D - 0.9, railMat, -(W / 2 - 0.45), 5.45, 0));
  gantry.add(box(0.14, 0.14, D - 0.9, railMat, W / 2 - 0.45, 5.45, 0));
  gantry.add(box(W - 0.9, 0.16, 0.16, railMat, 0, 5.45, 0.3));
  gantry.add(box(0.42, 0.42, 0.42, railMat, -(W / 2 - 0.45), 5.3, -(D / 2 - 0.5)));
  gantry.add(box(0.42, 0.42, 0.42, railMat, W / 2 - 0.45, 5.3, -(D / 2 - 0.5)));

  // Tool head: extruder body, hotend, one nozzle.
  const toolhead = part("toolhead", [0, 0.8, 1.4]);
  toolhead.add(box(0.62, 0.8, 0.52, material(colours.dark), 0.5, 5.2, 0.62));
  toolhead.add(box(0.22, 0.26, 0.22, material(colours.light), 0.5, 4.72, 0.62));
  const nozzle = new Mesh(new ConeGeometry(0.09, 0.2, 16), material(colours.light));
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0.5, 4.5, 0.62);
  toolhead.add(nozzle);

  // Heatbed with the build plate on top.
  const bed = part("bed", [0, -0.2, 1.5]);
  bed.add(box(3.7, 0.14, 3.5, material(colours.dark), 0, 2.7, 0.05));
  const plate = box(3.5, 0.05, 3.3, material(colours.light), 0, 2.8, 0.05);
  plate.userData.lift = 0.5;
  bed.add(plate);

  // Three lead screws for the Z axis.
  const screws = part("screws", [0, 0, -1.5]);
  const screwGeometry = new CylinderGeometry(0.05, 0.05, 4.3, 12);
  [
    [-1.95, -1.5],
    [1.95, -1.5],
    [0, 1.95],
  ].forEach(function (p) {
    const screw = new Mesh(screwGeometry, material(colours.light));
    screw.position.set(p[0], 0.9 + 2.15, p[1] * 0.92);
    screws.add(screw);
  });

  // Touchscreen on the front.
  const screen = part("screen", [0.8, 0.2, 2.6]);
  const screenBody = box(1.15, 0.7, 0.08, material(colours.dark), 1.45, 5.75, D / 2 + 0.1);
  screenBody.rotation.x = -0.25;
  screen.add(screenBody);

  // Safety key on the back.
  const keyPart = part("key", [0, 0, -2.0]);
  keyPart.add(box(0.3, 0.2, 0.22, material(colours.accent), -1.6, 1.3, -(D / 2 + 0.1)));

  // ---- state
  let explodeTarget = 0;
  let explode = 0;
  let selected = null;
  let needsRender = true;

  function applyExplode() {
    Object.keys(parts).forEach(function (id) {
      const group = parts[id];
      group.position.copy(group.userData.offset).multiplyScalar(explode);
    });
    plate.position.y = 2.8 + plate.userData.lift * explode;
  }

  function paint() {
    Object.keys(parts).forEach(function (id) {
      parts[id].traverse(function (object) {
        if (!object.isMesh) return;
        const isSelected = id === selected;
        object.material.emissive = isSelected ? colours.accent : new Color(0x000000);
        object.material.emissiveIntensity = isSelected ? 0.9 : 0;
      });
    });
  }

  function select(id, announce) {
    selected = id === selected ? null : id;
    partButtons.forEach(function (button) {
      const on = button.dataset.part === selected;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.parentElement.classList.toggle("is-selected", on);
    });
    const active = partButtons.find(function (button) {
      return button.dataset.part === selected;
    });
    if (label) {
      label.hidden = !active;
      label.textContent = active ? active.textContent : "";
    }
    if (status && announce !== false) {
      const text = active ? document.getElementById("part-" + selected) : null;
      status.textContent = active ? active.textContent + ". " + (text ? text.textContent : "") : "No part selected.";
    }
    paint();
    needsRender = true;
  }

  partButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      select(button.dataset.part);
    });
  });

  explodeButton.addEventListener("click", function () {
    explodeTarget = explodeTarget ? 0 : 1;
    explodeButton.setAttribute("aria-pressed", explodeTarget ? "true" : "false");
    explodeButton.textContent = explodeTarget ? "Put the printer back together" : "Pull the parts apart";
    if (reduceMotion.matches) explode = explodeTarget;
    needsRender = true;
  });

  resetButton.addEventListener("click", function () {
    explodeTarget = 0;
    if (reduceMotion.matches) explode = 0;
    explodeButton.setAttribute("aria-pressed", "false");
    explodeButton.textContent = "Pull the parts apart";
    camera.position.copy(HOME);
    controls.target.copy(TARGET);
    if (selected) select(selected, false);
    needsRender = true;
  });

  // Pick a part by clicking or tapping it. A drag does not count as a pick.
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let downAt = null;
  canvas.addEventListener("pointerdown", function (event) {
    downAt = [event.clientX, event.clientY];
  });
  canvas.addEventListener("pointerup", function (event) {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]);
    downAt = null;
    if (moved > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    // Prefer solid parts over the see-through cover and door.
    const hit =
      hits.find(function (h) {
        return h.object.material.opacity === 1;
      }) || hits[0];
    if (!hit) return;
    let node = hit.object;
    while (node && !(node.userData && node.userData.id)) node = node.parent;
    if (node) select(node.userData.id);
  });

  controls.addEventListener("change", function () {
    needsRender = true;
  });

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull the camera back on narrow screens so the whole printer fits.
    camera.fov = width < 520 ? 46 : 35;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener("resize", resize);
  resize();

  const anchor = new Vector3();
  function placeLabel() {
    if (!label || label.hidden || !selected) return;
    anchor.set(0, 0, 0);
    let count = 0;
    parts[selected].traverse(function (object) {
      if (!object.isMesh) return;
      anchor.add(object.getWorldPosition(new Vector3()));
      count += 1;
    });
    anchor.divideScalar(count || 1).project(camera);
    const x = (anchor.x * 0.5 + 0.5) * stage.clientWidth;
    const y = (-anchor.y * 0.5 + 0.5) * stage.clientHeight;
    label.style.transform =
      "translate(" + Math.round(Math.min(Math.max(x, 60), stage.clientWidth - 60)) + "px," + Math.round(Math.max(y - 14, 24)) + "px) translate(-50%,-100%)";
  }

  function frameLoop() {
    if (Math.abs(explode - explodeTarget) > 0.001) {
      explode += (explodeTarget - explode) * 0.12;
      needsRender = true;
    } else if (explode !== explodeTarget) {
      explode = explodeTarget;
      needsRender = true;
    }
    if (controls.update()) needsRender = true;
    if (needsRender) {
      applyExplode();
      renderer.render(scene, camera);
      placeLabel();
      needsRender = false;
    }
    window.requestAnimationFrame(frameLoop);
  }

  // Follow the page theme if it changes while the page is open.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    window.location.reload();
  });

  paint();
  frameLoop();
  window.__explorerReady = true;
  return true;
}

if (canvas && stage && explodeButton && resetButton) {
  const ok = start();
  if (!ok) {
    canvas.hidden = true;
    explodeButton.hidden = true;
    resetButton.hidden = true;
    if (fallback) fallback.hidden = false;
  }
}
