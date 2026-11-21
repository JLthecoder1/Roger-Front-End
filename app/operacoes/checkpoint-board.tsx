'use client'

import {useEffect,useState,type FormEvent} from 'react'
import type {Checkpoint} from '../round'
import {submitRound} from '../use-round'
import {locations} from '../mapa/perimeter-scene'

export function CheckpointBoard({points,completed,notice}:{points:Checkpoint[];completed:Set<string>;notice:string}){
  const [items,setItems]=useState(points)
  const [doneIds,setDoneIds]=useState(completed)
  const [title,setTitle]=useState('')
  const [task,setTask]=useState('')
  const [location,setLocation]=useState<string>(locations[0].name)
  const [saving,setSaving]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [pendingDelete,setPendingDelete]=useState<Checkpoint|null>(null)

  useEffect(()=>setItems(points),[points])
  useEffect(()=>setDoneIds(new Set(completed)),[completed])

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const name=title.trim()
    const taskTitle=task.trim()||'Inspeção programada'
    if(!name||saving) return
    setSaving('new')
    setError('')
    try {
      const result=await submitRound('/api/checkpoints',{name,task:taskTitle,x:50,y:50,location}) as {id:string}
      setItems(current=>[...current,{id:result.id,name,task:taskTitle,x:50,y:50,location}])
      setTitle('')
      setTask('')
    } catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível criar o checkpoint.')}
    finally {setSaving(null)}
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
    <header className="checkpoint-notion-header">
      <div><span>ROTA DE RONDA</span><h3>Checkpoints</h3></div>
      <p>{doneIds.size}/{items.length} concluídos</p>
    </header>
    {notice&&<p className="checkpoint-notion-notice" role="status">{notice}</p>}
    <form className="checkpoint-notion-composer" onSubmit={create}>
      <span aria-hidden="true">+</span>
      <input aria-label="Nome do novo checkpoint" placeholder="Novo checkpoint" maxLength={80} value={title} onChange={event=>setTitle(event.target.value)}/>
      <input className="checkpoint-notion-task-input" aria-label="Tarefa atribuída" placeholder="Tarefa atribuída" maxLength={160} value={task} onChange={event=>setTask(event.target.value)}/>
      <select aria-label="Local do mapa" value={location} onChange={event=>setLocation(event.target.value)}>{locations.map(item=><option key={item.name}>{item.name}</option>)}</select>
      <button type="submit" disabled={!title.trim()||Boolean(saving)}>{saving==='new'?'Criando…':'Criar'}</button>
    </form>
    {error&&<p className="checkpoint-notion-error" role="alert">{error}</p>}
    <div className="checkpoint-notion-list">
      {items.map(item=>{
        const done=doneIds.has(item.id)
        return <article className={'checkpoint-notion-item'+(done?' is-done':'')} key={item.id}>
          <span className="checkpoint-tree-toggle" aria-hidden="true">⌄</span>
          <input type="checkbox" aria-label={'Concluir '+item.name} checked={done} disabled={saving===item.id} onChange={()=>toggle(item)}/>
          <span className="checkpoint-notion-document" aria-hidden="true">□</span>
          <div><strong>{item.name}</strong><small>{item.location?item.location+' · ':''}{item.task}</small></div>
          <button type="button" className="checkpoint-notion-delete" aria-label={'Excluir '+item.name} title="Excluir checkpoint" disabled={saving===item.id} onClick={()=>setPendingDelete(item)}>×</button>
        </article>
      })}
    </div>
    {pendingDelete&&<div className="checkpoint-confirm-backdrop">
      <section className="checkpoint-confirm" role="alertdialog" aria-modal="true" aria-labelledby="checkpoint-confirm-title" aria-describedby="checkpoint-confirm-description">
        <div className="checkpoint-confirm-icon" aria-hidden="true">⌫</div>
        <button type="button" className="checkpoint-confirm-close" aria-label="Cancelar exclusão" onClick={()=>setPendingDelete(null)}>×</button>
        <h4 id="checkpoint-confirm-title">Apagar checkpoint?</h4>
        <p id="checkpoint-confirm-description">Você tem certeza que deseja apagar <strong>{pendingDelete.name}</strong>? Esta ação não pode ser desfeita.</p>
        <div className="checkpoint-confirm-actions">
          <button type="button" onClick={()=>setPendingDelete(null)}>Cancelar</button>
          <button type="button" className="checkpoint-confirm-delete" disabled={saving===pendingDelete.id} onClick={confirmDelete}>{saving===pendingDelete.id?'Apagando…':'Apagar'}</button>
        </div>
      </section>
    </div>}
  </section>
}
