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
    chamber.position.set(0, 5.2, 0.8);
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
      else if (kind === "gloss") m = new T.MeshStandardMaterial({ color: 0x050607, metalness: 0.35, roughness: 0.16 });
      else if (kind === "dark") m = new T.MeshStandardMaterial({ color: 0x1d2023, metalness: 0.7, roughness: 0.42 });
      else if (kind === "grip") m = new T.MeshStandardMaterial({ color: 0x3a3e42, metalness: 0.3, roughness: 0.5 });
      else if (kind === "silver") m = new T.MeshStandardMaterial({ color: 0xb4b7b9, metalness: 0.82, roughness: 0.4 });
      else if (kind === "led") m = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2 });
      else if (kind === "smoke") m = new T.MeshPhysicalMaterial({ color: 0x1a2024, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.03 });
      else if (kind === "display") m = new T.MeshStandardMaterial({ color: 0x05080a, metalness: 0.2, roughness: 0.08, emissive: 0x1c6f52, emissiveIntensity: 0.9 });
      else if (kind === "glass") m = new T.MeshPhysicalMaterial({ color: 0xb9cdc8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03 });
      if (["glass", "smoke", "steel", "brass", "silver", "gloss"].indexOf(kind) < 0) m.envMapIntensity = 0.55;
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

    // Flat panel with rounded corners (for windows and bezels). Lies in the XY plane.
    function rrect(w, h, r, depth, m) {
      var s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return new T.Mesh(new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 8 }), m);
    }

    // Outer size from Bambu Lab's published dimensions: 492 x 514 x 626 mm.
    var W = 4.92, D = 5.14, H = 6.26;
    var BASE = 0.42;          // black plinth
    var COL = 0.44;           // silver front columns
    var FASCIA = 0.82;        // black band above the door that carries the touchscreen
    var WALL = 0.1;           // side wall thickness
    var inX = W / 2 - WALL;   // inner half width
    var doorW = W - 2 * COL - 0.02, doorH = H - FASCIA - BASE - 0.04, doorY = BASE + 0.02 + doorH / 2, doorZ = D / 2 - 0.07;

    // ---- frame and enclosure
    var frame = part("frame", 0);
    var plinth = group(rbox(W - 0.06, BASE, D - 0.06, 0.06, pm(frame, "plastic"), 0, BASE / 2, 0),
      rbox(W - 0.5, 0.02, D - 0.5, 0, pm(frame, "panel"), 0, BASE + 0.011, 0));
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { plinth.add(cyl(0.17, 0.07, pm(frame, "rubber"), sx * (W / 2 - 0.5), -0.035, sz * (D / 2 - 0.5))); }); });
    piece(frame, plinth, [0, 0, 0]);
    // Top frame: the fascia across the front, a rear beam and the two crossbeams with their light strips.
    var topFrame = group(
      rbox(W - 2 * COL + 0.04, FASCIA, 0.3, 0.03, pm(frame, "gloss"), 0, H - FASCIA / 2, D / 2 - 0.2),
      rbox(2 * inX, 0.26, 0.3, 0.03, pm(frame, "plastic"), 0, H - 0.13, -(D / 2 - 0.26)),
      rbox(0.3, 0.26, D - 0.9, 0.03, pm(frame, "plastic"), -(inX - 0.15), H - 0.13, 0),
      rbox(0.3, 0.26, D - 0.9, 0.03, pm(frame, "plastic"), inX - 0.15, H - 0.13, 0),
      rbox(0.05, 0.02, D - 1.4, 0, pm(frame, "led"), -(inX - 0.15), H - 0.27, 0),
      rbox(0.05, 0.02, D - 1.4, 0, pm(frame, "led"), inX - 0.15, H - 0.27, 0));
    piece(frame, topFrame, [0, 0, 0]);
    // Side walls: silver, with a rounded front column and a smoked window. They slide outwards.
    [-1, 1].forEach(function (sx) {
      var wall = group(
        rbox(WALL, H - 0.16, D - 0.3, 0.03, pm(frame, "silver"), sx * (W / 2 - WALL / 2 - 0.004), 0.16 + (H - 0.16) / 2, -0.15),
        rbox(COL, H - 0.16, COL, 0.15, pm(frame, "silver"), sx * (W / 2 - COL / 2), 0.16 + (H - 0.16) / 2, D / 2 - COL / 2));
      var win = rrect(3.15, 1.42, 0.2, 0.012, pm(frame, "gloss"));
      win.rotation.y = sx * Math.PI / 2; win.position.set(sx * (W / 2 - 0.001), H - 1.5, -0.25);
      var grip = rrect(1.3, 0.16, 0.07, 0.012, pm(frame, "plastic"));
      grip.rotation.y = sx * Math.PI / 2; grip.position.set(sx * (W / 2 - 0.001), 0.3, 0);
      wall.add(win, grip);
      piece(frame, wall, [sx * 2.3, 0, 0]);
    });
    // Back panel with the exhaust grille and the ribbed inner wall.
    var backZ = -(D / 2 - 0.05);
    var back = group(rbox(2 * inX, H - BASE - 0.02, 0.08, 0.02, pm(frame, "panel"), 0, BASE + (H - BASE) / 2, backZ));
    var grille = new T.Mesh(new T.TorusGeometry(0.4, 0.04, 10, 40), pm(frame, "plastic")); grille.position.set(1.25, H - 1.3, backZ - 0.05);
    back.add(grille, cyl(0.38, 0.02, pm(frame, "rubber"), 1.25, H - 1.3, backZ - 0.045, "z"), cyl(0.09, 0.05, pm(frame, "plastic"), 1.25, H - 1.3, backZ - 0.06, "z"));
    for (var sp = 0; sp < 6; sp++) { var spoke = rbox(0.76, 0.025, 0.025, 0, pm(frame, "plastic"), 1.25, H - 1.3, backZ - 0.06); spoke.rotation.z = (sp * Math.PI) / 6; back.add(spoke); }
    back.add(rbox(0.6, 0.36, 0.05, 0.03, pm(frame, "plastic"), 1.5, BASE + 0.5, backZ - 0.05));
    for (var rb = 0; rb < 13; rb++) back.add(rbox(0.05, 2.6, 0.05, 0, pm(frame, "plastic"), 0.55 + rb * 0.125, BASE + 2.55, backZ + 0.06));
    piece(frame, back, [0, 0, -2.7]);

    // ---- top cover: dark glass in a slim surround
    var top = part("top", 1);
    var lid = group(rbox(W - 0.3, 0.05, D - 0.36, 0.015, pm(top, "smoke"), 0, H + 0.035, -0.02));
    [[W - 0.24, 0.13, 0, D / 2 - 0.26], [W - 0.24, 0.13, 0, -(D / 2 - 0.22)]].forEach(function (b) { lid.add(rbox(b[0], 0.07, b[1], 0.03, pm(top, "plastic"), b[2], H + 0.035, b[3])); });
    [-1, 1].forEach(function (sx) { lid.add(rbox(0.13, 0.07, D - 0.48, 0.03, pm(top, "plastic"), sx * (W / 2 - 0.19), H + 0.035, -0.02)); });
    piece(top, lid, [0, 2.5, -0.4], [-0.18, 0, 0]);

    // ---- front door: smoked glass, hinged on the left, grip on the right
    var door = part("door", 2);
    var leaf = group(rbox(doorW, doorH, 0.05, 0.015, pm(door, "smoke"), 0, doorY, doorZ));
    [doorY + doorH / 2 - 0.04, doorY - doorH / 2 + 0.04].forEach(function (y) { leaf.add(rbox(doorW, 0.08, 0.07, 0.02, pm(door, "plastic"), 0, y, doorZ)); });
    [-1, 1].forEach(function (sx) { leaf.add(rbox(0.08, doorH, 0.07, 0.02, pm(door, "plastic"), sx * (doorW / 2 - 0.04), doorY, doorZ)); });
    leaf.add(rbox(0.12, 0.78, 0.1, 0.04, pm(door, "grip"), doorW / 2 - 0.1, doorY + 0.25, doorZ + 0.07));
    [doorY + doorH / 2 - 0.35, doorY - doorH / 2 + 0.35].forEach(function (y) { leaf.add(rbox(0.07, 0.3, 0.07, 0.02, pm(door, "steel"), -(doorW / 2 - 0.03), y, doorZ + 0.05)); });
    piece(door, leaf, [-0.45, 0, 1.5], [0, -0.85, 0], [-doorW / 2, doorY, doorZ]);

    // ---- CoreXY motion system: side rails, X beam, motors A and B at the rear, upper and lower belts
    var gantry = part("gantry", 3);
    var gy = H - 0.62, railX = inX - 0.5, railLen = D - 1.5, beamZ = 0.25;
    var gx = group();
    [-1, 1].forEach(function (sx) {
      gx.add(cyl(0.05, railLen, pm(gantry, "steel"), sx * railX, gy, -0.1, "z"));
      gx.add(rbox(0.44, 0.5, 0.44, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.2, -(railLen / 2 + 0.2)));
      gx.add(cyl(0.1, 0.12, pm(gantry, "steel"), sx * railX, gy + 0.11, -(railLen / 2 + 0.2)));
      gx.add(cyl(0.085, 0.1, pm(gantry, "steel"), sx * railX, gy + 0.1, railLen / 2 - 0.2));
      gx.add(rbox(0.02, 0.05, railLen, 0, pm(gantry, "belt"), sx * (railX + 0.1), gy + 0.13, -0.15));
      gx.add(rbox(0.02, 0.05, railLen, 0, pm(gantry, "belt"), sx * (railX + 0.1), gy + 0.06, -0.15));
      gx.add(rbox(0.3, 0.34, 0.5, 0.05, pm(gantry, "plastic"), sx * railX, gy - 0.1, beamZ));
    });
    gx.add(rbox(2 * railX - 0.3, 0.24, 0.3, 0.03, pm(gantry, "dark"), 0, gy - 0.12, beamZ));
    gx.add(rbox(2 * railX - 0.4, 0.07, 0.03, 0.01, pm(gantry, "steel"), 0, gy - 0.12, beamZ + 0.165));
    gx.add(rbox(2 * railX - 0.3, 0.05, 0.02, 0, pm(gantry, "belt"), 0, gy + 0.05, beamZ - 0.17));
    gx.add(rbox(2 * railX - 0.3, 0.05, 0.02, 0, pm(gantry, "belt"), 0, gy - 0.02, beamZ - 0.17));
    piece(gantry, gx, [0, 1.55, 0]);

    // ---- tool head: one nozzle, carried on the X beam
    var toolhead = part("toolhead", 4);
    var tz = beamZ + 0.47;
    var th = group(
      rbox(0.72, 0.98, 0.58, 0.1, pm(toolhead, "plastic"), 0, gy - 0.3, tz),
      rbox(0.62, 0.6, 0.03, 0.01, pm(toolhead, "gloss"), 0, gy - 0.22, tz + 0.295),
      rbox(0.05, 0.1, 0.02, 0, pm(toolhead, "led"), 0, gy + 0.05, tz + 0.31),
      rbox(0.4, 0.26, 0.4, 0.04, pm(toolhead, "plastic"), 0, gy - 0.9, tz),
      rbox(0.16, 0.16, 0.16, 0.01, pm(toolhead, "alu"), 0, gy - 1.08, tz));
    var nozzle = new T.Mesh(new T.ConeGeometry(0.06, 0.12, 20), pm(toolhead, "brass")); nozzle.rotation.x = Math.PI; nozzle.position.set(0, gy - 1.22, tz);
    th.add(nozzle);
    piece(toolhead, th, [0, 1.55, 2.3]);

    // ---- heatbed and gold textured build plate (340 x 320 mm printable area)
    var bed = part("bed", 5);
    var by = 2.75, bz = 0.1;
    var slab = group(
      rbox(3.72, 0.13, 3.5, 0.03, pm(bed, "panel"), 0, by, bz),
      rbox(3.9, 0.28, 0.14, 0.04, pm(bed, "dark"), 0, by - 0.1, bz + 1.82),
      cyl(0.035, 2.9, pm(bed, "steel"), 0, by - 0.3, bz + 1.78, "x"),
      rbox(3.9, 0.1, 0.36, 0.03, pm(bed, "alu"), 0, by - 0.12, bz - 1.7),
      rbox(0.3, 0.1, 0.5, 0.03, pm(bed, "alu"), -1.98, by - 0.12, 0.9),
      rbox(0.3, 0.1, 0.5, 0.03, pm(bed, "alu"), 1.98, by - 0.12, 0.9));
    piece(bed, slab, [0, -0.2, 2.3]);
    var plate = group(rbox(3.5, 0.03, 3.3, 0.01, pm(bed, "plate"), 0, by + 0.082, bz), rbox(0.5, 0.03, 0.14, 0.01, pm(bed, "plate"), 1.2, by + 0.082, bz + 1.71));
    piece(bed, plate, [0, 0.75, 2.3]);

    // ---- Z axis: three lead screws (one at the rear centre, one each side)
    var screws = part("screws", 6);
    var zs = group(), zLen = gy - 0.45 - BASE;
    [[0, bz - 1.9], [-2.1, 0.9], [2.1, 0.9]].forEach(function (p) {
      zs.add(cyl(0.045, zLen, pm(screws, "steel"), p[0], BASE + zLen / 2, p[1], "y", 16));
      zs.add(cyl(0.095, 0.14, pm(screws, "brass"), p[0], by - 0.2, p[1]));
      zs.add(cyl(0.12, 0.1, pm(screws, "plastic"), p[0], BASE + 0.06, p[1]));
    });
    piece(screws, zs, [0, 0, -1.25]);

    // ---- touchscreen, set into the left of the fascia
    var screen = part("screen", 7);
    var ui = document.createElement("canvas"); ui.width = 320; ui.height = 180;
    var u = ui.getContext("2d");
    u.fillStyle = "#0b0f12"; u.fillRect(0, 0, 320, 180);
    u.fillStyle = "#151b20"; u.fillRect(0, 0, 44, 180);
    u.fillStyle = "#3ddc84"; u.fillRect(15, 52, 14, 14);
    u.fillStyle = "#56616a"; [22, 88, 120, 152].forEach(function (y) { u.fillRect(16, y - 5, 12, 10); });
    u.strokeStyle = "#4a555e"; u.lineWidth = 3; u.beginPath(); u.arc(128, 94, 52, 0, Math.PI * 2); u.stroke();
    u.fillStyle = "#3ddc84"; u.beginPath(); u.arc(128, 94, 7, 0, Math.PI * 2); u.fill();
    u.fillStyle = "#1c242a"; [30, 68, 106, 144].forEach(function (y) { u.fillRect(210, y - 14, 92, 28); });
    var uiTex = new T.CanvasTexture(ui); uiTex.encoding = T.sRGBEncoding;
    var dm = pm(screen, "display"); dm.map = uiTex; dm.emissiveMap = uiTex; dm.emissive.setHex(0xffffff); dm.userData.base.emissive = 0xffffff;
    var bezel = rrect(1.22, 0.7, 0.07, 0.03, pm(screen, "gloss")); bezel.position.set(0, 0, -0.015);
    var face = new T.Mesh(new T.PlaneGeometry(1.08, 0.58), dm); face.position.z = 0.02;
    var scr = group(bezel, face); scr.position.set(-(doorW / 2) + 0.72, H - FASCIA / 2 - 0.02, D / 2 - 0.035);
    piece(screen, scr, [0, 0, 2.4]);

    // ---- safety key, plugged into the back
    var keyPart = part("key", 8);
    piece(keyPart, group(rbox(0.32, 0.2, 0.18, 0.04, pm(keyPart, "green"), -1.5, BASE + 0.9, backZ - 0.16), rbox(0.18, 0.09, 0.1, 0.02, pm(keyPart, "steel"), -1.5, BASE + 0.9, backZ - 0.05)), [0, 0, -3.5]);

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
          if (on) { m.emissive.copy(accent); m.emissiveIntensity = k === "smoke" || k === "glass" ? 0.5 : 0.75; if (k === "smoke" || k === "glass") m.opacity = 0.42; }
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
    controls.minDistance = 8; controls.maxDistance = 60; controls.maxPolarAngle = Math.PI * 0.55;
    var target = 0, value = 0, dirty = true, dollyFrom = 0, dollyTo = 0, dollyAt = 1;

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
      // Step the camera back so the separated parts stay in view, and forward again afterwards.
      var dist = p.camera.position.distanceTo(controls.target), was = dollyAt < 1 ? dollyTo : dist;
      dollyFrom = dist; dollyTo = Math.min(58, Math.max(9, was * (on ? 1.5 : 1 / 1.5))); dollyAt = reduce.matches ? 1 : 0;
      if (reduce.matches) { value = target; setDistance(dollyTo); }
      dirty = true;
    }
    function setDistance(d) {
      var dir = p.camera.position.clone().sub(controls.target).normalize();
      p.camera.position.copy(controls.target).addScaledVector(dir, d);
    }
    explodeButton.addEventListener("click", function () { setExplode(!target); });
    canvas.addEventListener("wheel", function () { dollyAt = 1; }, { passive: true });
    resetButton.addEventListener("click", function () { setExplode(false); dollyAt = 1; value = reduce.matches ? 0 : value; p.camera.position.copy(HOME); controls.target.copy(TARGET); if (p.selected()) select(p.selected(), false); dirty = true; });
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
      if (dollyAt < 1) { dollyAt = Math.min(1, dollyAt + 0.035); var k = dollyAt * dollyAt * (3 - 2 * dollyAt); setDistance(dollyFrom + (dollyTo - dollyFrom) * k); dirty = true; }
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
