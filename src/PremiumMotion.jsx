import { useEffect, useRef } from 'react'

const surfaceSelector = [
  '.benefit',
  '.programme-card',
  '.price-card',
  '.public-teacher-card',
  '.game-card',
  '.portal-stat-grid article',
  '.admin-action-card',
  '.admin-health-card',
  '.learning-focus-card',
  '.upcoming-card',
  '.teacher-profile-snapshot',
].join(',')

const magneticSelector = [
  '.button',
  '.portal-primary-button',
  '.portal-secondary-button',
  '.header-portal-link',
  '.account-link--trigger',
  '.tutorpro-classroom-link',
].join(',')

const headingSelector = [
  '.section-heading h2',
  '.curriculum-showcase__heading h2',
  '.programmes__intro h2',
  '.portal-page-heading h1',
  '.student-welcome h1',
  '.teacher-welcome h1',
  '.admin-welcome h1',
].join(',')

export default function PremiumMotion() {
  const progressRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const attachedSurfaces = new Set()
    const attachedButtons = new Set()
    const observedHeadings = new Set()
    let pointerFrame = 0
    let scrollFrame = 0

    const headingObserver = reducedMotion || !('IntersectionObserver' in window)
      ? null
      : new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('premium-heading--visible')
            headingObserver.unobserve(entry.target)
          })
        }, { threshold: 0.3 })

    const attachHeading = (heading) => {
      if (observedHeadings.has(heading)) return
      observedHeadings.add(heading)
      heading.classList.add('premium-heading')
      if (headingObserver) headingObserver.observe(heading)
      else heading.classList.add('premium-heading--visible')
    }

    const attachSurface = (surface) => {
      if (attachedSurfaces.has(surface)) return
      attachedSurfaces.add(surface)
      surface.classList.add('premium-surface')
      if (reducedMotion || coarsePointer) return

      const move = (event) => {
        const bounds = surface.getBoundingClientRect()
        const x = (event.clientX - bounds.left) / bounds.width
        const y = (event.clientY - bounds.top) / bounds.height
        surface.style.setProperty('--premium-rotate-y', `${(x - 0.5) * 5.5}deg`)
        surface.style.setProperty('--premium-rotate-x', `${(0.5 - y) * 5.5}deg`)
        surface.style.setProperty('--premium-glow-x', `${x * 100}%`)
        surface.style.setProperty('--premium-glow-y', `${y * 100}%`)
      }
      const leave = () => {
        surface.style.setProperty('--premium-rotate-y', '0deg')
        surface.style.setProperty('--premium-rotate-x', '0deg')
      }
      surface.addEventListener('pointermove', move)
      surface.addEventListener('pointerleave', leave)
      surface._tutorproMotionCleanup = () => {
        surface.removeEventListener('pointermove', move)
        surface.removeEventListener('pointerleave', leave)
      }
    }

    const attachButton = (button) => {
      if (attachedButtons.has(button)) return
      attachedButtons.add(button)
      button.classList.add('premium-magnetic')
      if (reducedMotion || coarsePointer) return

      const move = (event) => {
        const bounds = button.getBoundingClientRect()
        button.style.setProperty('--magnetic-x', `${(event.clientX - (bounds.left + (bounds.width / 2))) * 0.13}px`)
        button.style.setProperty('--magnetic-y', `${(event.clientY - (bounds.top + (bounds.height / 2))) * 0.16}px`)
      }
      const leave = () => {
        button.style.setProperty('--magnetic-x', '0px')
        button.style.setProperty('--magnetic-y', '0px')
      }
      button.addEventListener('pointermove', move)
      button.addEventListener('pointerleave', leave)
      button._tutorproMagneticCleanup = () => {
        button.removeEventListener('pointermove', move)
        button.removeEventListener('pointerleave', leave)
      }
    }

    const scan = (root = document) => {
      root.querySelectorAll?.(surfaceSelector).forEach(attachSurface)
      root.querySelectorAll?.(magneticSelector).forEach(attachButton)
      root.querySelectorAll?.(headingSelector).forEach(attachHeading)
    }

    const updateScroll = () => {
      scrollFrame = 0
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const ratio = Math.min(1, Math.max(0, window.scrollY / maximum))
      progressRef.current?.style.setProperty('--premium-progress', ratio)
      document.documentElement.style.setProperty('--premium-scroll', `${window.scrollY}px`)
      document.documentElement.style.setProperty('--premium-scroll-ratio', ratio)
    }

    const onScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll)
    }

    const onPointerMove = (event) => {
      if (reducedMotion || coarsePointer || pointerFrame) return
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0
        glowRef.current?.style.setProperty('--pointer-x', `${event.clientX}px`)
        glowRef.current?.style.setProperty('--pointer-y', `${event.clientY}px`)
      })
    }

    scan()
    updateScroll()
    const mutationObserver = new MutationObserver((entries) => {
      entries.forEach((entry) => entry.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.(surfaceSelector)) attachSurface(node)
          if (node.matches?.(magneticSelector)) attachButton(node)
          if (node.matches?.(headingSelector)) attachHeading(node)
          scan(node)
        }
      }))
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    return () => {
      mutationObserver.disconnect()
      headingObserver?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      attachedSurfaces.forEach((surface) => surface._tutorproMotionCleanup?.())
      attachedButtons.forEach((button) => button._tutorproMagneticCleanup?.())
    }
  }, [])

  return (
    <div className="premium-motion-layer" aria-hidden="true">
      <div className="premium-scroll-progress" ref={progressRef}><i /></div>
      <div className="premium-pointer-glow" ref={glowRef} />
      <div className="premium-ambient-orb premium-ambient-orb--one" />
      <div className="premium-ambient-orb premium-ambient-orb--two" />
    </div>
  )
}
