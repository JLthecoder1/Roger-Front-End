export type Checkpoint = {id:string; name:string; task:string; x:number; y:number; location?:string}
export type Check = {id:string; officer:string; created_at:string}
export type CheckpointTask = {id:string; checkpoint_id:string; parent_id:string|null; title:string; done:0|1}
export type Round = {checkpoints:Checkpoint[]; checks:Check[]; tasks:CheckpointTask[]}
export const initialPoints: Checkpoint[] = [
 {id:'CP-01',name:'Estacionamento Sul',task:'Verificar o perímetro',x:20,y:76,location:'Portaria'},
 {id:'CP-02',name:'Galpão logístico',task:'Conferir a entrada lateral',x:46,y:23,location:'Galpão Norte'},
 {id:'CP-03',name:'Doca',task:'Conferir o portão',x:81,y:29,location:'Docas'},
 {id:'CP-04',name:'Portaria',task:'Verificar o registro de acesso',x:11,y:51,location:'Portaria'},
 {id:'CP-05',name:'Subestação',task:'Verificar o fechamento do acesso',x:84,y:80,location:'Portão Lateral'},
 {id:'CP-06',name:'Data center',task:'Conferir a porta de acesso',x:48,y:86,location:'Galpão Norte'}
]
export const initialRound:Round = {checkpoints:initialPoints, checks:[], tasks:[]}
