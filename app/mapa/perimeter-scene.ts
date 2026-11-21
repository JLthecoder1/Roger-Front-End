import * as THREE from 'three'

export const locations = [
  {name:'Portaria',x:-19,z:24,height:5,hitWidth:12,hitDepth:10},
  {name:'Galpão Norte',x:-17,z:-15,height:10,hitWidth:30,hitDepth:22},
  {name:'Docas',x:15,z:-4,height:7,hitWidth:31,hitDepth:24},
  {name:'Portão Lateral',x:36,z:15,height:4,hitWidth:14,hitDepth:15},
] as const

export function makePerimeter(){
  const scene=new THREE.Scene()
  scene.background=new THREE.Color('#090a0b')
  scene.fog=new THREE.Fog('#090a0b',145,265)
  const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.82})
  const ground=material('#222426')
  const asphalt=material('#151719')
  const walls=material('#4a4d4f')
  const roofs=material('#696d70')
  const trim=material('#909597')
  const metal=material('#2f3336')
  const glass=material('#191d20')
  const white=new THREE.MeshBasicMaterial({color:'#b7babc'})
  const lamps=new THREE.MeshBasicMaterial({color:'#e9e9e9'})
  const glow=new THREE.MeshBasicMaterial({color:'#b6b7b7',transparent:true,opacity:.10,depthWrite:false})
  function box(x:number,y:number,z:number,w:number,h:number,d:number,surface:THREE.Material){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),surface)
    mesh.position.set(x,y,z)
    mesh.receiveShadow=true
    mesh.castShadow=y>0
    scene.add(mesh)
    return mesh
  }
  function segment(ax:number,az:number,bx:number,bz:number,width:number,surface:THREE.Material,y=.05){
    const mesh=box((ax+bx)/2,y,(az+bz)/2,width,.035,Math.hypot(bx-ax,bz-az),surface)
    mesh.rotation.y=Math.atan2(bx-ax,bz-az)
    return mesh
  }
  function hall(x:number,z:number,w:number,d:number,h:number){
    box(x,h/2,z,w,h,d,walls)
    box(x,h+.22,z,w+.65,.44,d+.65,roofs)
    for(let rib=-w/2+1;rib<w/2;rib+=1.6) box(x+rib,h+.47,z,.065,.05,d,trim)
    for(const offset of [-w*.24,w*.24]){
      box(x+offset,h+.65,z,2,.42,3,metal)
      box(x+offset,h+.89,z,1.65,.07,2.6,trim)
    }
    box(x,h-.25,z+d/2+.12,w,.16,.22,trim)
  }
  function light(x:number,z:number,h:number){
    box(x,h/2,z,.13,h,.13,metal)
    box(x+.31,h,z,.75,.14,.3,lamps)
    const pool=new THREE.Mesh(new THREE.CircleGeometry(2.6,24),glow)
    pool.rotation.x=-Math.PI/2
    pool.position.set(x,.047,z)
    scene.add(pool)
  }

  box(0,-.7,0,84,1.32,63,ground)
  box(0,-.07,0,81,.13,60,asphalt)
  const grid=new THREE.GridHelper(220,44,'#35393c','#202326')
  grid.position.y=-1.4
  scene.add(grid)
  hall(-17,-15,27,18,7.4)
  hall(15,-13,29,19,6.9)
  for(const x of [7,15,23]){
    box(x,1.65,-3.35,4,3.3,.25,glass)
    box(x,3.22,-3.17,4,.10,.13,lamps)
    for(let y=.4;y<3;y+=.45) box(x,y,-3.19,3.75,.04,.05,trim)
    segment(x-2.6,-3.1,x-2.6,3,.12,white)
    segment(x+2.6,-3.1,x+2.6,3,.12,white)
  }
  box(15,3.65,-2.8,25,.32,2,metal)
  hall(-19,24,8,5,3)
  box(-19,1.95,26.6,6,1.2,.14,glass)
  box(-19,2.62,26.72,5.4,.08,.10,lamps)
  box(-12,1.0,27,.35,2,.35,metal)
  box(-8.5,1.2,27,7,.12,.16,trim)
  box(36,1,12,.55,2,.55,metal)
  box(36,1,19,.55,2,.55,metal)
  box(36,1.25,15.5,.13,.14,7,trim)

  for(const z of [-30,30]){
    const intervals=z===30?[[-41,-11],[-3,41]]:[[-41,41]]
    for(const [a,b] of intervals){
      box((a+b)/2,.8,z,b-a,1.6,.17,metal)
      box((a+b)/2,1.62,z,b-a,.08,.23,trim)
      for(let x=a;x<=b;x+=4) box(x,1,z,.15,2,.15,trim)
    }
  }
  for(const x of [-41,41]){
    const intervals=x===41?[[-30,11],[19,30]]:[[-30,30]]
    for(const [a,b] of intervals){
      box(x,.78,(a+b)/2,.16,1.56,b-a,metal)
      box(x,1.59,(a+b)/2,.22,.07,b-a,trim)
    }
  }
  for(let z=3;z<26;z+=4) segment(-7,z,-7,z+1.8,.13,white)
  for(let x=-34;x<36;x+=4) segment(x,8,x+1.8,8,.13,white)
  for(let x=-35;x<-13;x+=4) segment(x,13,x,18,.12,white)
  for(const [x,z] of [[-33,-25],[-32,6],[-26,23],[-3,25],[33,5],[34,24],[32,-23]]) light(x,z,4.9)
  const ambient=new THREE.HemisphereLight('#f1f1f1','#373737',2.25)
  scene.add(ambient)
  const key=new THREE.DirectionalLight('#ffffff',2.65)
  key.position.set(-42,70,33)
  key.castShadow=true
  key.shadow.mapSize.set(1024,1024)
  Object.assign(key.shadow.camera,{left:-64,right:64,top:64,bottom:-64,far:155})
  key.shadow.normalBias=.07
  scene.add(key)
  const locationHitboxes=locations.map((location,index)=>{
    const hitbox=new THREE.Mesh(
      new THREE.BoxGeometry(location.hitWidth,Math.max(5,location.height),location.hitDepth),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
    )
    hitbox.position.set(location.x,Math.max(2.5,location.height/2),location.z)
    hitbox.userData.locationIndex=index
    scene.add(hitbox)
    return hitbox
  })
  return {scene,locationHitboxes}
}
