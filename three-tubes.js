import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import { getRandomColor } from "./utils.js";
import { generateRandomGeometry } from "./generateGeo.js";

class Sketch {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Основные параметры
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.addOrbitControls();
    this.gravity = null;
    this.world = null;
    this.RAPIER = null;
    // this.cube = this.createCube(); // Удаляем сферу
    this.tubesData = this.createTubesData(50); // tubesData вместо tubesGroup
    this.tubesGroup = new THREE.Group();
    this.tubesData.forEach(tube => this.tubesGroup.add(tube.mesh));
    this.clock;

    this.mousePos = new THREE.Vector2(0, 0);

    // Запускаем инициализацию
    this.init();
  }

  async init() {
    // Инициализируем физику и дожидаемся завершения
    // await this.initPhysics();

    this.clock = new THREE.Clock();
    // Добавляем объекты на сцену
    this.addObjects();

    // Обработчики событий
    this.addEventListeners();

    // Добавляем освещение
    this.addLight();

    // Запуск анимации
    this.animate();
  }

  // Создание сцены
  createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x686868);
    return scene;
  }

  // Создание камеры
  createCamera() {
    const fov = 75;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(1, 1, 1);
    return camera;
  }

  // Создание рендера
  createRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.width, this.height);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (this.container) {
      this.container.appendChild(renderer.domElement);
    } else {
      console.error(`Элемент с id "${this.containerId}" не найден.`);
    }

    return renderer;
  }

  async initPhysics() {
    this.RAPIER = await RAPIER.init();
    this.gravity = { x: 0.0, y: 0, z: 0.0 };
    this.world = new RAPIER.World(this.gravity);
  }

  addLight() {
    // Основной мягкий свет
    const hemiLight = new THREE.HemisphereLight(0x099ff, 0xaa5500, 0.7);
    this.scene.add(hemiLight);
    // Яркий направленный свет
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(2, 2, 2);
    this.scene.add(dirLight);
    // Точечный свет для бликов
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 10);
    pointLight.position.set(-2, 2, 2);
    this.scene.add(pointLight);
    // this.scene.fog = new THREE.FogExp2(0x000000, 0.3);
  }

  // Создание группы трубок, каждая из которых — уникальная незамкнутая кривая на сфере
  createTubesGroup(count) {
    const group = new THREE.Group();
    const radius = 0.5;
    const tubeRadius = 0.005;
    const tubularSegments = 256;
    const radialSegments = 12;
    // Стартовая точка (северный полюс)
    const start = new THREE.Vector3(0, 0, radius);
    for (let i = 0; i < count; i++) {
      // Уникальное направление для каждой трубки
      const theta = Math.acos(1 - 2 * (i + 0.5) / count);
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      ).normalize();
      // Ортонормированный базис для большого круга
      const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(up, dir).normalize();
      const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();
      // Случайная длина дуги (от 90° до 270°)
      const arc = Math.PI / 2 + Math.random() * Math.PI;
      const points = [];
      const len = 200;
      for (let j = 0; j < len; j++) {
        const t = (j / (len - 1)) * arc;
        // Дуга большого круга, стартуя из северного полюса
        // Вращаем стартовую точку вокруг оси dir на угол t
        // Формула: p = cos(t)*start + sin(t)*(tangent) + (1-cos(t))*(dir·start)*dir
        // Но проще: строим дугу в плоскости, проходящей через start и dir
        const x = Math.cos(t) * start.x + Math.sin(t) * tangent.x * radius;
        const y = Math.cos(t) * start.y + Math.sin(t) * tangent.y * radius;
        const z = Math.cos(t) * start.z + Math.sin(t) * tangent.z * radius;
        // Поворачиваем эту точку вокруг оси dir на угол, соответствующий текущей трубке
        const point = new THREE.Vector3(x, y, z).applyAxisAngle(dir, phi).normalize().multiplyScalar(radius);
        points.push(point);
      }
      const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false), tubularSegments, tubeRadius, radialSegments, false);
      const material = new THREE.MeshPhysicalMaterial({
        color: getRandomColor(),
        roughness: 0.1,
        metalness: 1.0,
        reflectivity: 1.0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        transmission: 0.0,
        ior: 1.45,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
    }
    group.position.set(0, 0, 0);
    return group;
  }

  // tubesData: [{points, mesh, progress, delay, speed, ...}]
  createTubesData(count) {
    const tubes = [];
    const radius = 0.5;
    const tubeRadius = 0.005;
    const tubularSegments = 256;
    const radialSegments = 12;
    const start = new THREE.Vector3(0, 0, radius);
    const minArc = Math.PI * 2 / 3; // минимум 120 градусов
    const maxArc = Math.PI * 1.5;   // максимум 270 градусов
    for (let i = 0; i < count; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / count);
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      ).normalize();
      const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(up, dir).normalize();
      // Длина дуги: минимум 120°, максимум 270°
      const arc = minArc + Math.random() * (maxArc - minArc);
      const points = [];
      const len = 200;
      for (let j = 0; j < len; j++) {
        const t = (j / (len - 1)) * arc;
        const x = Math.cos(t) * start.x + Math.sin(t) * tangent.x * radius;
        const y = Math.cos(t) * start.y + Math.sin(t) * tangent.y * radius;
        const z = Math.cos(t) * start.z + Math.sin(t) * tangent.z * radius;
        const point = new THREE.Vector3(x, y, z).applyAxisAngle(dir, phi).normalize().multiplyScalar(radius);
        points.push(point);
      }
      const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([points[0], points[1]], false), 1, tubeRadius, radialSegments, false);
      const material = new THREE.MeshPhysicalMaterial({
        color: getRandomColor(),
        roughness: 0.1,
        metalness: 1.0,
        reflectivity: 1.0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        transmission: 0.0,
        ior: 1.45,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = true;
      tubes.push({
        points,
        mesh,
        progress: 0,
        delay: Math.random() * 1.5,
        speed: 0.7 + Math.random() * 0.7,
        state: 'drawing',
        eraseDelay: 0.3 + Math.random() * 0.5, // пауза между циклами
        eraseTimer: 0
      });
    }
    return tubes;
  }

  // Добавление OrbitControls
  addOrbitControls() {
    return new OrbitControls(this.camera, this.renderer.domElement);
  }

  addObjects() {
    // this.scene.add(this.cube);
    this.scene.add(this.tubesGroup);
  }

  // Обработчик изменения размеров окна
  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(evt) {
    this.mousePos.x = (evt.clientX / this.width) * 2 - 1;
    this.mousePos.y = -(evt.clientY / this.height) * 2 + 1;
  }

  // Добавление обработчиков событий
  addEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));

    window.addEventListener("mousemove", this.onMouseMove.bind(this), false);
  }

  // Анимация
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    this.tubesGroup.rotation.z += delta * 0.5;
    this.tubesGroup.rotation.y += delta * 0.7;
    for (let i = 0; i < this.tubesData.length; i++) {
      const tube = this.tubesData[i];
      if (tube.state === 'waiting') {
        tube.eraseTimer -= delta;
        if (tube.eraseTimer <= 0) {
          tube.state = 'drawing';
          tube.progress = 0;
          tube.mesh.material.color = getRandomColor();
        } else {
          tube.mesh.visible = false;
          continue;
        }
      }
      if (tube.state === 'drawing') {
        tube.mesh.visible = true;
        tube.progress += delta * tube.speed;
        const total = tube.points.length;
        const visibleCount = Math.max(2, Math.floor(tube.progress * total));
        tube.mesh.geometry.dispose();
        tube.mesh.geometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(tube.points.slice(0, visibleCount), false),
          visibleCount - 1,
          tube.mesh.geometry.parameters.radius,
          tube.mesh.geometry.parameters.radialSegments,
          false
        );
        if (visibleCount >= total) {
          tube.state = 'erasing';
          tube.eraseProgress = 0; // новый прогресс для стирания
        }
      }
      if (tube.state === 'erasing') {
        tube.eraseProgress = (tube.eraseProgress || 0) + delta * tube.speed;
        const total = tube.points.length;
        const startIdx = Math.min(Math.floor(tube.eraseProgress * total), total - 2);
        const visibleCount = total - startIdx;
        tube.mesh.geometry.dispose();
        tube.mesh.geometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(tube.points.slice(startIdx), false),
          Math.max(1, visibleCount - 1),
          tube.mesh.geometry.parameters.radius,
          tube.mesh.geometry.parameters.radialSegments,
          false
        );
        if (startIdx >= total - 2) {
          tube.state = 'waiting';
          tube.eraseTimer = tube.eraseDelay;
          tube.mesh.visible = false;
        }
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Запуск инициализации, передаем id элемента
export default Sketch;

// Чтобы запустить, просто нужно создать экземпляр класса
// const sketch = new Sketch('canvas');
