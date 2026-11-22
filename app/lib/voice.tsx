'use client'

import {useEffect,useRef,useState,type ReactNode} from 'react'
import type {IAgoraRTCClient,IMicrophoneAudioTrack,IRemoteAudioTrack,IRemoteVideoTrack} from 'agora-rtc-sdk-ng'
import type {RogerApi} from './roger-api'

type Session={id:string;appId:string;channel:string;uid:number;agentUid:number;avatarUid?:number|null;token:string;ttl:number}
type Call={audio?:IRemoteAudioTrack;removeAutoplayListener?:()=>void;client?:IAgoraRTCClient;microphone?:IMicrophoneAudioTrack;id?:string;timer?:ReturnType<typeof setTimeout>;statusTimer?:ReturnType<typeof setTimeout>;statsTimer?:ReturnType<typeof setInterval>;closed:boolean}
async function dispose(api:RogerApi,call:Call){
 call.closed=true
 call.removeAutoplayListener?.()
 clearTimeout(call.timer)
 clearTimeout(call.statusTimer)
 clearInterval(call.statsTimer)
 call.microphone?.close()
 const work=[call.client?.leave(),call.id?api.request('/api/voice/stop',{method:'POST',body:JSON.stringify({id:call.id}),keepalive:true}):undefined]
 await Promise.allSettled(work)
}
export function VoiceButton({api,className,idleLabel="Falar com Roger",icon,onVideo,onSession}:{api:RogerApi;className?:string;idleLabel?:string;icon?:ReactNode;onVideo?:(track:IRemoteVideoTrack|null)=>void;onSession?:(id:string|null)=>void}){
 const active=useRef<Call|null>(null)
 const mounted=useRef(true)
 const [phase,setPhase]=useState<'idle'|'connecting'|'active'>('idle')
 const [message,setMessage]=useState('')
 const [audioBlocked,setAudioBlocked]=useState(false)
 useEffect(()=>{
  mounted.current=true
  return ()=>{
   mounted.current=false
   const call=active.current
   active.current=null
   if(call) void dispose(api,call)
   onVideo?.(null)
   onSession?.(null)
  }
 },[api,onVideo,onSession])

 async function stop(endedRemotely=false){
  const call=active.current
  active.current=null
  onVideo?.(null)
  onSession?.(null)
  if(call){
   if(endedRemotely)call.id=undefined
   await dispose(api,call)
  }
  if(mounted.current)setPhase('idle')
 }
 async function start(){
  if(active.current)return
  const call:Call={closed:false}
  active.current=call
  setMessage('')
  setAudioBlocked(false)
  setPhase('connecting')
  try{
   const {default:rtc}=await import('agora-rtc-sdk-ng')
   if(call.closed)return
   try{
    call.microphone=await rtc.createMicrophoneAudioTrack()
   }catch{
    if(!call.closed)setMessage('Microfone indisponível. O painel continua recebendo áudio.')
   }
   if(call.closed){call.microphone?.close();return}
   const session=await api.request<Session>('/api/voice/start',{method:'POST'})
   call.id=session.id
   if(call.closed){await dispose(api,call);return}
   const autoplayFailed=()=>{if(!call.closed)setAudioBlocked(true)}
   rtc.on('autoplay-failed',autoplayFailed)
   call.removeAutoplayListener=()=>rtc.off('autoplay-failed',autoplayFailed)
   const client=call.client=rtc.createClient({mode:'rtc',codec:'vp8'})
   const diagnostics=new URLSearchParams(window.location.search).get('diagnosticoVoz')==='1'
   function trace(event:string,data:object){
    if(diagnostics&&!call.closed)console.info('[Roger voz]',event,data)
   }
   trace('sessão',{perfil:api.role,avatar:Boolean(session.avatarUid)})
   client.on('connection-state-change',(state,previous,reason)=>{
    trace('conexão',{state,previous,reason})
   })

   const audioUid=session.avatarUid??session.agentUid
   client.on('user-published',async(user,media)=>{
    const fromAgent=String(user.uid)===String(session.agentUid)
    const fromAvatar=String(user.uid)===String(session.avatarUid)
    const isAudio=media==='audio'&&String(user.uid)===String(audioUid)
    const isVideo=media==='video'&&fromAvatar&&onVideo
    if(call.closed)return
    if(fromAgent||fromAvatar)trace('faixa publicada',{origem:fromAgent?'agente':'avatar',media,selecionada:Boolean(isAudio||isVideo)})
    if(!isAudio&&!isVideo)return
    try{
     await client.subscribe(user,media)
     if(call.closed)return
     if(isAudio&&user.audioTrack){
      call.audio=user.audioTrack
      call.audio.play()
      trace('reprodução',{fonte:fromAvatar?'avatar':'agente'})
     }
     if(isVideo)onVideo(user.videoTrack??null)
    }catch{
     if(mounted.current&&!call.closed)setMessage(media==='video'?'Não foi possível exibir o avatar.':'Não foi possível reproduzir a voz do Roger.')
    }
   })
   client.on('user-unpublished',(user,media)=>{
    if(call.closed)return
    const fromAvatar=String(user.uid)===String(session.avatarUid)
    if(media==='video'&&fromAvatar)onVideo?.(null)
   })
   await client.join(session.appId,session.channel,session.token,session.uid)
   if(call.closed){await dispose(api,call);return}
   if(call.microphone)await client.publish(call.microphone)
   if(call.closed){await dispose(api,call);return}
   if(diagnostics)call.statsTimer=setInterval(()=>{
    const audio=Object.entries(client.getRemoteAudioStats()).map(([uid,stats])=>({
     fonte:uid===String(session.agentUid)?'agente':uid===String(session.avatarUid)?'avatar':'outra',
     atrasoMs:stats.receiveDelay,
     pacotesPerdidos:stats.receivePacketsLost,
     pacotesDescartados:stats.receivePacketsDiscarded,
     congelamentoSegundos:stats.totalFreezeTime
    }))
    trace('métricas',{rttMs:client.getRTCStats().RTT,audio})
   },3000)
   async function checkStatus(){
    try{
     const status=await api.request<{active:boolean}>('/api/voice/status/'+session.id)
     if(!status.active&&active.current===call&&!call.closed){
      setMessage('Conversa encerrada.')
      await stop(true)
      return
     }
    }catch{/* Uma interrupção de rede não confirma o encerramento. */}
    if(!call.closed)call.statusTimer=setTimeout(checkStatus,1500)
   }
   call.statusTimer=setTimeout(checkStatus,1500)
   call.timer=setTimeout(()=>{setMessage('Sessão de voz encerrada.');void stop()},(session.ttl-30)*1000)
   onSession?.(session.id)
   setPhase('active')
  }catch(error){
   if(!call.closed&&mounted.current)setMessage(error instanceof Error?error.message:'Não foi possível iniciar a voz.')
   if(active.current===call)await stop()
  }
 }
 return <>
  <button type="button" className={className} disabled={phase==='connecting'} onClick={()=>phase==='active'?stop():start()}>{icon}{phase==='active'?'Encerrar conversa':phase==='connecting'?'Conectando…':idleLabel}</button>
  {audioBlocked&&phase==='active'&&<button type="button" onClick={()=>{
   setAudioBlocked(false)
   active.current?.audio?.play()
  }}>Ativar som</button>}
  {message&&<p className="roger-voice-feedback" role="status">{message}</p>}
 </>
}
