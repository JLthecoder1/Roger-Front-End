'use client'

import {useEffect,useRef,useState} from 'react'
import {submitRound,useRound} from '../use-round'
import {RoundPanel} from './round-panel'

export type OperationTab='Operação'|'Ronda'|'Alertas'|'Histórico'
const localTime=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})

function Events({tab}:{tab:Exclude<OperationTab,'Ronda'>}){
  const {round,connected}=useRound()
  const alerts=round.alerts??[]
  const checks=tab==='Histórico'?(round.history??[]):round.checks
  const reports=(tab==='Histórico'?round.task_history:round.task_reports)??[]
  const [error,setError]=useState('')
  async function acknowledge(id:string){
    setError('')
    try{await submitRound('/api/alerts/acknowledge',{id})}
    catch(error){setError(error instanceof Error?error.message:'Não foi possível confirmar o alerta.')}
  }
  if(tab==='Alertas'){
    return <>
      <p>{alerts.filter(alert=>!alert.acknowledged_at).length} aguardando confirmação</p>
      {error&&<p role="alert">{error}</p>}
      <ul className="modal-list">
        {alerts.map(alert=><li key={alert.id}>
          <strong>{localTime.format(new Date(alert.created_at))} · {alert.message}</strong>
          {alert.acknowledged_at?<small>Recebimento confirmado às {localTime.format(new Date(alert.acknowledged_at))}</small>:
            <button type="button" className="action" onClick={()=>acknowledge(alert.id)}>Confirmar recebimento</button>}
        </li>)}
      </ul>
    </>
  }
  return <>
    {tab==='Operação'&&<p>{round.checks.length} de {round.checkpoints.length} checkpoints concluídos</p>}
    {!connected&&<p role="status">Aguardando conexão com os registros da ronda.</p>}
    {connected&&checks.length===0&&alerts.length===0&&reports.length===0&&<p>Nenhum registro no turno.</p>}
    <ul className="modal-list">
      {reports.map(report=><li key={report.id}>
        <strong>{report.task_title} · {report.done?'Feito':'Não feito'}</strong>
        <small>{localTime.format(new Date(report.created_at))} · {report.officer} · {report.checkpoint_name} · {report.location}</small>
      </li>)}
      {checks.map(check=><li key={check.created_at+check.id}>
        <strong>{round.checkpoints.find(point=>point.id===check.id)?.name??check.id}</strong>
        <small>{localTime.format(new Date(check.created_at))} · {check.officer} concluiu a inspeção{check.outcome?' · '+check.outcome:''}</small>
      </li>)}
      {alerts.map((alert,index)=><li key={`alert-${index}`}>
        {localTime.format(new Date(alert.created_at))} · {alert.message}
        {alert.acknowledged_at&&<small>Recebimento confirmado às {localTime.format(new Date(alert.acknowledged_at))}</small>}
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
