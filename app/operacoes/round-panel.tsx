'use client'
import {useState} from 'react'
import {submitRound,useRound} from '../use-round'

export function RoundPanel(){
  const {round,connected}=useRound()
  const [officer,setOfficer]=useState('')
  const [saving,setSaving]=useState('')
  const [submitted,setSubmitted]=useState<string[]>([])
  const [message,setMessage]=useState('')
  async function conclude(id:string){
    setSaving(id)
    setMessage('')
    try {
      await submitRound('/api/checks',{id,officer})
      setSubmitted(previous=>[...previous,id])
      setMessage('Inspeção registrada e enviada à portaria.')
    } catch(error) {setMessage(error instanceof Error ? error.message : 'Falha ao enviar.')}
    finally {setSaving('')}
  }
  return <div className="ronda-page">
    <h3>Ronda 02</h3>
    <p className="connection"><i className={connected?'online':''}/>{connected?'Conectado à portaria':'Aguardando conexão'}</p>
    <label htmlFor="officer">Nome do rondista</label>
    <input id="officer" maxLength={80} autoComplete="name" value={officer} onChange={event=>setOfficer(event.target.value)}/>
    <p role="status">{message}</p>
    <ul className="round-list">{round.checkpoints.map(point=>{
      const done=submitted.includes(point.id)||round.checks.some(check=>check.id===point.id)
      return <li key={point.id}><div><small>{point.id}</small><h2>{point.name}</h2><p>{point.task}</p></div><button type="button" className="action" disabled={done||!officer.trim()||!connected||Boolean(saving)} onClick={()=>conclude(point.id)}>{done?'Concluído':saving===point.id?'Registrando…':'Concluir check'}</button></li>
    })}</ul>
  </div>
}
