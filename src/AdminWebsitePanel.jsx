import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Globe2, Loader2, Users } from 'lucide-react'
import { getAccounts, updateTeacherProfile } from './auth.js'
import {
  TEACHER_VISIBILITY,
  TEACHER_VISIBILITY_OPTIONS,
  isTeacherPubliclyListed,
  loadSiteSettings,
  saveSiteSettings,
  teacherDirectoryVisibility,
} from './siteSettings.js'

/**
 * Admin → Website controls.
 *
 * Two levels of control over the public teacher directory:
 *   1. Whole page: public / parents only / hidden
 *   2. Per teacher: show or hide each individual profile
 *
 * Nothing here affects the admin dashboard itself — every teacher stays fully
 * manageable, bookable and able to log in regardless of these switches.
 */
export default function AdminWebsitePanel() {
  const [visibility, setVisibility] = useState(teacherDirectoryVisibility)
  const [saving, setSaving] = useState('')
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [teachers, setTeachers] = useState(() => getAccounts('teacher'))

  useEffect(() => {
    let active = true
    loadSiteSettings().then((settings) => {
      if (active) setVisibility(settings.teacherDirectoryVisibility)
    })
    return () => { active = false }
  }, [])

  const refreshTeachers = () => setTeachers(getAccounts('teacher'))

  const chooseVisibility = async (value) => {
    if (value === visibility) return
    setSaving(value)
    setNotice('')
    setProblem('')
    setVisibility(value)
    const result = await saveSiteSettings({ teacherDirectoryVisibility: value })
    setSaving('')
    setVisibility(result.settings.teacherDirectoryVisibility)
    if (result.synced) setNotice('Saved. The website updates for every visitor straight away.')
    else setProblem(result.error)
  }

  const toggleTeacher = (teacher) => {
    const nowHidden = isTeacherPubliclyListed(teacher)
    try {
      updateTeacherProfile(teacher.id, { hiddenFromWebsite: nowHidden })
      refreshTeachers()
      setProblem('')
      setNotice(nowHidden
        ? `${teacher.fullName} is now hidden from the website.`
        : `${teacher.fullName} is now shown on the website.`)
    } catch (error) {
      setProblem(error.message || 'That teacher could not be updated.')
    }
  }

  const listed = teachers.filter((teacher) => isTeacherPubliclyListed(teacher) && teacher.status === 'approved')
  const activeOption = TEACHER_VISIBILITY_OPTIONS.find((option) => option.value === visibility)

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Website controls</span>
          <h1>Who can see your teachers</h1>
          <p>Choose whether the teacher directory is open to everyone, reserved for logged-in parents, or hidden completely. You keep full control of every teacher in this dashboard either way.</p>
        </div>
      </div>

      {notice && <div className="website-control-flash website-control-flash--ok"><Check size={16} /> {notice}</div>}
      {problem && <div className="website-control-flash website-control-flash--warn">{problem}</div>}

      <section className="portal-card website-visibility-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div>
            <span className="portal-kicker">Teacher directory</span>
            <h2>Visibility</h2>
          </div>
        </div>
        <div className="website-visibility-options" role="radiogroup" aria-label="Teacher directory visibility">
          {TEACHER_VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={visibility === option.value}
              className={`website-visibility-option${visibility === option.value ? ' website-visibility-option--active' : ''}`}
              onClick={() => chooseVisibility(option.value)}
              disabled={Boolean(saving)}
            >
              <span className="website-visibility-option__icon">
                {option.value === TEACHER_VISIBILITY.PUBLIC && <Globe2 size={19} />}
                {option.value === TEACHER_VISIBILITY.PARENTS && <Users size={19} />}
                {option.value === TEACHER_VISIBILITY.HIDDEN && <EyeOff size={19} />}
              </span>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
              {saving === option.value && <em className="website-visibility-option__saving"><Loader2 size={14} /> Saving…</em>}
            </button>
          ))}
        </div>
        <p className="website-visibility-card__note">
          Currently: <strong>{activeOption?.label || 'Public'}</strong>.
          {visibility === TEACHER_VISIBILITY.PUBLIC && ' Anyone browsing tutorpro.site can open the Teachers page.'}
          {visibility === TEACHER_VISIBILITY.PARENTS && ' The Teachers link only appears after a parent logs in. Logged-out visitors never see it.'}
          {visibility === TEACHER_VISIBILITY.HIDDEN && ' The Teachers link is removed from the site menu and footer for parents. Bookings still work normally.'}
          {' '}Administrators and teachers always keep access so you can check how it looks.
        </p>
        {visibility === TEACHER_VISIBILITY.HIDDEN && (
          <p className="website-visibility-card__warning">
            Heads up: the homepage and FAQ tell parents they can view teacher profiles and introduction videos before booking. With the directory hidden that sentence is no longer accurate — switch to <strong>Parents only</strong> instead if you want profiles reserved rather than removed.
          </p>
        )}
      </section>

      <section className="portal-card website-teacher-list-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div>
            <span className="portal-kicker">Individual profiles</span>
            <h2>Show or hide each teacher</h2>
          </div>
          <span className="website-teacher-count">{listed.length} of {teachers.length} shown</span>
        </div>
        <p className="website-teacher-list-card__note">
          Hiding a teacher removes them from the parent-facing directory only. They keep their dashboard, their schedule and every existing booking.
        </p>
        <div className="website-teacher-list">
          {teachers.length ? teachers.map((teacher) => {
            const shown = isTeacherPubliclyListed(teacher)
            const approved = teacher.status === 'approved'
            return (
              <div className={`website-teacher-row${shown && approved ? '' : ' website-teacher-row--muted'}`} key={teacher.id}>
                <div>
                  <strong>{teacher.fullName}</strong>
                  <small>
                    {teacher.teacher?.specialization || 'Teacher'}
                    {!approved && ` · ${teacher.status} — not shown on the website until approved`}
                  </small>
                </div>
                <button
                  type="button"
                  className={`website-teacher-toggle${shown ? ' website-teacher-toggle--on' : ''}`}
                  onClick={() => toggleTeacher(teacher)}
                  aria-pressed={shown}
                >
                  {shown ? <Eye size={15} /> : <EyeOff size={15} />}
                  {shown ? 'Shown' : 'Hidden'}
                </button>
              </div>
            )
          }) : <p className="website-teacher-list__empty">No teacher profiles yet. Add teachers from the Teachers page.</p>}
        </div>
      </section>
    </div>
  )
}
