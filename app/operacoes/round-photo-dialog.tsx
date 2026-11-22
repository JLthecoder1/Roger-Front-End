'use client'

import {useEffect,useRef,useState} from 'react'
import {api} from '../api-client'
import type {RoundPhoto} from '../round'

export function RoundPhotoDialog({photo,onClose}:{photo:RoundPhoto;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 const [image,setImage]=useState('')
 const [error,setError]=useState('')
 useEffect(()=>{
  const element=dialog.current
  const request=new AbortController()
  element?.showModal()
  void api.request<{jpeg:string}>('/api/round-photos/'+photo.id,{signal:request.signal})
   .then(({jpeg})=>{if(!request.signal.aborted)setImage('data:image/jpeg;base64,'+jpeg)})
   .catch(()=>{if(!request.signal.aborted)setError('Não foi possível carregar a foto.')})
  return ()=>{request.abort();element?.close()}
 },[photo.id])
 return <dialog ref={dialog} className="round-photo-dialog" aria-labelledby="round-photo-title" onCancel={event=>{event.preventDefault();onClose()}}>
  <header>
   <div><h2 id="round-photo-title">Foto da ronda</h2><p>{photo.officer} · {new Date(photo.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p></div>
   <button type="button" onClick={onClose} autoFocus>Fechar</button>
  </header>
  {image?<img src={image} alt={'Registro fotográfico de '+photo.officer}/>:<p role="status">{error||'Carregando foto…'}</p>}
 </dialog>
}
