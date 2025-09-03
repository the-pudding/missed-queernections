<script>
  import * as d3 from "d3";
  import * as THREE from "three";
  import { onMount, onDestroy } from "svelte";
  import janData from "$data/jan.csv";
  import ashleeData from "$data/ashlee.csv";

  let container;
  let renderer, scene, camera;
  let raycaster, mouse;
  let width = 0, height = 0;
  let scrollY = 0; // ✅ declare properly

  const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
  const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
  const spacing = 20;
  const startX = 20;

  // Tooltip state
  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let dotDate = "";
  let dotEvent = "";
  let dotTheme = "";
  const formatMonthYear = d3.timeFormat("%B %Y");

  function generateTimelineData(janData, ashleeData) {
  if (!janData || !ashleeData) return { jan: [], ashlee: [], dots: [] };

  const allDates = janData.concat(ashleeData).map(d => new Date(d.date));
  const minDate = d3.min(allDates);
  const maxDate = d3.max(allDates);

  const yScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([20, height - 20]);

  const monthlyData = d3.timeMonth.range(
    d3.timeMonth.floor(minDate),
    d3.timeMonth.ceil(maxDate)
  ).map(d => {
    const janEvent = janData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
    const ashleeEvent = ashleeData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
    return { date: d, janThemes: janEvent || {}, ashleeThemes: ashleeEvent || {} };
  });

  // --- bulge scaling ---
  const bulgeUnit = width * 0.02;   // 2% of width
  const maxBulge = width * 0.1;     // max 10% of width

  const janPaths = themes.map((theme, i) => {
    const baseX = startX + i * spacing;
    const points = monthlyData.map(d => {
      const janValue = d.janThemes[theme] === '1';
      const ashleeValue = d.ashleeThemes[theme] === '1';

      let offset = 0;
      if (janValue) offset = ashleeValue ? bulgeUnit * 2 : bulgeUnit;
      offset = Math.min(offset, maxBulge);

      return new THREE.Vector3(baseX + offset, yScale(d.date), 0);
    });
    return { theme, points };
  });

  const ashleePaths = themes.map((theme, i) => {
    const baseX = width - startX - i * spacing;
    const points = monthlyData.map(d => {
      const janValue = d.janThemes[theme] === '1';
      const ashleeValue = d.ashleeThemes[theme] === '1';

      let offset = 0;
      if (ashleeValue) offset = janValue ? bulgeUnit * 2 : bulgeUnit;
      offset = Math.min(offset, maxBulge);

      return new THREE.Vector3(baseX - offset, yScale(d.date), 0);
    });
    return { theme, points };
  });

  // --- dots ---
  const dots = [];
  monthlyData.forEach(d => {
    themes.forEach((theme, i) => {
      if (d.janThemes[theme] === '1') {
        let bulge = d.ashleeThemes[theme] === '1' ? bulgeUnit * 2 : bulgeUnit;
        bulge = Math.min(bulge, maxBulge);
        dots.push({
          theme,
          date: d.date,
          event: d.janThemes.event,
          color: colors[i],
          pos: new THREE.Vector3(startX + i * spacing + bulge, yScale(d.date), 0)
        });
      }
      if (d.ashleeThemes[theme] === '1') {
        let bulge = d.janThemes[theme] === '1' ? bulgeUnit * 2 : bulgeUnit;
        bulge = Math.min(bulge, maxBulge);
        dots.push({
          theme,
          date: d.date,
          event: d.ashleeThemes.event,
          color: colors[i],
          pos: new THREE.Vector3(width - startX - i * spacing - bulge, yScale(d.date), 0)
        });
      }
    });
  });

  return { jan: janPaths, ashlee: ashleePaths, dots };
}

  function initScene() {
    width = container.clientWidth;
    height = typeof window !== "undefined" ? window.innerHeight : 800; // ✅ safe fallback

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(width / 2, height / 2, 1000);
    scene.add(camera);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 0, 1000).normalize();
    scene.add(light);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const data = generateTimelineData(janData, ashleeData);

    // Tubes
    [...data.jan, ...data.ashlee].forEach((themePath, i) => {
      const curve = new THREE.CatmullRomCurve3(themePath.points, false, "catmullrom", 0.1);
      const geometry = new THREE.TubeGeometry(curve, 256, 4, 16, closed);
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        metalness: 0.3,
        roughness: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    });

    // Dots (spheres)
    data.dots.forEach((dot) => {
      const geom = new THREE.SphereGeometry(6, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: dot.color });
      const sphere = new THREE.Mesh(geom, mat);
      sphere.position.copy(dot.pos);
      sphere.userData = dot;
      scene.add(sphere);
    });

    animate();

    renderer.domElement.addEventListener("mousemove", onMouseMove);
  }

  function onMouseMove(event) {
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.theme) {
        const dot = obj.userData;
        dotTheme = dot.theme;
        dotDate = formatMonthYear(dot.date);
        dotEvent = dot.event;
        tooltipX = event.clientX + 10;
        tooltipY = event.clientY + 10;
        tooltipVisible = true;
      }
    } else {
      tooltipVisible = false;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  function onResize() {
    if (typeof window === "undefined") return;
    width = container.clientWidth;
    height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  onMount(() => {
    initScene();

    const updateScroll = () => {
      if (typeof window !== "undefined") {
        scrollY = window.scrollY;
      }
    };
    window.addEventListener("scroll", updateScroll);
    updateScroll();

    window.addEventListener("resize", onResize);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", updateScroll);
        window.removeEventListener("resize", onResize);
      }
    };
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onResize);
    }
    renderer?.dispose();
  });
</script>

<section id="timeline" bind:this={container}>
  <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
    <p class="theme theme-{dotTheme}">{dotTheme}</p>
    <p>{dotEvent}</p>
    <p>{dotDate}</p>
  </div>
</section>

<style>
  #timeline {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }
  canvas {
    display: block;
  }
  #tooltip {
    position: fixed;
    opacity: 0;
    background: var(--color-bg, #fff);
    border-radius: 8px;
    padding: 1rem;
    z-index: 1000;
    font-family: var(--sans, sans-serif);
    font-size: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    transition: opacity 100ms linear;
    pointer-events: none;
  }
  #tooltip.visible {
    opacity: 1;
  }
</style>
