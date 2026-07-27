import { ExternalLink, Gamepad2, Maximize2, ShieldCheck, Sparkles } from 'lucide-react'

const ARTICLE_ARCADE_URL = 'https://article-arcade-za96106rp-tutor-pro.vercel.app/'

export default function StudentGames({ learner }) {
  return (
    <div className="portal-view external-game-zone">
      <section className="external-game-zone__hero">
        <div>
          <span className="portal-kicker">English games</span>
          <h1>Article Arcade</h1>
          <p>
            Play the TutorPro Article Arcade in a focused game window. The previous installed games have been removed from this section.
          </p>
          <div className="external-game-zone__badges">
            <span><Gamepad2 size={14} /> Grammar practice</span>
            <span><Sparkles size={14} /> A / An articles</span>
            <span><ShieldCheck size={14} /> Opens securely</span>
          </div>
        </div>
        <a className="portal-primary-button" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">
          Open full screen <ExternalLink size={16} />
        </a>
      </section>

      <section className="portal-card external-game-zone__frame-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div>
            <span className="portal-kicker">Now playing</span>
            <h2>{learner?.name ? `${learner.name}'s Article Arcade` : 'Article Arcade'}</h2>
          </div>
          <a className="portal-text-button" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">
            Full screen <Maximize2 size={15} />
          </a>
        </div>
        <div className="external-game-zone__iframe-wrap">
          <iframe
            title="TutorPro Article Arcade"
            src={ARTICLE_ARCADE_URL}
            loading="lazy"
            allow="fullscreen; autoplay; clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>
    </div>
  )
}
