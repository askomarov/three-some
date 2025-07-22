import "./style.css";
import Sketch from "./three";
import { gsap, ScrollTrigger, registerScrollTrigger } from './gsap-init.js';

registerScrollTrigger();
// Теперь можно использовать gsap и ScrollTrigger

console.log("hello js asd");

const sketch = new Sketch('canvas');

// Ждём, пока DOM инициализируется и Sketch создастся
window.addEventListener('DOMContentLoaded', () => {
  // Убедимся, что элемент .main существует
  const trigger = document.querySelector('.trigger-for-transition');
  if (!trigger) {
    console.warn('Элемент .main не найден!');
    return;
  }

  gsap.to(sketch, {
    transitionValue: 1,
    scrollTrigger: {
      trigger: trigger,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => {
        sketch.transition.value = self.progress;
      }
    }
  });
});
