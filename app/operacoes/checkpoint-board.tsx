'use client'

import {useEffect,useState,type FormEvent} from 'react'
import type {Checkpoint} from '../round'
import {submitRound} from '../use-round'
import {locations} from '../mapa/perimeter-scene'

function activity(item:Checkpoint){
  return item.task.trim()&&item.task!=='Inspeção programada'?item.task:item.name
}

export function CheckpointBoard({points,completed}:{points:Checkpoint[];completed:Set<string>}){
  const [items,setItems]=useState(points)
  const [doneIds,setDoneIds]=useState(completed)
  const [assignedTo,setAssignedTo]=useState('')
  const [task,setTask]=useState('')
  const [location,setLocation]=useState<string>(locations[0].name)
  const [saving,setSaving]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [pendingDelete,setPendingDelete]=useState<Checkpoint|null>(null)

  useEffect(()=>setItems(points),[points])
  useEffect(()=>setDoneIds(new Set(completed)),[completed])

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const taskTitle=task.trim()
    if(!taskTitle||!assignedTo||!location||saving) return
    const name=taskTitle.slice(0,80)
    setSaving('new')
    setError('')
    try {
      const result=await submitRound('/api/checkpoints',{name,task:taskTitle,x:50,y:50,location,assignedTo}) as {id:string}
      setItems(current=>[...current,{id:result.id,name,task:taskTitle,x:50,y:50,location,assigned_to:assignedTo}])
      setTask('')
    } catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível criar o checkpoint.')}
    finally {setSaving(null)}
  }

  async function assign(item:Checkpoint,assignee:string){
    setSaving(item.id)
    setError('')
    try{
      await submitRound('/api/checkpoints/assign',{id:item.id,assignedTo:assignee||null})
      setItems(current=>current.map(point=>point.id===item.id?{...point,assigned_to:assignee||null}:point))
    }catch(reason){setError(reason instanceof Error?reason.message:'Falha ao atribuir checkpoint.')}
    finally{setSaving(null)}
  }

  async function toggle(item:Checkpoint){
    const done=doneIds.has(item.id)
    setSaving(item.id)
    setError('')
    try {
      await submitRound('/api/checkpoints/status',{id:item.id,done:!done})
      setDoneIds(current=>{
        const next=new Set(current)
        if(done) next.delete(item.id)
        else next.add(item.id)
        return next
      })
    } catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível atualizar o checkpoint.')}
    finally {setSaving(null)}
  }

  async function remove(item:Checkpoint){
    setSaving(item.id)
    setError('')
    try {
      await submitRound('/api/checkpoints/delete',{id:item.id})
      setItems(current=>current.filter(currentItem=>currentItem.id!==item.id))
      setDoneIds(current=>{const next=new Set(current);next.delete(item.id);return next})
      return true
    } catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível excluir o checkpoint.')}
    finally {setSaving(null)}
    return false
  }

  async function confirmDelete(){
    if(pendingDelete&&await remove(pendingDelete)) setPendingDelete(null)
  }

  return <section className="checkpoint-notion" aria-label="Lista de checkpoints">
    <form className="checkpoint-notion-composer" onSubmit={create}>
      <label>Atividade
        <input placeholder="Ex.: verificar luz queimada" maxLength={160} value={task} onChange={event=>setTask(event.target.value)} required/>
      </label>
      <label>Rondante
        <select value={assignedTo} onChange={event=>setAssignedTo(event.target.value)} required><option value="">Selecione</option><option>Ewerton</option><option>Marcos</option></select>
      </label>
      <label>Lugar
        <select value={location} onChange={event=>setLocation(event.target.value)} required>{locations.map(item=><option key={item.name}>{item.name}</option>)}</select>
      </label>
      <button type="submit" disabled={!task.trim()||!assignedTo||!location||Boolean(saving)}>{saving==='new'?'Criando…':'Criar'}</button>
    </form>
    {error&&<p className="checkpoint-notion-error" role="alert">{error}</p>}
    <div className="checkpoint-notion-list">
      {items.map(item=>{
        const done=doneIds.has(item.id)
        return <article className={'checkpoint-notion-item'+(done?' is-done':'')} key={item.id}>
          <input type="checkbox" aria-label={'Concluir '+activity(item)} checked={done} disabled={saving===item.id} onChange={()=>toggle(item)}/>
          <div className="checkpoint-notion-details">
            <strong>{activity(item)}</strong>
            <select aria-label={'Rondante responsável por '+activity(item)} value={item.assigned_to??''} disabled={Boolean(saving)} onChange={event=>assign(item,event.target.value)}><option value="">Sem atribuição</option><option>Ewerton</option><option>Marcos</option></select>
            <small>{item.location||'Lugar não informado'}</small>
          </div>
          <button type="button" className="checkpoint-notion-delete" aria-label={'Excluir '+activity(item)} title="Excluir checkpoint" disabled={saving===item.id} onClick={()=>setPendingDelete(item)}>×</button>
        </article>
      })}
    </div>
    {pendingDelete&&<div className="checkpoint-confirm-backdrop">
      <section className="checkpoint-confirm" role="alertdialog" aria-modal="true" aria-labelledby="checkpoint-confirm-title" aria-describedby="checkpoint-confirm-description">
        <div className="checkpoint-confirm-icon" aria-hidden="true">⌫</div>
        <button type="button" className="checkpoint-confirm-close" aria-label="Cancelar exclusão" onClick={()=>setPendingDelete(null)}>×</button>
        <h4 id="checkpoint-confirm-title">Apagar checkpoint?</h4>
        <p id="checkpoint-confirm-description">Você tem certeza que deseja apagar <strong>{activity(pendingDelete)}</strong>? O checkpoint sairá das próximas rondas e as inspeções anteriores continuarão no histórico.</p>
        <div className="checkpoint-confirm-actions">
          <button type="button" onClick={()=>setPendingDelete(null)}>Cancelar</button>
          <button type="button" className="checkpoint-confirm-delete" disabled={saving===pendingDelete.id} onClick={confirmDelete}>{saving===pendingDelete.id?'Apagando…':'Apagar'}</button>
        </div>
      </section>
    </div>}
  </section>
}
