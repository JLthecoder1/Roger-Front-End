'use client'
import {useState} from 'react'
import {submitRound,useRound} from '../use-round'

export function RoundPanel(){
 const {round,connected}=useRound()
 const active=round.round&&!round.round.finished_at?round.round:null
 const [saving,setSaving]=useState('')
 const [message,setMessage]=useState('')
 async function conclude(id:string){
  if(!active)return
  setSaving(id)
  setMessage('')
  try{
   await submitRound('/api/checks',{id,roundId:active.id})
   setMessage('Inspeção registrada.')
  }catch(error){setMessage(error instanceof Error?error.message:'Falha ao salvar.')}
  finally{setSaving('')}
 }
 return <div className="ronda-page">
  <h3>{active?'Ronda em andamento':round.round?'Última ronda encerrada':'Nenhuma ronda iniciada'}</h3>
  {round.round&&<p>Rondista: {round.round.officer}</p>}
  {!connected&&<p role="status">Aguardando conexão com a API.</p>}
  <p role="status">{message}</p>
  <ul className="round-list">{round.checkpoints.map(point=>{
   const done=round.checks.some(check=>check.id===point.id)
   return <li key={point.id}><div><small>{point.id}</small><h2>{point.name}</h2><p>{point.task}</p></div><button type="button" className="action" disabled={done||!active||!connected||Boolean(saving)} onClick={()=>conclude(point.id)}>{done?'Concluído':saving===point.id?'Registrando…':'Concluir check'}</button></li>
  })}</ul>
 </div>
}
