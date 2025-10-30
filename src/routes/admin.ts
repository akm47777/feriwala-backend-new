import { Router } from 'express'
const router = Router()
router.get('/', (req: any, res: any) => { res.json({ message: 'Admin endpoint - to be implemented' }) })
export default router