'use client'

import PerimeterView from '../mapa/perimeter-view'

export default function Operations(){
  return (
    <>
      <main><PerimeterView withMenu/></main>
    <footer className="roger-footer footer-only">
     <span className="footer-lettering" data-lettering="ROGER" onPointerMove={event=>{
       const lettering=event.currentTarget
       const bounds=lettering.getBoundingClientRect()
       lettering.style.setProperty('--beam-x', `${event.clientX-bounds.left}px`)
       lettering.style.setProperty('--beam-y', `${event.clientY-bounds.top}px`)
     }}>ROGER</span>
   </footer>
    </>
  )
}
