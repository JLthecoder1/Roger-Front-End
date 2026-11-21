import {initialPoints} from '../app/round.ts'
import {assets} from './assets.mjs'

const json = (data, status = 200) => Response.json(data, {status,headers:{'Cache-Control':'no-store'}})
const validText = (value,max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max

async function checkpointExists(db, id) {
  const deleted=await db.prepare('SELECT id FROM deleted_checkpoints WHERE id = ?').bind(id).first()
  if (deleted) return false
  return initialPoints.some(point=>point.id===id) ||
    Boolean(await db.prepare('SELECT id FROM checkpoints WHERE id = ?').bind(id).first())
}

async function round(request, db, path) {
  if (request.method === 'GET' && path === '/api/round') {
    const [points, deleted, checks, tasks] = await db.batch([
      db.prepare('SELECT * FROM checkpoints ORDER BY rowid'),
      db.prepare('SELECT id FROM deleted_checkpoints'),
      db.prepare('SELECT * FROM checks ORDER BY created_at DESC, rowid DESC'),
      db.prepare('SELECT * FROM checkpoint_tasks ORDER BY rowid')
    ])
    const deletedIds=new Set(deleted.results.map(item=>item.id))
    return json({checkpoints:[...initialPoints,...points.results].filter(point=>!deletedIds.has(point.id)),checks:checks.results.filter(check=>!deletedIds.has(check.id)),tasks:tasks.results.filter(task=>!deletedIds.has(task.checkpoint_id))})
  }
  if (request.method !== 'POST') return json({error:'Rota indisponível.'},405)
  const body = await request.json().catch(()=>null)
  if (!body) return json({error:'Dados inválidos.'},400)
  if (path === '/api/checkpoints') {
    const {name,task,x,y,location} = body
    if (!validText(name,80)||!validText(task,160)||!validText(location,80)||![x,y].every(value=>Number.isFinite(value)&&value>=0&&value<=100)) {
      return json({error:'Informe nome, tarefa e posição no mapa.'},400)
    }
    const id = 'CP-' + crypto.randomUUID().slice(0,8).toUpperCase()
    await db.prepare('INSERT INTO checkpoints (id, name, task, x, y, location) VALUES (?, ?, ?, ?, ?, ?)').bind(id,name.trim(),task.trim(),x,y,location.trim()).run()
    return json({id},201)
  }
  if (path === '/api/checkpoints/status') {
    const {id,done}=body
    if (!validText(id,20)||typeof done!=='boolean') return json({error:'Status inválido.'},400)
    if (!await checkpointExists(db,id)) return json({error:'Checkpoint não encontrado.'},404)
    if (done) await db.prepare('INSERT INTO checks VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(id,'Operador',new Date().toISOString()).run()
    else await db.prepare('DELETE FROM checks WHERE id = ?').bind(id).run()
    return json({id,done})
  }
  if (path === '/api/checkpoints/delete') {
    const {id}=body
    if (!validText(id,20)) return json({error:'Checkpoint inválido.'},400)
    if (!await checkpointExists(db,id)) return json({error:'Checkpoint não encontrado.'},404)
    if (initialPoints.some(point=>point.id===id)) await db.prepare('INSERT INTO deleted_checkpoints (id) VALUES (?) ON CONFLICT(id) DO NOTHING').bind(id).run()
    else await db.prepare('DELETE FROM checkpoints WHERE id = ?').bind(id).run()
    await db.batch([
      db.prepare('DELETE FROM checks WHERE id = ?').bind(id),
      db.prepare('DELETE FROM checkpoint_tasks WHERE checkpoint_id = ?').bind(id)
    ])
    return json({id})
  }
  if (path === '/api/checks') {
    const {id,officer} = body
    if (!validText(id,20)||!validText(officer,80)) return json({error:'Informe o checkpoint e o nome do rondista.'},400)
    if (!await checkpointExists(db,id)) {
      return json({error:'Checkpoint não encontrado.'},404)
    }
    await db.prepare('INSERT INTO checks VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(id,officer.trim(),new Date().toISOString()).run()
    return json({id},201)
  }
  if (path === '/api/checkpoint-tasks') {
    const {checkpointId,parentId=null,title} = body
    if (!validText(checkpointId,20) || !validText(title,160) || (parentId!==null && !validText(parentId,36))) {
      return json({error:'Informe um título válido para a tarefa.'},400)
    }
    if (!await checkpointExists(db,checkpointId)) return json({error:'Checkpoint não encontrado.'},404)
    if (parentId!==null) {
      const parent=await db.prepare('SELECT id FROM checkpoint_tasks WHERE id = ? AND checkpoint_id = ? AND parent_id IS NULL').bind(parentId,checkpointId).first()
      if (!parent) return json({error:'Tarefa principal inválida para este checkpoint.'},400)
    }
    const id=crypto.randomUUID()
    await db.prepare('INSERT INTO checkpoint_tasks (id, checkpoint_id, parent_id, title) VALUES (?, ?, ?, ?)').bind(id,checkpointId,parentId,title.trim()).run()
    return json({id},201)
  }
  if (path === '/api/checkpoint-tasks/status') {
    const {id,done}=body
    if (!validText(id,36) || typeof done!=='boolean') return json({error:'Status inválido.'},400)
    const result=await db.prepare('UPDATE checkpoint_tasks SET done = ? WHERE id = ?').bind(Number(done),id).run()
    if (result.meta.changes===0) return json({error:'Tarefa não encontrada.'},404)
    return json({id})
  }
  return json({error:'Rota inexistente.'},404)
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/'
    if (path.startsWith('/api/')) {
      try { return await round(request,env.DB,path) }
      catch (error) { console.error(error); return json({error:'Dados da ronda indisponíveis.'},503) }
    }
    const asset = assets[path] ?? assets[path.replace(/\/?$/, '/index.html')]
    if (!asset) return new Response('Página inexistente.',{status:404})
    return new Response(Uint8Array.from(atob(asset[1]),char=>char.charCodeAt(0)),{headers:{'Content-Type':asset[0],'Cache-Control':path.startsWith('/_next/')?'public, max-age=31536000, immutable':'no-cache'}})
  }
}
