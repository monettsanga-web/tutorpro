import { ExternalLink, Gamepad2, Maximize2, ShieldCheck, Sparkles } from 'lucide-react'

const ARTICLE_ARCADE_URL = 'https://article-arcade-za96106rp-tutor-pro.vercel.app/'
const ARTICLE_ARCADE_COVER = `${import.meta.env.BASE_URL}assets/article-arcade-cover-hd.png`

export default function StudentGames({ learner }) {
  return (
    <div className="portal-view external-game-zone">
      <section className="external-game-zone__hero external-game-zone__hero--with-cover">
        <div>
          <span className="portal-kicker">English games</span>
          <h1>Article Arcade</h1>
          <p>
            Play the TutorPro Article Arcade directly inside the student dashboard frame. The previous installed games have been removed from this section.
          </p>
          <div className="external-game-zone__badges">
            <span><Gamepad2 size={14} /> Grammar practice</span>
            <span><Sparkles size={14} /> A / An articles</span>
            <span><ShieldCheck size={14} /> Dashboard game frame</span>
          </div>
          <a className="portal-primary-button external-game-zone__mobile-open" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">
            Open full screen <ExternalLink size={16} />
          </a>
        </div>
        <div className="external-game-zone__cover-card">
          <img src={ARTICLE_ARCADE_COVER} alt="The Article Arcade game cover" />
        </div>
      </section>

      <section className="portal-card external-game-zone__frame-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div>
            <span className="portal-kicker">Now playing</span>
            <h2>{learner?.name ? `${learner.name}'s Article Arcade` : 'Article Arcade'}</h2>
            <p className="external-game-zone__frame-note">The game loads below so students can play without leaving the dashboard.</p>
          </div>
          <a className="portal-text-button" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">
            Full screen <Maximize2 size={15} />
          </a>
        </div>
        <div className="external-game-zone__iframe-wrap">
          <iframe
            title="TutorPro Article Arcade"
            src={ARTICLE_ARCADE_URL}
            loading="eager"
            allow="fullscreen; autoplay; clipboard-read; clipboard-write; gamepad"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>
    </div>
  )
}
