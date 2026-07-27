import { ExternalLink, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react'

const ARTICLE_ARCADE_URL = 'https://article-arcade-za96106rp-tutor-pro.vercel.app/'
const ARTICLE_ARCADE_COVER = `${import.meta.env.BASE_URL}assets/article-arcade-cover-hd.png`

export default function StudentGames({ learner }) {
  return (
    <div className="portal-view external-game-zone external-game-zone--launcher-only">
      <section className="external-game-zone__hero external-game-zone__hero--with-cover">
        <div>
          <span className="portal-kicker">English games</span>
          <h1>Article Arcade</h1>
          <p>
            Practice “a” and “an” in a fast, kid-friendly arcade game. The old installed games have been removed, so this section now focuses on the Article Arcade experience.
          </p>
          <div className="external-game-zone__badges">
            <span><Gamepad2 size={14} /> Grammar practice</span>
            <span><Sparkles size={14} /> A / An articles</span>
            <span><ShieldCheck size={14} /> Opens in secure game tab</span>
          </div>
        </div>
        <div className="external-game-zone__cover-card">
          <img src={ARTICLE_ARCADE_COVER} alt="The Article Arcade game cover" />
        </div>
      </section>

      <section className="portal-card external-game-zone__launch-card">
        <div className="external-game-zone__launch-art">
          <img src={ARTICLE_ARCADE_COVER} alt="Article Arcade cover preview" />
          <span>New game</span>
        </div>
        <div className="external-game-zone__launch-copy">
          <span className="portal-kicker">Ready to play</span>
          <h2>{learner?.name ? `${learner.name}, open Article Arcade` : 'Open Article Arcade'}</h2>
          <p>
            The game will open in its own secure tab for the best full-screen experience. This avoids the broken grey iframe view when Vercel blocks embedded pages.
          </p>
          <div className="external-game-zone__steps">
            <span>1. Click launch</span>
            <span>2. Start the game</span>
            <span>3. Choose A or AN</span>
          </div>
          <a className="portal-primary-button" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">
            Launch Article Arcade <ExternalLink size={16} />
          </a>
        </div>
      </section>
    </div>
  )
}
