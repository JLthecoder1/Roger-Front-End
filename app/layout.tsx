import './style.css'
export const metadata = {title: 'ROGER | Portaria', description: 'Painel de operações da portaria'}
export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
