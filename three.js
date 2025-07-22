import * as THREE from "three/webgpu";
import img1 from "/1.jpg"
import img2 from "/2.jpg"
import { Fn, vec4, uv, texture, mix, uniform, vec2, vec3, abs, max, dot, step, smoothstep, cos, sin, floor, float, length, pow, oneMinus, mx_noise_float, remap } from "three/tsl";
import GUI from 'lil-gui';


class Sketch {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Основные параметры
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.cube = this.createCube();
    this.clock;
    this.time = 0;

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

    // Добавляем GUI для управления переходом
    this.addGUI();

    // Обработчики событий
    this.addEventListeners();

    // Запуск анимации
    this.animate();
  }

  // Создание сцены
  createScene() {
    const scene = new THREE.Scene();
    return scene;
  }

  // Создание камеры
  createCamera() {
    // swith to ortographic camera
    let frustumSize = 1;
    let aspect = 1;

    const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -1000, 1000);
    camera.position.set(0, 0, 2);
    return camera;
  }

  // Создание рендера
  createRenderer() {
    const renderer = new THREE.WebGPURenderer();
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


  createCube() {
    let texture1 = new THREE.TextureLoader().load(img1);
    let texture2 = new THREE.TextureLoader().load(img2);

    const uTransition = uniform(float(0))
    const uTime = uniform(float(0))
    this.transition = uTransition;
    this.timeUniform = uTime;
    this.transitionValue = 0; // Значение для GUI

    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.material = new THREE.NodeMaterial();


    const hexDistance = Fn(([uv]) => {
      const s = vec2(1, 1.7320508075688772)
      const p = uv.toVar().abs()
      return max(dot(p,s.mul(0.5)), p.x)
    })

    const hexCoorinates = Fn(([uv]) => {
      const s = vec2(1, 1.7320508075688772)
      const hexCenter = sround(
        vec4(uv, uv.toVar().sub(vec2(0.5, 1))).div(s.xyxy)
      )
      const offset = vec4(
        uv.sub(hexCenter.xy.mul(s)),
        uv.sub(hexCenter.zw.add(vec2(0.5)).mul(s))
      )

      const dot1 = dot(offset.xy, offset.xy)
      const dot2 = dot(offset.zw, offset.zw)
      const final1 = vec4(offset.xy, hexCenter.xy)
      const final2 = vec4(offset.zw, hexCenter.zw)
      const diff = dot1.sub(dot2)
      const final = mix(final1, final2, step(0, diff))

      return final
    })

    const sround = Fn(([s])=>{
      return floor(s.add(0.5))
    })



    const scaleUV = Fn(([uv, scale])=>{
      return uv.toVar().sub(vec2(0.5)).mul(scale).add(vec2(0.5));
    })


    this.material.colorNode = Fn(()=>{
      const corUV = scaleUV(uv(), vec2(1, this.height / this.width))
      const distUV = scaleUV(corUV, vec2(float(1).add(length(uv().sub(0.5)))))

      const hexUV = distUV.mul(20)
      const hexCoords = hexCoorinates(hexUV)

      const hexDist = hexDistance(hexCoords.xy).add(0.03)

      const border = smoothstep(0.51, 0.51 + 0.01, hexDist)

      const y = pow(max(0, float(0.5).sub(hexDist)).oneMinus(), 10).mul(1.5)
      const z = mx_noise_float(abs(hexCoords.zw.mul(0.6)))

      const offset = float(0.2)
      const bounceTransition = smoothstep(0, 0.5, abs(uTransition.sub(0.5))).oneMinus();


      const blendCut = smoothstep(
        uv().y.sub(offset),
        uv().y.add(offset),
        remap(uTransition.add(z.mul(0.08).mul(bounceTransition)), 0, 1, offset.mul(-1), float(1).add(offset))
      )

      const merge = smoothstep(0, 0.5, abs(blendCut.sub(0.5))).oneMinus()

      const cut = step(uv().y, uTransition.add(y.add(z).mul(0.15).mul(bounceTransition)))

      const textureUV = corUV.add(
        y.mul(sin(uv().y.mul(5).sub(uTime))).mul(merge).mul(0.025)
      )

      const fromUV = textureUV.toVar()
      const toUV = textureUV.toVar()

      fromUV.assign(
        scaleUV(fromUV.toVar(), vec2(float(1).add(z.mul(0.2).mul(merge))))
      )

      toUV.assign(
        scaleUV(toUV.toVar(), vec2(float(1).add(z.mul(0.2).mul(blendCut))))
      )

      const colorBlend = merge.mul(border).mul(bounceTransition)



      const sample1 = texture(texture1, toUV )
      const sample2 = texture(texture2, fromUV)

      const final = mix(sample1, sample2, cut)

      final.addAssign(
        vec4(1, 0.4, 0).mul(colorBlend).mul(2)
      )

      return final
    })()

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(0,0,0)
    return mesh;
  }

  addGUI() {
    this.gui = new GUI();
    this.gui.add(this, 'transitionValue', 0, 1, 0.01).name('Transition').onChange((value) => {
      // Обновляем uniform
      this.transition.value = value;
    });
  }

  addObjects() {
    this.scene.add(this.cube);
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
    this.time += 0.01;
    this.timeUniform.value = this.time;

    requestAnimationFrame(this.animate.bind(this));
    this.renderer.renderAsync(this.scene, this.camera);
  }
}

// Запуск инициализации, передаем id элемента
export default Sketch;

// Чтобы запустить, просто нужно создать экземпляfр класса
// const sketch = new Sketch('canvas');
