import { Router } from 'express'
const router = Router()
router.get('/', (req: any, res: any) => { res.json({ message: 'Resellers endpoint - to be implemented' }) })
export default router