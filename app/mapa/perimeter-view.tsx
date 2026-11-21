'use client'

import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {locations,makePerimeter} from './perimeter-scene'
import {CheckpointWindow} from '../operacoes/checkpoint-window'
import {OperationWindow,type OperationTab} from '../operacoes/operation-window'
import {useRound} from '../use-round'

const operationTabs: {label:OperationTab;icon:number}[]=[
  {label:'Ronda',icon:6},
  {label:'Operação',icon:7},
  {label:'Alertas',icon:8},
  {label:'Histórico',icon:9}
]

const soundPreferencesKey='roger-opening-sound-preferences'

const menuIcons=[
  'M4 20V8l8-4 8 4v12H4Zm5 0v-6h6v6',
  'M3 20V9l9-5 9 5v11H3Zm4 0v-7h10v7m-10-3h10',
  'M3 6h12v11H3zm12 4h4l2 3v4h-6M7 20h.01M18 20h.01',
  'M4 20V6m16 14V6M4 9h16M4 17h16M8 9v8m4-8v8m4-8v8',
  'm3 11 9-7 9 7m-16-1v10h14V10M10 20v-6h4v6',
  'M19 10c0 4.5-7 10-7 10s-7-5.5-7-10a7 7 0 1 1 14 0ZM12 10h.01',
  'M8 3h8m-6 0v3m4-3v3M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm2 6h6m-6 4h4',
  'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
  'M18 8a6 6 0 0 0-12 0c0 6-2 7-3 9h18c-1-2-3-3-3-9ZM10 21h4',
  'M5 6h2m3 0h9M5 12h2m3 0h9M5 18h2m3 0h9',
]

