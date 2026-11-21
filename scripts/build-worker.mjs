import {readdir,readFile,mkdir} from 'node:fs/promises'
import {extname,join} from 'node:path'
import {build} from 'esbuild'

const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.txt':'text/plain; charset=utf-8'}
const assets = {}
for (const file of await readdir('dist',{recursive:true})) {
  const type = types[extname(file)]
  if (type) assets['/'+file] = [type,(await readFile(join('dist',file))).toString('base64')]
}
await mkdir('dist/server',{recursive:true})
await build({
  entryPoints:['worker/index.mjs'],
  outfile:'dist/server/index.js',
  bundle:true,
  format:'esm',
  plugins:[{name:'next-static-assets',setup(builder){
    builder.onResolve({filter:/^\.\/assets\.mjs$/},()=>({path:'assets',namespace:'generated'}))
    builder.onLoad({filter:/.*/,namespace:'generated'},()=>({contents:'export const assets = '+JSON.stringify(assets)}))
  }}]
})
