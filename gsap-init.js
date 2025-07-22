import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Функция для регистрации ScrollTrigger
function registerScrollTrigger() {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger, registerScrollTrigger };