type BrowserSpeechRecognition=new()=>{
  lang:string
  interimResults:boolean
  continuous:boolean
  start:()=>void
  onresult:(event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void
  onerror:()=>void
  onend:()=>void
}

function MenuIcon({index}:{index:number}){
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={menuIcons[index]}/></svg>
}

export default function PerimeterView({withMenu=false}:{withMenu?:boolean}){
  const host=useRef<HTMLDivElement>(null)
  const openingSound=useRef<HTMLAudioElement>(null)
  const avatarPanel=useRef<HTMLElement>(null)
  const chatPanel=useRef<HTMLElement>(null)
  const logsPanel=useRef<HTMLElement>(null)
  const {round,connected}=useRound()
  const pins=useRef<(HTMLButtonElement|null)[]>([])
  const actions=useRef<{zoom:(factor:number)=>void;reset:()=>void}|null>(null)
  const [menuOpen,setMenuOpen]=useState(true)
  const [openPanel,setOpenPanel]=useState<OperationTab|'Checkpoints'|null>(null)
  const [selected,setSelected]=useState<number|null>(null)
  const [unavailable,setUnavailable]=useState(false)
  const [chatOpen,setChatOpen]=useState(true)
  const [logsOpen,setLogsOpen]=useState(false)
  const [avatarOpen,setAvatarOpen]=useState(true)
  const [avatarClosing,setAvatarClosing]=useState(false)
  const [chatClosing,setChatClosing]=useState(false)
  const [logsClosing,setLogsClosing]=useState(false)
  const [avatarMaximized,setAvatarMaximized]=useState(false)
  const [chatMaximized,setChatMaximized]=useState(false)
  const [logsMaximized,setLogsMaximized]=useState(false)
  const [frontPanel,setFrontPanel]=useState<'avatar'|'chat'|'logs'>('chat')
  const [panelOffsets,setPanelOffsets]=useState({avatar:{x:0,y:0},chat:{x:0,y:0},logs:{x:0,y:0}})
  const [panelSizes,setPanelSizes]=useState<{avatar:number|null;chat:{width:number;height:number}|null;logs:{width:number;height:number}|null}>({avatar:null,chat:null,logs:null})
  const [chatMessage,setChatMessage]=useState('')
  const [isListening,setIsListening]=useState(false)
  const [soundVolume,setSoundVolume]=useState(.6)
  const [soundMuted,setSoundMuted]=useState(false)
  const [chatMessages,setChatMessages]=useState<{from:'roger'|'operador';text:string}[]>([
    {from:'roger',text:'Conectado à portaria. Posso consultar os checkpoints e pendências da ronda.'}
  ])
  const startDrag=(panel:'avatar'|'chat'|'logs',event:ReactPointerEvent<HTMLElement>)=>{
    if(event.button!==0 || (event.target as HTMLElement).closest('button,input')) return
    event.preventDefault()
    const initialOffset=panelOffsets[panel]
    const startX=event.clientX
    const startY=event.clientY
    const element=event.currentTarget.closest('.perimeter-panel') as HTMLElement|null
    const stageBounds=host.current?.getBoundingClientRect()
    const panelBounds=element?.getBoundingClientRect()
    const move=(moveEvent:PointerEvent)=>{
      const minX=stageBounds&&panelBounds?stageBounds.left-panelBounds.left:-Infinity
      const maxX=stageBounds&&panelBounds?stageBounds.right-panelBounds.right:Infinity
      const minY=stageBounds&&panelBounds?stageBounds.top-panelBounds.top:-Infinity
      const maxY=stageBounds&&panelBounds?stageBounds.bottom-panelBounds.bottom:Infinity
      const x=Math.min(maxX,Math.max(minX,moveEvent.clientX-startX))
      const y=Math.min(maxY,Math.max(minY,moveEvent.clientY-startY))
      setPanelOffsets(current=>({...current,[panel]:{x:initialOffset.x+x,y:initialOffset.y+y}}))
    }
    const stop=()=>{
      window.removeEventListener('pointermove',move)
      window.removeEventListener('pointerup',stop)
      window.removeEventListener('pointercancel',stop)
    }
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',stop)
    window.addEventListener('pointercancel',stop)
  }
  const startVoiceInput=()=>{
    const voiceWindow=window as typeof window & {SpeechRecognition?:BrowserSpeechRecognition;webkitSpeechRecognition?:BrowserSpeechRecognition}
    const Recognition=voiceWindow.SpeechRecognition??voiceWindow.webkitSpeechRecognition
    if(!Recognition){
      setChatMessage('O reconhecimento de voz não é suportado neste navegador.')
      return
    }
    const recognition=new Recognition()
    recognition.lang='pt-BR'
    recognition.interimResults=false
    recognition.continuous=false
    recognition.onresult=event=>setChatMessage(event.results[0][0].transcript)
    recognition.onerror=()=>setChatMessage('Não foi possível reconhecer o áudio. Tente novamente.')
    recognition.onend=()=>setIsListening(false)
    setIsListening(true)
    try {recognition.start()} catch {setIsListening(false)}
  }
  const startResize=(panel:'avatar'|'chat'|'logs',event:ReactPointerEvent<HTMLElement>)=>{
    event.preventDefault()
    event.stopPropagation()
    const element=panel==='avatar'?avatarPanel.current:panel==='chat'?chatPanel.current:logsPanel.current
    if(!element)return
    const initialWidth=element.offsetWidth
    const initialHeight=element.offsetHeight
    const startX=event.clientX
    const startY=event.clientY
    const move=(moveEvent:PointerEvent)=>{
      const maxWidth=Math.max(180,(host.current?.clientWidth??window.innerWidth)-18)
      if(panel==='avatar'){
        setPanelSizes(current=>({...current,avatar:Math.min(maxWidth,Math.max(110,initialWidth+moveEvent.clientX-startX))}))
        return
      }
      const maxHeight=Math.max(220,(host.current?.clientHeight??window.innerHeight)-18)
      setPanelSizes(current=>({
        ...current,
        [panel]:{
          width:Math.min(maxWidth,Math.max(240,initialWidth+moveEvent.clientX-startX)),
          height:Math.min(maxHeight,Math.max(250,initialHeight+moveEvent.clientY-startY))
        }
      }))
    }
    const stop=()=>{
      window.removeEventListener('pointermove',move)
      window.removeEventListener('pointerup',stop)
      window.removeEventListener('pointercancel',stop)
    }
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',stop)
    window.addEventListener('pointercancel',stop)
  }
  const hidePanel=(panel:'avatar'|'chat'|'logs',close=false)=>{
    if(panel==='avatar'){
      setAvatarClosing(true)
      window.setTimeout(()=>{setAvatarOpen(false);setAvatarClosing(false);if(close)setAvatarMaximized(false)},180)
      return
    }
    if(panel==='chat'){
      setChatClosing(true)
      window.setTimeout(()=>{setChatOpen(false);setChatClosing(false);if(close)setChatMaximized(false)},180)
      return
    }
    setLogsClosing(true)
    window.setTimeout(()=>{setLogsOpen(false);setLogsClosing(false);if(close)setLogsMaximized(false)},180)
  }
  useEffect(()=>{
    const sound=openingSound.current
    if(!sound) return
    let savedVolume=.6
    let savedMuted=false
    try {
      const saved=JSON.parse(window.localStorage.getItem(soundPreferencesKey)??'null') as {volume?:number;muted?:boolean}|null
      if(saved&&typeof saved.volume==='number') savedVolume=Math.max(0,Math.min(1,saved.volume))
      if(saved&&typeof saved.muted==='boolean') savedMuted=saved.muted
    } catch { /* The default volume is used when preferences cannot be read. */ }
    sound.volume=savedVolume
    sound.muted=savedMuted
    setSoundVolume(savedVolume)
    setSoundMuted(savedMuted)
    let started=false
    let attempting=false
    const playOpeningSound=()=>{
      if(started||attempting) return
      attempting=true
      sound.play().then(()=>{started=true}).catch(()=>{attempting=false})
    }
    const replayAfterRestore=(event:PageTransitionEvent)=>{
      if(!event.persisted) return
      started=false
      attempting=false
      sound.currentTime=0
      playOpeningSound()
    }
    sound.currentTime=0
    if(!savedMuted) playOpeningSound()
    window.addEventListener('pageshow',replayAfterRestore)
    return ()=>{
      window.removeEventListener('pageshow',replayAfterRestore)
      sound.pause()
      sound.currentTime=0
    }
  },[])
  useEffect(()=>{
    const mount=host.current
    if(!mount) return
    let renderer:THREE.WebGLRenderer
    try {renderer=new THREE.WebGLRenderer({antialias:true})}
    catch {setUnavailable(true);return}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75))
    renderer.shadowMap.enabled=true
    renderer.shadowMap.type=THREE.PCFShadowMap
    renderer.domElement.setAttribute('aria-hidden','true')
    mount.prepend(renderer.domElement)
    const {scene,locationHitboxes}=makePerimeter()
    const camera=new THREE.OrthographicCamera(-60,60,45,-45,.1,400)
    const origin=new THREE.Vector3(82,72,96)
    camera.position.copy(origin)
    const controls=new OrbitControls(camera,renderer.domElement)
    renderer.domElement.style.touchAction="pan-y pinch-zoom"
    controls.enableRotate=false
    controls.enableZoom=false
    controls.enableDamping=true
    controls.screenSpacePanning=false
    controls.minZoom=.8
    controls.maxZoom=3
    controls.mouseButtons.LEFT=THREE.MOUSE.PAN
    controls.touches.ONE=null
    controls.touches.TWO=null
    const target=new THREE.Vector3()
    const projected=new THREE.Vector3()
    const pointer=new THREE.Vector2()
    const raycaster=new THREE.Raycaster()
    let pointerStart:{x:number;y:number}|null=null
    let width=1
    let height=1
    const resize=new ResizeObserver(()=>{
      width=Math.max(1,mount.clientWidth)
      height=Math.max(1,mount.clientHeight)
      const aspect=width/height
      const halfHeight=Math.max(39,(width<640?55:53)/aspect)
      camera.left=-halfHeight*aspect
      camera.right=halfHeight*aspect
      camera.top=halfHeight
      camera.bottom=-halfHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,width<640?1.4:1.75))
      renderer.setSize(width,height)
    })
    resize.observe(mount)
    function moveTo(x:number,z:number){
      target.set(x,0,z).sub(controls.target)
      camera.position.add(target)
      controls.target.add(target)
      controls.update()
    }
    actions.current={
      zoom(factor){
        camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom)
        camera.updateProjectionMatrix()
      },
      reset(){
        moveTo(0,0)
        camera.position.copy(origin)
        camera.zoom=1
        camera.updateProjectionMatrix()
        controls.update()
      }
    }
    const beginLocationClick=(event:PointerEvent)=>{pointerStart={x:event.clientX,y:event.clientY}}
    const selectLocationFromMap=(event:PointerEvent)=>{
      if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>7){pointerStart=null;return}
      pointerStart=null
      const bounds=renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-((event.clientY-bounds.top)/bounds.height*2-1))
      raycaster.setFromCamera(pointer,camera)
      const hit=raycaster.intersectObjects(locationHitboxes,false)[0]
      if(hit) setSelected(hit.object.userData.locationIndex as number)
    }
    renderer.domElement.addEventListener('pointerdown',beginLocationClick)
    renderer.domElement.addEventListener('pointerup',selectLocationFromMap)
    renderer.setAnimationLoop(()=>{
      controls.update()
      const x=THREE.MathUtils.clamp(controls.target.x,-44,44)
      const z=THREE.MathUtils.clamp(controls.target.z,-34,34)
      if(x!==controls.target.x||z!==controls.target.z) moveTo(x,z)
      renderer.render(scene,camera)
      locations.forEach((location,index)=>{
        const pin=pins.current[index]
        if(!pin)return
        projected.set(location.x,location.height,location.z).project(camera)
        const pinX=(projected.x+1)*width/2
        const pinY=(1-projected.y)*height/2
        const inset=width<640?16:60
        pin.hidden=pinX<0||pinX>width||pinY<0||pinY>height
        pin.style.left=`${THREE.MathUtils.clamp(pinX,inset,width-inset)}px`
        pin.style.top=`${THREE.MathUtils.clamp(pinY,38,height-8)}px`
      })
    })
    return ()=>{
      actions.current=null
      resize.disconnect()
      renderer.domElement.removeEventListener('pointerdown',beginLocationClick)
      renderer.domElement.removeEventListener('pointerup',selectLocationFromMap)
      controls.dispose()
      renderer.setAnimationLoop(null)
      const materials=new Set<THREE.Material>()
      scene.traverse(object=>{
        if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments){
          object.geometry.dispose()
          for(const material of [object.material].flat())materials.add(material)
        }
      })
      materials.forEach(material=>material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  },[])
  function sendChat(){
    const text=chatMessage.trim()
    if(!text)return
    setChatMessages(messages=>[...messages,{from:'operador',text}])
    setChatMessage('')
    const completed=round.checks.length
    const pending=round.checkpoints.length-completed
    setChatMessages(messages=>[...messages,{from:'roger',text:`Turno atual: ${completed} concluídos e ${pending} pendentes. Há ${round.tasks.filter(task=>!task.done).length} tarefas em aberto.`}])
  }
  const setVolume=(value:number)=>{
    const next=Math.round(Math.max(0,Math.min(1,value))*10)/10
    const sound=openingSound.current
    setSoundVolume(next)
    setSoundMuted(next===0)
    try {window.localStorage.setItem(soundPreferencesKey,JSON.stringify({volume:next,muted:next===0}))} catch { /* Preference storage is optional. */ }
    if(sound){
      sound.muted=next===0
      sound.volume=next
    }
  }
  const toggleSound=()=>{
    const next=!soundMuted
    const sound=openingSound.current
    setSoundMuted(next)
    try {window.localStorage.setItem(soundPreferencesKey,JSON.stringify({volume:soundVolume,muted:next}))} catch { /* Preference storage is optional. */ }
    if(sound){
      sound.muted=next
    }
  }
  const destinationButtons=locations.map((location,index)=>
    <button key={location.name} type="button" aria-pressed={selected===index} disabled={unavailable} onClick={()=>setSelected(index)}>{location.name}</button>
  )
  const selectedLocation=selected===null?null:locations[selected]
  const locationTasks=selectedLocation?round.checkpoints.filter(point=>point.location===selectedLocation.name):[]
  return <section className={`perimeter-view ${withMenu?'perimeter-with-menu':''}`} aria-label="Mapa 3D do perímetro">
    <audio ref={openingSound} src="/sounds/roger%20that%20sound.mp3" autoPlay preload="auto" playsInline aria-hidden="true"/>
    {withMenu&&<aside className={`perimeter-sidebar ${menuOpen?'':'is-collapsed'}`}>
      <div className="perimeter-sidebar-header">
        <img className="perimeter-menu-logo" src="/roger-menu-logo.webp" alt="ROGER" width={512} height={171}/>
        <button type="button" className="perimeter-menu-toggle" aria-label={menuOpen?'Recolher menu lateral':'Expandir menu lateral'} aria-expanded={menuOpen} aria-controls="perimeter-navigation" onClick={()=>setMenuOpen(open=>!open)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M9 5v14"/>
          </svg>
        </button>
      </div>
      <nav id="perimeter-navigation" className="perimeter-sidebar-nav" aria-label="Navegação do perímetro" aria-hidden={!menuOpen}>
        <div className="perimeter-pages">
          <button type="button" aria-current="page" onClick={()=>setOpenPanel(null)}><MenuIcon index={4}/><span>Mapa do perímetro</span></button>
          <button type="button" aria-haspopup="dialog" onClick={()=>setOpenPanel('Checkpoints')}><MenuIcon index={5}/><span>Checkpoints</span></button>
          {operationTabs.map(({label,icon})=><button key={label} type="button" aria-haspopup="dialog" onClick={()=>setOpenPanel(label)}><MenuIcon index={icon}/><span>{label}</span></button>)}
        </div>
        <div className="perimeter-menu-destinations" role="group" aria-label="Locais do perímetro">
          {locations.map((location,index)=><button key={location.name} type="button" aria-label={location.name} title={location.name} aria-pressed={selected===index} disabled={unavailable} onClick={()=>setSelected(index)}><MenuIcon index={index}/><span>{location.name}</span></button>)}
        </div>
      </nav>
    </aside>}
    <div className="perimeter-content">

    <div className="perimeter-stage" ref={host}>
      <nav className="perimeter-glass-nav" aria-label="Acesso rápido">
        <button type="button" aria-label="Mostrar ou minimizar avatar do Roger" aria-pressed={avatarOpen&&!avatarClosing} disabled={avatarClosing} onClick={()=>{setFrontPanel('avatar');if(avatarOpen) hidePanel('avatar');else setAvatarOpen(true)}}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 21a7 7 0 0 1 14 0M4 4h16v16H4z"/></svg>
          <span>Avatar</span>
        </button>
        <button type="button" aria-pressed={chatOpen&&!chatClosing} disabled={chatClosing} onClick={()=>{
          setFrontPanel('chat')
          if(chatOpen) hidePanel('chat')
          else setChatOpen(true)
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 15a4 4 0 0 1-4 4H9l-5 3 1.5-4.5A7 7 0 1 1 20 15Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>
          <span>Chat</span>
        </button>
        <button type="button" aria-pressed={logsOpen&&!logsClosing} disabled={logsClosing} onClick={()=>{
          setFrontPanel('logs')
          if(logsOpen) hidePanel('logs')
          else setLogsOpen(true)
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>
          <span>Logs</span>
        </button>
      </nav>
      <div className="perimeter-communication" style={{zIndex:frontPanel==='avatar'?7:2}}>
        {avatarOpen&&<figure ref={avatarPanel} className={`perimeter-avatar perimeter-panel perimeter-draggable${avatarClosing?' is-closing':''}${avatarMaximized?' is-maximized':''}`} onPointerDown={event=>{setFrontPanel('avatar');startDrag('avatar',event)}} style={{transform:`translate(${panelOffsets.avatar.x}px,${panelOffsets.avatar.y}px)`,width:avatarMaximized?'min(42vw,520px)':panelSizes.avatar??undefined}}>
          <div className="perimeter-avatar-screen">
            <img src="/roger-avatar.webp" alt="Retrato do Roger" width={640} height={960}/>
          </div>
          <figcaption>Roger <span className={connected?'communication-online':''}>{connected?'Conectado':'Aguardando conexão'}</span></figcaption>
          <div className="perimeter-panel-controls" aria-label="Controles do avatar">
            <button type="button" aria-label="Minimizar avatar" onClick={()=>hidePanel('avatar')}>−</button>
            <button type="button" aria-label={avatarMaximized?'Restaurar tamanho do avatar':'Maximizar avatar'} onClick={()=>setAvatarMaximized(value=>!value)}>↗</button>
            <button type="button" aria-label="Fechar avatar" onClick={()=>hidePanel('avatar',true)}>×</button>
          </div>
          <button type="button" className="perimeter-resize-handle" aria-label="Redimensionar avatar" onPointerDown={event=>startResize('avatar',event)}/>
        </figure>}
      </div>
      {chatOpen&&<section ref={chatPanel} className={`perimeter-chat perimeter-chat--docked perimeter-panel${chatClosing?' is-closing':''}${chatMaximized?' is-maximized':''}`} aria-label="Chat do ROGER" onPointerDownCapture={()=>setFrontPanel('chat')} style={{transform:`translate(${panelOffsets.chat.x}px,${panelOffsets.chat.y}px)`,width:chatMaximized?'min(60vw,760px)':panelSizes.chat?.width??undefined,height:chatMaximized?'min(74vh,650px)':panelSizes.chat?.height??undefined,zIndex:frontPanel==='chat'?7:2}}>
        <header className="perimeter-chat-header perimeter-drag-handle" onPointerDown={event=>startDrag('chat',event)}>
          <div><strong>ROGER</strong><small>{round.checks.length}/{round.checkpoints.length} check-ins concluídos</small></div>
          <div className="perimeter-panel-controls" aria-label="Controles do chat">
            <button type="button" aria-label="Minimizar chat" onClick={()=>hidePanel('chat')}>−</button>
            <button type="button" aria-label={chatMaximized?'Restaurar tamanho do chat':'Maximizar chat'} onClick={()=>setChatMaximized(value=>!value)}>↗</button>
            <button type="button" aria-label="Fechar chat" onClick={()=>hidePanel('chat',true)}>×</button>
          </div>
        </header>
        <div className="perimeter-chat-tabs" role="tablist" aria-label="Visualização do painel">
          <button type="button" role="tab" aria-selected="true">Conversar</button>
          <button type="button" role="tab" aria-selected="false" onClick={()=>{hidePanel('chat');setLogsOpen(true)}}>Logs em tempo real</button>
        </div>
        <div className="perimeter-chat-messages">
          {chatMessages.map((message,index)=><p key={index} className={message.from}>{message.text}</p>)}
        </div>
        <form className="perimeter-chat-form" onSubmit={event=>{event.preventDefault();sendChat()}}>
          <input aria-label="Mensagem para o ROGER" value={chatMessage} onChange={event=>setChatMessage(event.target.value)} placeholder="Pergunte o que falta na ronda…"/>
          <button className="perimeter-chat-speak" type="button" onClick={startVoiceInput} disabled={isListening} aria-pressed={isListening} title="Falar com o ROGER">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>
            <span>{isListening?'Ouvindo…':'Falar'}</span>
          </button>
          <button type="submit" disabled={!chatMessage.trim()}>Enviar</button>
        </form>
        <button type="button" className="perimeter-resize-handle" aria-label="Redimensionar chat" onPointerDown={event=>startResize('chat',event)}/>
      </section>}
      {logsOpen&&<section ref={logsPanel} className={`perimeter-logs perimeter-logs--docked perimeter-panel${logsClosing?' is-closing':''}${logsMaximized?' is-maximized':''}`} aria-label="Logs da ronda" onPointerDownCapture={()=>setFrontPanel('logs')} style={{transform:`translate(${panelOffsets.logs.x}px,${panelOffsets.logs.y}px)`,width:logsMaximized?'min(60vw,760px)':panelSizes.logs?.width??undefined,height:logsMaximized?'min(74vh,650px)':panelSizes.logs?.height??undefined,zIndex:frontPanel==='logs'?7:2}}>
        <header className="perimeter-chat-header perimeter-drag-handle" onPointerDown={event=>startDrag('logs',event)}>
          <div><strong>LOGS DA RONDA</strong><small>{round.checks.length}/{round.checkpoints.length} check-ins concluídos</small></div>
          <div className="perimeter-panel-controls" aria-label="Controles dos logs">
            <button type="button" aria-label="Minimizar logs" onClick={()=>hidePanel('logs')}>−</button>
            <button type="button" aria-label={logsMaximized?'Restaurar tamanho dos logs':'Maximizar logs'} onClick={()=>setLogsMaximized(value=>!value)}>↗</button>
            <button type="button" aria-label="Fechar logs" onClick={()=>hidePanel('logs',true)}>×</button>
          </div>
        </header>
        <div className="perimeter-logs-title">Eventos em tempo real</div>
        <div className="perimeter-chat-messages">
          {round.checks.map(check=><p className="log" key={'check-'+check.id}><small>CHECK-IN CONCLUÍDO</small>{round.checkpoints.find(point=>point.id===check.id)?.name??check.id} · {check.officer}</p>)}
          {round.tasks.map(task=><p className="log" key={'task-'+task.id}><small>{task.done?'TAREFA CONCLUÍDA':'TAREFA CRIADA'}</small>{task.title}</p>)}
          {!round.checks.length&&!round.tasks.length&&<p className="log"><small>SEM REGISTROS</small>Ainda não há eventos nesta ronda.</p>}
        </div>
        <button type="button" className="perimeter-resize-handle" aria-label="Redimensionar logs" onPointerDown={event=>startResize('logs',event)}/>
      </section>}
      <div className="perimeter-zoom perimeter-zoom--floating" role="group" aria-label="Controles do mapa">
        <button type="button" aria-label="Reduzir zoom" disabled={unavailable} onClick={()=>actions.current?.zoom(1/1.2)}>−</button>
        <button type="button" aria-label="Aumentar zoom" disabled={unavailable} onClick={()=>actions.current?.zoom(1.2)}>+</button>
        <button type="button" disabled={unavailable} onClick={()=>{setSelected(null);actions.current?.reset()}}>Vista geral</button>
        <span className="perimeter-audio-divider" aria-hidden="true"/>
        <button type="button" aria-label={soundMuted?'Ativar som':'Desativar som'} aria-pressed={!soundMuted} title={soundMuted?'Ativar som':'Desativar som'} onClick={toggleSound}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4z"/>{soundMuted||soundVolume===0?<path d="m17 9 4 4m0-4-4 4"/>:<>{soundVolume>.1&&<path d="M16 9a5 5 0 0 1 0 6"/>}{soundVolume>.5&&<path d="M19 6a9 9 0 0 1 0 12"/>}</>}</svg>
        </button>
        <button type="button" aria-label="Diminuir volume" title="Diminuir volume" disabled={soundVolume<=0} onClick={()=>setVolume(soundVolume-.1)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4zM17 12h4"/></svg>
        </button>
        <button type="button" aria-label="Aumentar volume" title="Aumentar volume" disabled={soundVolume>=1} onClick={()=>setVolume(soundVolume+.1)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4zM19 9v6M16 12h6"/></svg>
        </button>
      </div>
      {unavailable?<p className="perimeter-error">O mapa 3D requer WebGL no navegador.</p>:locations.map((location,index)=>
        <button key={location.name} className="perimeter-pin" ref={node=>{pins.current[index]=node}} type="button" aria-pressed={selected===index} onClick={()=>setSelected(index)} aria-label={location.name}><span className="perimeter-pin-dot" aria-hidden="true"/><span className="perimeter-pin-label">{location.name}</span></button>
      )}
      {selectedLocation&&<aside className="perimeter-location-tasks" aria-label={'Tarefas em '+selectedLocation.name}>
        <button type="button" aria-label="Fechar tarefas do local" onClick={()=>setSelected(null)}>×</button>
        <span>LOCAL DO MAPA</span><h3>{selectedLocation.name}</h3>
        <p>{locationTasks.length} {locationTasks.length===1?'tarefa atribuída':'tarefas atribuídas'}</p>
        <ul>{locationTasks.length?locationTasks.map(point=><li key={point.id}><strong>{point.name}</strong><small>{point.task}</small></li>):<li className="perimeter-location-empty">Nenhuma tarefa atribuída.</li>}</ul>
      </aside>}
    </div>
    {!withMenu&&<div className="perimeter-toolbar">
      {!withMenu&&<div className="perimeter-destinations" role="group" aria-label="Locais do perímetro">{destinationButtons}</div>}
    </div>}
    </div>
    {openPanel==='Checkpoints'&&<CheckpointWindow onClose={()=>setOpenPanel(null)}/>}
    {openPanel&&openPanel!=='Checkpoints'&&<OperationWindow tab={openPanel} onClose={()=>setOpenPanel(null)}/>}
  </section>
}
