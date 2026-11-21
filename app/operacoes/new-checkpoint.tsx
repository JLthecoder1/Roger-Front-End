'use client'
import {useState,type FormEvent} from 'react'
import {submitRound} from '../use-round'

export function NewCheckpoint({onSaved,onBack}:{onSaved:()=>void;onBack:()=>void}){
  const [position,setPosition]=useState({x:50,y:50})
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const data=new FormData(event.currentTarget)
    setSaving(true)
    setMessage('')
    try {
      await submitRound('/api/checkpoints',{name:data.get('name'),task:data.get('task'),...position})
      onSaved()
    } catch(error){setMessage(error instanceof Error?error.message:'Falha ao salvar.')}
    finally {setSaving(false)}
  }
  return <form className="checkpoint-form" onSubmit={save}>
    <label htmlFor="point-name">Nome do checkpoint</label><input id="point-name" name="name" required maxLength={80}/>
    <label htmlFor="point-task">Tarefa de inspeção</label><input id="point-task" name="task" required maxLength={160}/>
    <p>Clique no mapa para posicionar o checkpoint ou ajuste as coordenadas.</p>
    <div className="map-picker" onClick={event=>{
      const bounds=event.currentTarget.getBoundingClientRect()
      setPosition({x:Math.round((event.clientX-bounds.left)/bounds.width*100),y:Math.round((event.clientY-bounds.top)/bounds.height*100)})
    }}><img src="/perimetro.webp" alt="Mapa para posicionar o checkpoint"/><span className="marker pending" style={{left:position.x+'%',top:position.y+'%'}}>+</span></div>
    <div className="coordinates">{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()} (%)<input type="number" min={0} max={100} required value={position[axis]} onChange={e=>setPosition(previous=>({...previous,[axis]:Math.max(0,Math.min(100,Number(e.target.value)))}))}/></label>)}</div>
    {message&&<p role="alert">{message}</p>}
    <div className="actions"><button className="action" disabled={saving}>{saving?'Salvando…':'Salvar checkpoint'}</button><button type="button" className="action secondary" onClick={onBack}>Voltar</button></div>
  </form>
}
