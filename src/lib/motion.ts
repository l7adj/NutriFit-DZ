import type { Variants, Transition } from 'motion/react';
export const EASE_OUT_EXPO=[.16,1,.3,1] as const;export const EASE_IN_OUT=[.65,0,.35,1] as const;
export const SPRING_SOFT={type:'spring',stiffness:300,damping:30} as const;export const SPRING_SNAPPY={type:'spring',stiffness:500,damping:35} as const;export const SPRING_BOUNCY={type:'spring',stiffness:400,damping:22} as const;
export const transition=(duration=.24):Transition=>({duration,ease:EASE_OUT_EXPO});
export const fadeUp:Variants={hidden:{opacity:0,y:8},show:{opacity:1,y:0,transition:{...transition(.36),staggerChildren:.04,delayChildren:.02}},exit:{opacity:0,y:-4,transition:transition(.18)}};
export const staggerItem:Variants={hidden:{opacity:0,y:8},show:{opacity:1,y:0,transition:transition(.24)},exit:{opacity:0,y:4,transition:transition(.16)}};
export const sheetVariants:Variants={hidden:{y:'100%',opacity:.96},show:{y:0,opacity:1,transition:SPRING_SOFT},exit:{y:'100%',opacity:.96,transition:{...SPRING_SOFT,stiffness:360}}};
