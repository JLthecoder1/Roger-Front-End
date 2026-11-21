'use client'

import {useEffect,useRef,useState} from 'react'
import {useRound} from '../use-round'
import {RoundPanel} from './round-panel'

export type OperationTab='Operação'|'Ronda'|'Alertas'|'Histórico'
type Alert={time:string;confirmed?:string}
const alertStorageKey='roger-alertas'
const localTime=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})

function Events({tab}:{tab:Exclude<OperationTab,'Ronda'>}){
  const {round,connected}=useRound()
  const [alerts,setAlerts]=useState<Alert[]>([])
  const [storageError,setStorageError]=useState(false)
  useEffect(()=>{
    try {
      const stored:unknown=JSON.parse(localStorage.getItem(alertStorageKey)??'[]')
      if(Array.isArray(stored)) setAlerts(stored.filter(item=>item&&typeof item.time==='string'))
    } catch {}
  },[])
  function saveAlerts(next:Alert[]){
    try {
      localStorage.setItem(alertStorageKey,JSON.stringify(next))
      setAlerts(next)
      setStorageError(false)
    } catch {setStorageError(true)}
  }
  if(tab==='Alertas'){
    return <>
      <p>{alerts.filter(alert=>!alert.confirmed).length} aguardando confirmação</p>
      {storageError&&<p role="alert">Não foi possível salvar os alertas neste navegador.</p>}
      <ul className="modal-list">
        {alerts.map((alert,index)=><li key={index}>
          <strong>{alert.time} · Pessoa detectada na doca</strong>
          {alert.confirmed?<small>Recebimento confirmado às {alert.confirmed}</small>:
            <button type="button" className="action" onClick={()=>saveAlerts(alerts.map((item,i)=>i===index?{...item,confirmed:localTime.format(new Date())}:item))}>Confirmar recebimento</button>}
        </li>)}
      </ul>
      <button type="button" className="action secondary" onClick={()=>saveAlerts([...alerts,{time:localTime.format(new Date())}])}>Simular presença na doca</button>
    </>
  }
  return <>
    {tab==='Operação'&&<p>{round.checks.length} de {round.checkpoints.length} checkpoints concluídos</p>}
    {!connected&&<p role="status">Aguardando conexão com os registros da ronda.</p>}
    {connected&&round.checks.length===0&&alerts.length===0&&<p>Nenhum registro no turno.</p>}
    <ul className="modal-list">
      {round.checks.map(check=><li key={check.id}>
        <strong>{round.checkpoints.find(point=>point.id===check.id)?.name??check.id}</strong>
        <small>{localTime.format(new Date(check.created_at))} · {check.officer} concluiu a inspeção</small>
      </li>)}
      {alerts.map((alert,index)=><li key={`alert-${index}`}>
        {alert.time} · Pessoa detectada na doca
        {alert.confirmed&&<small>Recebimento confirmado às {alert.confirmed}</small>}
      </li>)}
    </ul>
  </>
}

export function OperationWindow({tab,onClose}:{tab:OperationTab;onClose:()=>void}){
  const modal=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const dialog=modal.current
    if(dialog&&!dialog.open) dialog.showModal()
  },[])
  return <dialog ref={modal} className="operation-window" aria-labelledby="operation-window-title" onClose={onClose}>
    <div className="modal-head">
      <h2 id="operation-window-title">{tab}</h2>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={()=>modal.current?.close()}>×</button>
    </div>
    {tab==='Ronda'?<RoundPanel/>:<Events tab={tab}/>}
  </dialog>
}
