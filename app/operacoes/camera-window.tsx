'use client'

import {DevicePicker} from '../lib/device-picker'
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'

export function CameraWindow({open,onClose,closing=false}:{open:boolean;onClose:()=>void;closing?:boolean}){
  const panel=useRef<HTMLElement>(null)
  const video=useRef<HTMLVideoElement>(null)
  const cameraRequest=useRef(0)
  const stream=useRef<MediaStream|null>(null)
  const [message,setMessage]=useState('Escolha uma câmera para iniciar a prévia.')
  const [choosingDevice,setChoosingDevice]=useState(false)
  const [maximized,setMaximized]=useState(false)
  const [offset,setOffset]=useState({x:0,y:0})
  const [size,setSize]=useState<{width:number;height:number}|null>(null)

  const stopCamera=()=>{
    cameraRequest.current++
    stream.current?.getTracks().forEach(track=>track.stop())
    stream.current=null
    if(video.current) video.current.srcObject=null
  }
  const startCamera=async(deviceId:string)=>{
    stopCamera()
    const request=cameraRequest.current
    if(!navigator.mediaDevices?.getUserMedia){setMessage('Este navegador não oferece acesso à câmera.');return}
    setMessage('Solicitando acesso à câmera…')
    try {
      const next=await navigator.mediaDevices.getUserMedia({video:deviceId?{deviceId:{exact:deviceId}}:true,audio:false})
      if(request!==cameraRequest.current){next.getTracks().forEach(track=>track.stop());return}
      stream.current=next
      if(video.current){video.current.srcObject=next;await video.current.play()}
      if(request===cameraRequest.current)setMessage('Câmera ativa')
    } catch(error){
      if(request!==cameraRequest.current)return
      stopCamera()
      const name=error instanceof DOMException?error.name:''
      setMessage(name==='NotAllowedError'?'Permita o acesso à câmera nas configurações deste site.':
        name==='NotFoundError'?'Nenhuma câmera foi encontrada neste dispositivo.':
        'Não foi possível acessar a câmera. Verifique se ela está em uso e tente novamente.')
    }
  }
  const startDrag=(event:ReactPointerEvent<HTMLElement>)=>{
    if(event.button!==0||(event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    const bounds=panel.current?.getBoundingClientRect()
    const area=panel.current?.parentElement?.getBoundingClientRect()
    if(!bounds||!area) return
    const start={x:event.clientX,y:event.clientY,offset}
    const move=(moveEvent:PointerEvent)=>{
      const x=Math.min(area.right-bounds.right,Math.max(area.left-bounds.left,moveEvent.clientX-start.x))
      const y=Math.min(area.bottom-bounds.bottom,Math.max(area.top-bounds.top,moveEvent.clientY-start.y))
      setOffset({x:start.offset.x+x,y:start.offset.y+y})
    }
    const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop)}
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',stop)
    window.addEventListener('pointercancel',stop)
  }
  const startResize=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    event.preventDefault()
    event.stopPropagation()
    const bounds=panel.current?.getBoundingClientRect()
    const area=panel.current?.parentElement?.getBoundingClientRect()
    if(!bounds||!area) return
    const start={x:event.clientX,y:event.clientY,width:bounds.width,height:bounds.height}
    const move=(moveEvent:PointerEvent)=>setSize({
      width:Math.min(area.width-18,Math.max(300,start.width+moveEvent.clientX-start.x)),
      height:Math.min(area.height-18,Math.max(250,start.height+moveEvent.clientY-start.y))
    })
    const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop)}
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',stop)
    window.addEventListener('pointercancel',stop)
  }
  useEffect(()=>{
    if(!open){stopCamera();return}
    setChoosingDevice(true)
    return stopCamera
  },[open])

  if(!open) return null

  return <><section ref={panel} className={`camera-window-panel perimeter-panel${maximized?' is-maximized':''}${closing?' is-closing':''}`} role="dialog" aria-modal="false" aria-labelledby="camera-window-title" style={{transform:`translate(${offset.x}px,${offset.y}px)`,width:maximized?'min(60vw,760px)':size?.width??undefined,height:maximized?'min(74vh,650px)':size?.height??undefined}}>
    <header className="camera-window-header" onPointerDown={startDrag}>
      <div><strong id="camera-window-title">Câmera</strong><small>Prévia ao vivo</small></div>
      <div className="camera-modal-controls" aria-label="Controles da câmera">
        <button type="button" aria-label="Minimizar câmera" onClick={onClose}>−</button>
        <button type="button" aria-label={maximized?'Restaurar tamanho da câmera':'Maximizar câmera'} onClick={()=>setMaximized(value=>!value)}>↗</button>
        <button type="button" aria-label="Fechar câmera" onClick={onClose}>×</button>
      </div>
    </header>
    <div className="camera-preview">
      <video ref={video} muted playsInline autoPlay aria-label="Prévia da webcam"/>
      <p role="status">{message}</p>
    </div>
    <button type="button" className="camera-retry" onClick={()=>setChoosingDevice(true)}>Escolher câmera</button>
    <button type="button" className="camera-resize-handle" aria-label="Redimensionar câmera" onPointerDown={startResize}/>
  </section>
  {choosingDevice&&<DevicePicker kind="videoinput" onClose={()=>setChoosingDevice(false)} onSelect={id=>{
    setChoosingDevice(false)
    void startCamera(id)
  }}/>}
  </>
}
