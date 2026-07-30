import { useEffect } from 'react'

// Trava o scroll do body enquanto qualquer modal estiver aberto.
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    document.body.style.overflow = isLocked ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [isLocked])
}
