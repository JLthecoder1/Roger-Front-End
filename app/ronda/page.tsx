'use client'

import {useEffect, useState} from 'react'
import {submitRound, useRound} from '../use-round'

type Panel = 'start' | 'checkpoints' | 'voice' | 'emergency' | 'finish' | null
type SpeechResult = {results: {[index: number]: {[index: number]: {transcript: string}}}}
type SpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: (event: SpeechResult) => void
  onerror: () => void
  onend: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognition

const icons = {
  shield: <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />,
  play: <path d="m7 4 13 8-13 8V4Z" />,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  flag: <><path d="M4 22V4" /><path d="M4 4c7-5 9 5 16 0v12c-7 5-9-5-16 0" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0m-7 7v5m-4 0h8" /></>,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  check: <path d="m5 12 4 4L19 6" />,
}

function Icon({name, size = 27}: {name: keyof typeof icons; size?: number}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function Ronda() {
  const {round, connected} = useRound()
  const [officer, setOfficer] = useState('')
  const [officerInput, setOfficerInput] = useState('')
  const [saving, setSaving] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('')

  useEffect(() => {
    if (!started) return
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started])

  const completed = round.checkpoints.filter(point =>
    submitted.includes(point.id) || round.checks.some(check => check.id === point.id)
  ).length
  const formatElapsed = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

  async function conclude(id: string) {
    setSaving(id)
    setMessage('')
    try {
      await submitRound('/api/checks', {id, officer})
      setSubmitted(previous => previous.includes(id) ? previous : [...previous, id])
      setMessage('Inspeção registrada e enviada à portaria.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao enviar.')
    } finally {
      setSaving('')
    }
  }

  function startVoiceInput() {
    const voiceWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceMessage('O reconhecimento de voz não é compatível com este navegador.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = event => {
      setTranscript(event.results[0][0].transcript)
      setVoiceMessage('Transcrição pronta. A integração com o agente de voz ainda será conectada.')
    }
    recognition.onerror = () => setVoiceMessage('Não foi possível acessar o microfone. Tente novamente.')
    recognition.onend = () => setIsListening(false)
    setVoiceMessage('')
    setTranscript('')
    setIsListening(true)
    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setVoiceMessage('Não foi possível iniciar o microfone. Tente novamente.')
    }
  }

  return <main className="guard-app">
    <header className="guard-header">
      <div className="guard-brand"><img className="guard-brand-logo" src="/roger-logo.png" alt="ROGER — seu parceiro da segurança" /><span>/</span><span>Rondante</span></div>
      <a className="guard-exit" href="/operacoes/" aria-label="Abrir painel da portaria">Portaria</a>
    </header>

    <section className="guard-content" aria-labelledby="round-title">
      <div className="guard-heading">
        <p className="guard-eyebrow">RONDA DE SEGURANÇA</p>
        <h1 id="round-title">{started ? 'Ronda em andamento' : finished ? 'Ronda finalizada' : 'Ronda não iniciada'}</h1>
        <div className="guard-status">
          <span className={`guard-status-dot${connected ? ' is-online' : ''}`} />
          {connected ? 'Conectado à portaria' : 'Aguardando conexão'}
          {started && <span className="guard-elapsed">{formatElapsed(elapsed)}</span>}
        </div>
        {started && <p className="guard-progress">{completed} de {round.checkpoints.length} checkpoints concluídos</p>}
      </div>

      <div className="guard-actions" aria-label="Ações da ronda">
        <button className="guard-action guard-action-primary" type="button" onClick={() => setPanel('start')} disabled={started || finished}>
          <Icon name={started ? 'check' : 'play'} /><span>{started ? 'Ronda em andamento' : 'Iniciar ronda'}</span>
        </button>
        <button className="guard-action guard-action-neutral" type="button" onClick={() => setPanel('checkpoints')}>
          <Icon name="pin" /><span>Ver checkpoints</span>
        </button>
        <button className="guard-action guard-action-emergency" type="button" onClick={() => setPanel('emergency')}>
          <Icon name="alert" /><span>Emergência</span>
        </button>
        <button className="guard-action guard-action-neutral" type="button" onClick={() => setPanel('finish')} disabled={!started}>
          <Icon name="flag" /><span>Finalizar ronda</span>
        </button>
        <button className="guard-action guard-action-neutral" type="button" onClick={() => {setPanel('voice');setVoiceMessage('');setTranscript('')}}>
          <Icon name="mic" /><span>Falar</span>
        </button>
      </div>
    </section>

    {panel && <div className="guard-overlay" onMouseDown={event => {if (event.target === event.currentTarget) setPanel(null)}}>
      <section className="guard-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="guard-sheet-heading">
          <div>
            <p className="guard-eyebrow">ROGER / RONDANTE</p>
            <h2 id="sheet-title">
              {panel === 'start' ? 'Iniciar ronda' : panel === 'checkpoints' ? 'Seus checkpoints' : panel === 'voice' ? 'Falar com o ROGER' : panel === 'emergency' ? 'Emergência' : 'Finalizar ronda'}
            </h2>
          </div>
          <button className="guard-close" type="button" onClick={() => setPanel(null)} aria-label="Fechar"><Icon name="close" size={22} /></button>
        </div>

        {panel === 'start' && <form className="guard-form" onSubmit={event => {
          event.preventDefault()
          if (!officerInput.trim()) return
          setOfficer(officerInput.trim())
          setStarted(true)
          setFinished(false)
          setElapsed(0)
          setPanel(null)
        }}>
          <p>Informe seu nome para registrar as inspeções e avisar a portaria.</p>
          <label htmlFor="guard-officer">Nome do rondista</label>
          <input id="guard-officer" autoComplete="name" maxLength={80} required value={officerInput} onChange={event => setOfficerInput(event.target.value)} />
          <button className="guard-submit" type="submit"><Icon name="play" size={20} /> Começar ronda</button>
        </form>}

        {panel === 'checkpoints' && <>
          <p className="guard-sheet-copy">Confira os pontos e as tarefas desta rota.</p>
          <ul className="guard-checkpoints">{round.checkpoints.map((point, index) => {
            const done = submitted.includes(point.id) || round.checks.some(check => check.id === point.id)
            return <li key={point.id}>
              <span className={`guard-point-number${done ? ' is-done' : ''}`}>{done ? <Icon name="check" size={17} /> : String(index + 1).padStart(2, '0')}</span>
              <div className="guard-point-info"><small>{point.id}</small><strong>{point.name}</strong><span>{point.task}</span></div>
              <button type="button" className={`guard-point-button${done ? ' is-done' : ''}`} disabled={done || !started || !officer || !connected || Boolean(saving)} onClick={() => conclude(point.id)}>
                {done ? 'Concluído' : saving === point.id ? 'Salvando…' : 'Registrar'}
              </button>
            </li>
          })}</ul>
          {!started && <p className="guard-inline-note">Inicie a ronda para registrar uma inspeção.</p>}
          {started && !connected && <p className="guard-inline-note">Sem conexão com a portaria. Tente novamente quando estiver online.</p>}
          {message && <p className="guard-feedback" role="status">{message}</p>}
        </>}

        {panel === 'voice' && <div className="guard-voice">
          <p>Relate a inspeção por voz. A transcrição poderá ser revisada aqui.</p>
          <button className={`guard-mic${isListening ? ' is-listening' : ''}`} type="button" onClick={isListening ? undefined : startVoiceInput} disabled={isListening}>
            <Icon name="mic" size={25} />{isListening ? 'Ouvindo…' : 'Começar a falar'}
          </button>
          {transcript && <blockquote>{transcript}</blockquote>}
          {voiceMessage && <p className="guard-inline-note" role="status">{voiceMessage}</p>}
        </div>}

        {panel === 'emergency' && <div className="guard-voice">
          <div className="guard-emergency-notice"><Icon name="alert" size={24} /><p>O envio de alertas de emergência à portaria ainda não está conectado.</p></div>
          <button className="guard-submit guard-submit-secondary" type="button" onClick={() => setPanel(null)}>Entendi</button>
        </div>}

        {panel === 'finish' && <div className="guard-form">
          <p>Deseja encerrar a ronda de {officer || 'rondista'}? {completed} de {round.checkpoints.length} checkpoints concluídos.</p>
          <div className="guard-sheet-actions">
            <button className="guard-submit guard-submit-secondary" type="button" onClick={() => setPanel(null)}>Continuar ronda</button>
            <button className="guard-submit" type="button" onClick={() => {setStarted(false);setFinished(true);setPanel(null)}}>Finalizar ronda</button>
          </div>
        </div>}
      </section>
    </div>}
  </main>
}
