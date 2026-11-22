'use client'

import {Access} from '../lib/access'
import {VoiceButton} from '../lib/voice'
import {api} from '../api-client'
import {RoundPanel} from '../operacoes/round-panel'

export default function Ronda(){
 return <main className="ronda-page">
  <a href="/operacoes/">Mapa do perímetro</a>
  <Access api={api}/>
  <RoundPanel/>
  <VoiceButton api={api} className="action secondary"/>
 </main>
}
