import {createApi} from './lib/roger-api'
export const api=createApi(process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000','painel')
