'use client'
import {useEffect,useState} from 'react'
import {initialRound,type Round} from './round'
import {api} from './api-client'

export function useRound(){
 const [round,setRound]=useState<Round>(initialRound)
 const [connected,setConnected]=useState(false)
 useEffect(()=>{
  let stopped=false
  let controller:AbortController
  let timer:ReturnType<typeof setTimeout>
  async function refresh(){
   clearTimeout(timer)
   controller?.abort()
   const request=controller=new AbortController()
   try{
    const data=await api.request<Round>('/api/round',{signal:request.signal})
    if(!stopped&&!request.signal.aborted){setRound(data);setConnected(true)}
   }catch{
    if(!stopped&&!request.signal.aborted){setRound(initialRound);setConnected(false)}
   }finally{if(!stopped&&!request.signal.aborted)timer=setTimeout(refresh,2500)}
  }
  const events=['roger:round-change','roger:credentials']
  events.forEach(event=>window.addEventListener(event,refresh))
  void refresh()
  return ()=>{stopped=true;controller?.abort();clearTimeout(timer);events.forEach(event=>window.removeEventListener(event,refresh))}
 },[])
 return {round,connected}
}

export async function submitRound(path:string,data:object){
 const result=await api.request<{id?:string}>(path,{method:'POST',body:JSON.stringify(data)})
 window.dispatchEvent(new Event('roger:round-change'))
 return result
}
