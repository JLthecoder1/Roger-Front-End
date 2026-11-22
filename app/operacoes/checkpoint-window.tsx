'use client'

import {useEffect,useRef} from 'react'
import {useRound} from '../use-round'
import {CheckpointBoard} from './checkpoint-board'

export function CheckpointWindow({onClose}:{onClose:()=>void}){
  const modal=useRef<HTMLDialogElement>(null)
  const {round}=useRound()

  useEffect(()=>{
    const dialog=modal.current
    if(dialog&&!dialog.open) dialog.showModal()
  },[])

  return <dialog ref={modal} className="checkpoint-dialog" onClose={onClose} aria-labelledby="checkpoint-window-title">
    <div className="modal-head">
      <h2 id="checkpoint-window-title">Checkpoints</h2>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={()=>modal.current?.close()}>×</button>
    </div>
    <CheckpointBoard
      points={round.checkpoints}
      completed={new Set(round.checks.map(check=>check.id))}
    />
  </dialog>
}
