import { Router } from 'express'
const router = Router()
router.post('/', (req: any, res: any) => { res.json({ message: 'Payments endpoint - to be implemented' }) })
export default router