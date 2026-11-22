'use client'
import {useState,type FormEvent} from 'react'
import type {CheckpointTask} from '../round'
import {submitRound} from '../use-round'

function TaskForm({checkpointId,parentId,label}:{checkpointId:string;parentId?:string;label:string}){
 const [title,setTitle]=useState('')
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 async function save(event:FormEvent){
  event.preventDefault()
  setSaving(true)
  setError('')
  try{await submitRound('/api/checkpoint-tasks',{checkpointId,parentId,title});setTitle('')}
  catch(error){setError(error instanceof Error?error.message:'Falha ao salvar.')}
  finally{setSaving(false)}
 }
 return <form className="task-form" onSubmit={save}>
  <input aria-label={label} placeholder={label} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} required/>
  <button type="submit" className="action secondary" disabled={saving||!title.trim()}>Adicionar</button>
  {error&&<p role="alert">{error}</p>}
 </form>
}

export function CheckpointTasks({id,tasks}:{id:string;tasks:CheckpointTask[]}){
 const [error,setError]=useState('')
 const [saving,setSaving]=useState<string|null>(null)
 async function toggle(task:CheckpointTask){
  setSaving(task.id)
  setError('')
  try{await submitRound('/api/checkpoint-tasks/status',{id:task.id,done:!task.done})}
  catch(error){setError(error instanceof Error?error.message:'Falha ao salvar.')}
  finally{setSaving(null)}
 }
 async function remove(task:CheckpointTask){
  if(!window.confirm('Remover esta tarefa e suas subtarefas da ronda?'))return
  setSaving(task.id)
  setError('')
  try{await submitRound('/api/checkpoint-tasks/delete',{id:task.id})}
  catch(error){setError(error instanceof Error?error.message:'Falha ao remover.')}
  finally{setSaving(null)}
 }
 function row(task:CheckpointTask){
  return <div><label className="task-check"><input type="checkbox" checked={Boolean(task.done)} disabled={saving!==null} onChange={()=>toggle(task)}/><span>{task.title}</span></label> <button type="button" className="action secondary" disabled={saving!==null} aria-label={`Apagar ${task.title}`} onClick={()=>remove(task)}>Apagar</button></div>
 }
 return <details className="checkpoint-task-details">
  <summary>Tarefas e subtarefas</summary>
  {error&&<p role="alert">{error}</p>}
  <ul className="task-list">{tasks.filter(task=>task.parent_id===null).map(task=><li key={task.id}>
   {row(task)}
   <ul className="task-list">{tasks.filter(child=>child.parent_id===task.id).map(child=><li key={child.id}>{row(child)}</li>)}</ul>
   <TaskForm checkpointId={id} parentId={task.id} label="Nova subtarefa"/>
  </li>)}</ul>
  <TaskForm checkpointId={id} label="Nova tarefa"/>
 </details>
}
