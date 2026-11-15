// Printer model for the opening sequence and the printer explorer.
// A hand-built reconstruction of the Bambu Lab H2S from its published outer size
// (about 492 x 514 x 626 mm) and the parts named on Bambu Lab's "H2S introduction" page.
// It is not Bambu Lab's engineering model. One unit is 10 cm.
(function () {
  "use strict";
  var T = window.THREE;
  var IDS = ["frame", "top", "door", "gantry", "toolhead", "bed", "screws", "screen", "key"];

  function supported() {
    if (!T) return false;
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function create(canvas, opts) {
    opts = opts || {};
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    var scene = new T.Scene();
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    var camera = new T.PerspectiveCamera(30, 1, 0.1, 200);
    var root = new T.Group();
    scene.add(root);

    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    var key = new T.DirectionalLight(0xffffff, 2.0);
    key.position.set(7, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 11; key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 40; key.shadow.bias = -0.0004; key.shadow.radius = 4;
    scene.add(key);
    var rim = new T.DirectionalLight(0xbfe6d2, 1.6);
    rim.position.set(-9, 6, -10);
    scene.add(rim);
    var chamber = new T.PointLight(0xfff1dc, 3.2, 9, 2);
    chamber.position.set(0, 5.6, 1.2);
    root.add(chamber);

    var floor = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: opts.hero ? 0.55 : 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.085; floor.receiveShadow = true;
    scene.add(floor);

    // ---- materials (a fresh one per part so a highlight never leaks)
    var mats = [];
    function mat(kind) {
      var m;
      if (kind === "shell") m = new T.MeshStandardMaterial({ color: 0x17191b, metalness: 0.55, roughness: 0.46 });
      else if (kind === "panel") m = new T.MeshStandardMaterial({ color: 0x121416, metalness: 0.4, roughness: 0.6 });
      else if (kind === "plastic") m = new T.MeshStandardMaterial({ color: 0x0f1113, metalness: 0.1, roughness: 0.58 });
      else if (kind === "steel") m = new T.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 1, roughness: 0.18 });
      else if (kind === "alu") m = new T.MeshStandardMaterial({ color: 0x8b9298, metalness: 0.9, roughness: 0.38 });
      else if (kind === "belt") m = new T.MeshStandardMaterial({ color: 0x08090a, metalness: 0, roughness: 0.92 });
      else if (kind === "plate") m = new T.MeshStandardMaterial({ color: 0x9c7a2a, metalness: 0.65, roughness: 0.52 });
      else if (kind === "brass") m = new T.MeshStandardMaterial({ color: 0xb08a3c, metalness: 1, roughness: 0.3 });
      else if (kind === "rubber") m = new T.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0, roughness: 0.95 });
      else if (kind === "green") m = new T.MeshStandardMaterial({ color: 0x00ae42, metalness: 0.2, roughness: 0.45, emissive: 0x00ae42, emissiveIntensity: 0.25 });
      else if (kind === "display") m = new T.MeshStandardMaterial({ color: 0x05080a, metalness: 0.2, roughness: 0.08, emissive: 0x1c6f52, emissiveIntensity: 0.9 });
      else if (kind === "glass") m = new T.MeshPhysicalMaterial({ color: 0xb9cdc8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03 });
      if (kind !== "glass" && kind !== "steel" && kind !== "brass") m.envMapIntensity = 0.55;
      m.userData.base = { emissive: m.emissive ? m.emissive.getHex() : 0, intensity: m.emissiveIntensity || 0, opacity: m.opacity };
      mats.push(m);
      return m;
    }

    var parts = {};
    function part(id, order) {
      var g = new T.Group();
      g.userData = { id: id, order: order, pieces: [], mats: {} };
      parts[id] = g;
      root.add(g);
      return g;
    }
    function pm(g, kind) { return g.userData.mats[kind] || (g.userData.mats[kind] = mat(kind)); }
    // Add a piece. off = how far it travels when the printer is pulled apart; rot = how far it turns.
    function piece(g, mesh, off, rot, pivot) {
      var holder = new T.Group();
      if (pivot) { holder.position.set(pivot[0], pivot[1], pivot[2]); mesh.position.sub(holder.position); }
      holder.add(mesh);
      holder.userData = { home: holder.position.clone(), off: new T.Vector3(off[0], off[1], off[2]), rot: rot || [0, 0, 0] };
      mesh.traverse(function (o) { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = !o.material.transparent; } });
      g.add(holder); g.userData.pieces.push(holder);
      return holder;
    }
    function rbox(w, h, d, r, m, x, y, z) {
      var rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      var mesh = new T.Mesh(rr > 0.004 ? new T.RoundedBoxGeometry(w, h, d, 3, rr) : new T.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z); return mesh;
    }
    function cyl(r, h, m, x, y, z, axis, seg) {
      var mesh = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 28), m);
      if (axis === "x") mesh.rotation.z = Math.PI / 2;
      if (axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z); return mesh;
    }
    function group() { var g = new T.Group(); for (var i = 0; i < arguments.length; i++) g.add(arguments[i]); return g; }

    var W = 4.92, D = 5.14, H = 6.26, BASE = 0.78, POST = 0.36, RING = 0.3;
    var inH = H - BASE - RING;           // open height between the base and the top ring
    var midY = BASE + inH / 2;

    // ---- frame and enclosure
    var frame = part("frame", 0);
    piece(frame, rbox(W, BASE, D, 0.09, pm(frame, "shell"), 0, BASE / 2, 0), [0, 0, 0]);
    piece(frame, rbox(W - 0.5, 0.03, D - 0.5, 0, pm(frame, "panel"), 0, BASE + 0.015, 0), [0, 0, 0]);
    var feet = new T.Group();
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { feet.add(cyl(0.2, 0.09, pm(frame, "rubber"), sx * (W / 2 - 0.45), -0.04, sz * (D / 2 - 0.45))); }); });
    piece(frame, feet, [0, 0, 0]);
    var posts = new T.Group();
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { posts.add(rbox(POST, inH, POST, 0.06, pm(frame, "shell"), sx * (W / 2 - POST / 2), midY, sz * (D / 2 - POST / 2))); }); });
    piece(frame, posts, [0, 0, 0]);
    var ring = group(
      rbox(W, RING, POST, 0.06, pm(frame, "shell"), 0, H - RING / 2, D / 2 - POST / 2),
      rbox(W, RING, POST, 0.06, pm(frame, "shell"), 0, H - RING / 2, -(D / 2 - POST / 2)),
      rbox(POST, RING, D, 0.06, pm(frame, "shell"), W / 2 - POST / 2, H - RING / 2, 0),
      rbox(POST, RING, D, 0.06, pm(frame, "shell"), -(W / 2 - POST / 2), H - RING / 2, 0));
    piece(frame, ring, [0, 0, 0]);
    // Side and back panels slide outwards when the printer is pulled apart.
    piece(frame, rbox(0.07, inH, D - 2 * POST, 0.02, pm(frame, "panel"), -(W / 2 - 0.05), midY, 0), [-1.9, 0, 0]);
    piece(frame, rbox(0.07, inH, D - 2 * POST, 0.02, pm(frame, "panel"), W / 2 - 0.05, midY, 0), [1.9, 0, 0]);
    var back = group(rbox(W - 2 * POST, inH, 0.07, 0.02, pm(frame, "panel"), 0, midY, -(D / 2 - 0.05)));
    var fan = new T.Mesh(new T.TorusGeometry(0.42, 0.045, 10, 40), pm(frame, "plastic")); fan.position.set(1.2, H - 1.25, -(D / 2 + 0.0));
    back.add(fan, cyl(0.4, 0.03, pm(frame, "rubber"), 1.2, H - 1.25, -(D / 2 - 0.01), "z"), cyl(0.1, 0.05, pm(frame, "plastic"), 1.2, H - 1.25, -(D / 2 + 0.01), "z"));
    for (var s = 0; s < 6; s++) { var spoke = rbox(0.78, 0.03, 0.03, 0, pm(frame, "plastic"), 1.2, H - 1.25, -(D / 2 + 0.02)); spoke.rotation.z = (s * Math.PI) / 6; back.add(spoke); }
    back.add(rbox(0.62, 0.38, 0.06, 0.03, pm(frame, "plastic"), -1.55, BASE + 0.45, -(D / 2 + 0.01)));
    piece(frame, back, [0, 0, -2.6]);

    // ---- top cover: glass in a slim surround
    var top = part("top", 1);
    var lid = group(rbox(W - 0.2, 0.06, D - 0.2, 0.02, pm(top, "glass"), 0, H + 0.07, 0));
    [[W - 0.12, 0.1, 0.16, 0, D / 2 - 0.14], [W - 0.12, 0.1, 0.16, 0, -(D / 2 - 0.14)], [0.16, 0.1, D - 0.12, W / 2 - 0.14, 0], [0.16, 0.1, D - 0.12, -(W / 2 - 0.14), 0]].forEach(function (b) {
      lid.add(rbox(b[0], b[1], b[2], 0.04, pm(top, "plastic"), b[3], H + 0.07, b[4]));
    });
    piece(top, lid, [0, 2.3, -0.3], [-0.16, 0, 0]);

    // ---- front door: glass, surround and handle, hinged on the right
    var door = part("door", 2);
    var dw = W - 2 * POST + 0.2, dh = inH - 0.06, dz = D / 2 + 0.03;
    var leaf = group(rbox(dw, dh, 0.06, 0.02, pm(door, "glass"), 0, midY, dz));
    [[dw, 0.14, 0, midY + dh / 2 - 0.07], [dw, 0.14, 0, midY - dh / 2 + 0.07]].forEach(function (b) { leaf.add(rbox(b[0], b[1], 0.09, 0.03, pm(door, "plastic"), b[2], b[3], dz)); });
    [-1, 1].forEach(function (sx) { leaf.add(rbox(0.14, dh, 0.09, 0.03, pm(door, "plastic"), sx * (dw / 2 - 0.07), midY, dz)); });
    leaf.add(rbox(0.07, 1.5, 0.12, 0.03, pm(door, "steel"), -(dw / 2 - 0.3), midY + 0.2, dz + 0.1));
    piece(door, leaf, [0.5, 0, 2.3], [0, -0.55, 0], [dw / 2, midY, dz]);

    // ---- CoreXY motion system
    var gantry = part("gantry", 3);
    var gy = H - RING - 0.42, railX = W / 2 - POST - 0.22, railLen = D - 2 * POST - 0.5;
    var gx = group();
    [-1, 1].forEach(function (sx) {
      gx.add(cyl(0.055, railLen, pm(gantry, "steel"), sx * railX, gy, 0, "z"));
      gx.add(cyl(0.055, railLen, pm(gantry, "steel"), sx * railX, gy - 0.24, 0, "z"));
      gx.add(rbox(0.46, 0.5, 0.46, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.18, -(railLen / 2 + 0.05)));
      gx.add(cyl(0.11, 0.14, pm(gantry, "steel"), sx * railX, gy + 0.14, -(railLen / 2 + 0.05)));
      gx.add(cyl(0.09, 0.1, pm(gantry, "steel"), sx * railX, gy + 0.12, railLen / 2 + 0.02));
      gx.add(rbox(0.03, 0.07, railLen, 0, pm(gantry, "belt"), sx * (railX + 0.1), gy + 0.12, 0));
      gx.add(rbox(0.3, 0.36, 0.42, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.12, 0.45));
    });
    gx.add(rbox(2 * railX, 0.2, 0.26, 0.04, pm(gantry, "alu"), 0, gy - 0.12, 0.45));
    gx.add(cyl(0.04, 2 * railX - 0.3, pm(gantry, "steel"), 0, gy + 0.03, 0.45, "x"));
    gx.add(rbox(2 * railX, 0.07, 0.03, 0, pm(gantry, "belt"), 0, gy + 0.12, 0.33));
    piece(gantry, gx, [0, 1.25, 0]);

    // ---- tool head
    var toolhead = part("toolhead", 4);
    var tx = 0.55, tz = 0.82;
    var th = group(
      rbox(0.66, 0.92, 0.6, 0.08, pm(toolhead, "plastic"), tx, gy - 0.34, tz),
      rbox(0.6, 0.62, 0.05, 0.02, pm(toolhead, "shell"), tx, gy - 0.3, tz + 0.31),
      rbox(0.3, 0.03, 0.06, 0, pm(toolhead, "green"), tx, gy - 0.02, tz + 0.32),
      cyl(0.17, 0.05, pm(toolhead, "rubber"), tx, gy - 0.42, tz + 0.33, "z"),
      rbox(0.24, 0.24, 0.24, 0.02, pm(toolhead, "alu"), tx, gy - 0.9, tz),
      rbox(0.2, 0.12, 0.2, 0.01, pm(toolhead, "steel"), tx, gy - 1.06, tz));
    var nozzle = new T.Mesh(new T.ConeGeometry(0.07, 0.14, 20), pm(toolhead, "brass")); nozzle.rotation.x = Math.PI; nozzle.position.set(tx, gy - 1.18, tz);
    th.add(nozzle);
    piece(toolhead, th, [0, 1.25, 2.1]);

    // ---- heatbed and build plate
    var bed = part("bed", 5);
    var by = 3.0;
    var slab = group(rbox(3.7, 0.12, 3.5, 0.03, pm(bed, "panel"), 0, by, 0.1), rbox(3.9, 0.1, 0.3, 0.03, pm(bed, "alu"), 0, by - 0.13, -1.45), rbox(0.3, 0.1, 3.3, 0.03, pm(bed, "alu"), -1.7, by - 0.13, 0.1), rbox(0.3, 0.1, 3.3, 0.03, pm(bed, "alu"), 1.7, by - 0.13, 0.1));
    piece(bed, slab, [0, -0.25, 1.7]);
    var plate = group(rbox(3.56, 0.035, 3.36, 0.012, pm(bed, "plate"), 0, by + 0.08, 0.1), rbox(0.5, 0.035, 0.16, 0.012, pm(bed, "plate"), 1.2, by + 0.08, 1.84));
    piece(bed, plate, [0, 0.55, 1.7]);

    // ---- Z axis: three lead screws with their guide rods
    var screws = part("screws", 6);
    var zs = group();
    [[-2.02, -1.5], [2.02, -1.5], [0, 2.0]].forEach(function (p) {
      zs.add(cyl(0.05, inH - 0.5, pm(screws, "steel"), p[0], midY - 0.2, p[1] * 0.93, "y", 16));
      zs.add(cyl(0.1, 0.16, pm(screws, "brass"), p[0], by - 0.2, p[1] * 0.93));
      zs.add(cyl(0.13, 0.12, pm(screws, "plastic"), p[0], BASE + 0.07, p[1] * 0.93));
    });
    [-1, 1].forEach(function (sx) { zs.add(cyl(0.06, inH - 0.5, pm(screws, "steel"), sx * 1.6, midY - 0.2, -1.62)); });
    piece(screws, zs, [0, 0, -1.6]);

    // ---- touchscreen on the top front edge
    var screen = part("screen", 7);
    var scr = group(rbox(1.32, 0.86, 0.1, 0.05, pm(screen, "plastic"), 0, 0, 0));
    var glassFace = new T.Mesh(new T.PlaneGeometry(1.16, 0.7), pm(screen, "display")); glassFace.position.z = 0.052; scr.add(glassFace);
    scr.rotation.x = -0.5; scr.position.set(1.5, H + 0.12, D / 2 - 0.2);
    piece(screen, scr, [0.9, 0.5, 2.6]);

    // ---- safety key on the back
    var keyPart = part("key", 8);
    piece(keyPart, group(rbox(0.34, 0.22, 0.2, 0.04, pm(keyPart, "green"), -1.6, BASE + 1.0, -(D / 2 + 0.12)), rbox(0.2, 0.1, 0.12, 0.02, pm(keyPart, "steel"), -1.6, BASE + 1.0, -(D / 2 + 0.02))), [0, 0, -3.1]);

    // ---- state
    var explode = 0, selected = null, exposure = 1;
    var accent = new T.Color(0x0b9a4a);
    function applyExplode() {
      IDS.forEach(function (id) {
        var g = parts[id], e = smooth(g.userData.order * 0.055, g.userData.order * 0.055 + 0.56, explode);
        g.userData.pieces.forEach(function (h) {
          h.position.copy(h.userData.home).addScaledVector(h.userData.off, e);
          h.rotation.set(h.userData.rot[0] * e, h.userData.rot[1] * e, h.userData.rot[2] * e);
        });
      });
    }
    function paint() {
      IDS.forEach(function (id) {
        var on = id === selected, g = parts[id];
        Object.keys(g.userData.mats).forEach(function (k) {
          var m = g.userData.mats[k], b = m.userData.base;
          if (on) { m.emissive.copy(accent); m.emissiveIntensity = k === "glass" ? 0.5 : 0.75; if (k === "glass") m.opacity = 0.34; }
          else { m.emissive.setHex(b.emissive); m.emissiveIntensity = b.intensity; m.opacity = b.opacity; }
        });
      });
    }
    var tmp = new T.Vector3(), box = new T.Box3();
    var api = {
      ids: IDS, camera: camera, scene: scene, root: root, renderer: renderer,
      setExplode: function (e) { explode = e; applyExplode(); },
      getExplode: function () { return explode; },
      setYaw: function (y) { root.rotation.y = y; },
      setExposure: function (x) { exposure = x; renderer.toneMappingExposure = x; },
      select: function (id) { selected = id; paint(); },
      selected: function () { return selected; },
      resize: function (w, h) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      },
      // Screen position (CSS pixels) of the middle of a part.
      project: function (id, w, h) {
        box.setFromObject(parts[id]); box.getCenter(tmp); tmp.project(camera);
        return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
      },
      pick: function (nx, ny) {
        var ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(nx, ny), camera);
        var hits = ray.intersectObjects(root.children, true);
        var hit = hits.filter(function (hh) { return !hh.object.material.transparent; })[0] || hits[0];
        var n = hit && hit.object;
        while (n && !(n.userData && n.userData.id)) n = n.parent;
        return n ? n.userData.id : null;
      },
      render: function () { renderer.render(scene, camera); }
    };
    applyExplode();
    return api;
  }

  // The printer explorer page: orbit, zoom, pick a part, pull apart, reset.
  function mountExplorer() {
    var canvas = document.getElementById("explorer-canvas");
    var stage = canvas && canvas.parentElement;
    var label = document.getElementById("explorer-label");
    var fallback = document.getElementById("explorer-fallback");
    var status = document.getElementById("part-status");
    var explodeButton = document.getElementById("explode-toggle");
    var resetButton = document.getElementById("reset-view");
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".part-button"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || !stage || !explodeButton || !resetButton || canvas.dataset.mounted) return false;
    var p;
    try { if (!supported()) throw new Error("no webgl"); p = create(canvas, {}); } catch (e) {
      canvas.hidden = true; explodeButton.hidden = true; resetButton.hidden = true; if (fallback) fallback.hidden = false; return false;
    }
    canvas.dataset.mounted = "1";
    var HOME = new T.Vector3(11.5, 8.2, 16.5), TARGET = new T.Vector3(0, 3.3, 0.2);
    p.camera.position.copy(HOME);
    var controls = new T.OrbitControls(p.camera, canvas);
    controls.target.copy(TARGET); controls.enablePan = false; controls.enableDamping = true;
    controls.minDistance = 8; controls.maxDistance = 40; controls.maxPolarAngle = Math.PI * 0.55;
    var target = 0, value = 0, dirty = true;

    function select(id, announce) {
      var next = id === p.selected() ? null : id;
      p.select(next);
      buttons.forEach(function (b) { var on = b.dataset.part === next; b.setAttribute("aria-pressed", on ? "true" : "false"); b.parentElement.classList.toggle("is-selected", on); });
      var active = buttons.filter(function (b) { return b.dataset.part === next; })[0];
      if (label) { label.hidden = !active; label.textContent = active ? active.textContent : ""; }
      if (status && announce !== false) { var text = active ? document.getElementById("part-" + next) : null; status.textContent = active ? active.textContent + ". " + (text ? text.textContent : "") : "No part selected."; }
      dirty = true;
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.part); }); });
    function setExplode(on) {
      target = on ? 1 : 0;
      explodeButton.setAttribute("aria-pressed", on ? "true" : "false");
      explodeButton.textContent = on ? "Put the printer back together" : "Pull the parts apart";
      if (reduce.matches) value = target;
      dirty = true;
    }
    explodeButton.addEventListener("click", function () { setExplode(!target); });
    resetButton.addEventListener("click", function () { setExplode(false); p.camera.position.copy(HOME); controls.target.copy(TARGET); if (p.selected()) select(p.selected(), false); dirty = true; });
    var down = null;
    canvas.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
    canvas.addEventListener("pointerup", function (e) {
      if (!down) return; var moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 6) return;
      var r = canvas.getBoundingClientRect(), id = p.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (id) select(id);
    });
    controls.addEventListener("change", function () { dirty = true; });
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      p.camera.fov = w < 520 ? 44 : 30; p.resize(w, h); dirty = true;
    }
    window.addEventListener("resize", resize); resize();
    function place() {
      if (!label || label.hidden || !p.selected()) return;
      var pt = p.project(p.selected(), stage.clientWidth, stage.clientHeight);
      label.style.transform = "translate(" + Math.round(Math.min(Math.max(pt.x, 70), stage.clientWidth - 70)) + "px," + Math.round(Math.max(pt.y - 16, 28)) + "px) translate(-50%,-100%)";
    }
    (function loop() {
      if (Math.abs(value - target) > 0.001) { value += (target - value) * 0.09; dirty = true; } else if (value !== target) { value = target; dirty = true; }
      if (controls.update()) dirty = true;
      if (dirty && stage.clientWidth) { p.setExplode(value); p.render(); place(); dirty = false; }
      window.requestAnimationFrame(loop);
    })();
    window.__explorerReady = true;
    return true;
  }

  window.PIRPrinter = { supported: supported, create: create, mountExplorer: mountExplorer, ids: IDS };
  if (document.getElementById("explorer-canvas") && !document.getElementById("guide")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountExplorer); else mountExplorer();
  }
})();
