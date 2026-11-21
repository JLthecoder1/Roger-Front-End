'use client'
import {useEffect,useState} from 'react'
import {initialRound,type Checkpoint,type Round} from './round'

const localRoundKey='roger-local-round'

function localRound(){
  if(typeof window==='undefined') return initialRound
  try {
    const saved=window.localStorage.getItem(localRoundKey)
    if(saved) return JSON.parse(saved) as Round
  } catch { /* Use the built-in round when local storage is unavailable. */ }
  return structuredClone(initialRound)
}

function saveLocalRound(round:Round){
  window.localStorage.setItem(localRoundKey,JSON.stringify(round))
  window.dispatchEvent(new Event('roger:round-change'))
}

function localMutation(path:string,data:Record<string,unknown>){
  const round=localRound()
  if(path==='/api/checkpoints'){
    const point:Checkpoint={id:'CP-'+crypto.randomUUID().slice(0,8).toUpperCase(),name:String(data.name).trim(),task:String(data.task).trim(),x:Number(data.x),y:Number(data.y),location:String(data.location??'')}
    round.checkpoints.push(point)
    saveLocalRound(round)
    return {id:point.id}
  }
  if(path==='/api/checkpoints/status'){
    const id=String(data.id)
    if(data.done) round.checks=[...round.checks.filter(check=>check.id!==id),{id,officer:'Operador',created_at:new Date().toISOString()}]
    else round.checks=round.checks.filter(check=>check.id!==id)
    saveLocalRound(round)
    return {id}
  }
  if(path==='/api/checkpoints/delete'){
    const id=String(data.id)
    round.checkpoints=round.checkpoints.filter(point=>point.id!==id)
    round.checks=round.checks.filter(check=>check.id!==id)
    round.tasks=round.tasks.filter(task=>task.checkpoint_id!==id)
    saveLocalRound(round)
    return {id}
  }
  throw new Error('Ação indisponível sem conexão com a API.')
}

export function useRound(){
  const [round,setRound]=useState<Round>(initialRound)
  const [connected,setConnected]=useState(false)
  useEffect(()=>{
    let stopped=false
    let timer:ReturnType<typeof setTimeout>
    const controller=new AbortController()
    async function refresh(){
      try {
        const response=await fetch('/api/round',{cache:'no-store',signal:controller.signal})
        if(!response.ok) throw new Error()
        const data:Round=await response.json()
        if(!stopped){setRound(data);setConnected(true)}
      } catch {
        if(!stopped){setRound(localRound());setConnected(false)}
      } finally {
        if(!stopped) timer=setTimeout(refresh,2500)
      }
    }
    const updateLocal=()=>{if(!stopped) setRound(localRound())}
    window.addEventListener('roger:round-change',updateLocal)
    refresh()
    return ()=>{stopped=true;controller.abort();clearTimeout(timer);window.removeEventListener('roger:round-change',updateLocal)}
  },[])
  return {round,connected}
}

export async function submitRound(path:string, data:object){
  let response:Response
  try {
    response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  } catch {return localMutation(path,data as Record<string,unknown>)}
  if(response.ok) return response.json().catch(()=>({}))
  if(response.status!==404&&response.status<500){
    const result=await response.json().catch(()=>null)
    throw new Error(result?.error ?? 'Não foi possível salvar. Tente novamente.')
  }
  return localMutation(path,data as Record<string,unknown>)
}
