import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarCheck2, CheckCircle2, Copy, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { getAccountById, getAccounts } from './auth.js'
import { getBookings, syncBookingNow, updateBooking } from './bookings.js'
import {
  COURSEWARE_SLIDE_TYPES,
  cloneCoursewareTemplate,
  coursewareSnapshot,
  createBlankCoursewareTemplate,
  deleteCoursewareTemplate,
  getCoursewareTemplates,
  normalizeCoursewareTemplate,
  saveCoursewareTemplate,
} from './courseware.js'

function formatLessonDate(booking) {
  if (!booking?.date || !booking?.time) return 'No schedule'
  try {
    const date = new Date(`${booking.date}T${booking.time}:00`)
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' }) + ` · ${date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}`
  } catch {
    return `${booking.date} · ${booking.time}`
  }
}

function bookingLabel(booking) {
  const teacher = getAccountById(booking.teacherId)
  const student = getAccountById(booking.studentId)
  return `${formatLessonDate(booking)} · ${booking.learnerName || 'Student'} with ${teacher?.fullName || booking.teacherName || 'Teacher'} · ${student?.parentName || student?.email || 'Family'}`
}

function splitTags(value) {
  return String(value || '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}

function templateCardMeta(template) {
  const slides = template.slides?.length || 0
  const tags = template.tags?.slice(0, 3).join(' · ')
  return `${slides} slides${template.level ? ` · ${template.level}` : ''}${tags ? ` · ${tags}` : ''}`
}

export default function CoursewareManager({ account, mode = 'teacher' }) {
  const actorName = account?.fullName || account?.parentName || 'TutorPro Admin'
  const [templates, setTemplates] = useState(() => getCoursewareTemplates())
  const [selectedId, setSelectedId] = useState(() => getCoursewareTemplates()[0]?.id || '')
  const [draft, setDraft] = useState(() => getCoursewareTemplates()[0] || null)
  const [bookingsVersion, setBookingsVersion] = useState(0)
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refreshTemplates = () => {
    const nextTemplates = getCoursewareTemplates()
    setTemplates(nextTemplates)
    setSelectedId((current) => nextTemplates.some((template) => template.id === current) ? current : nextTemplates[0]?.id || '')
  }

  useEffect(() => {
    const refresh = () => {
      refreshTemplates()
      setBookingsVersion((value) => value + 1)
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('tutorpro:courseware-change', refresh)
    window.addEventListener('tutorpro:data-change', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('tutorpro:courseware-change', refresh)
      window.removeEventListener('tutorpro:data-change', refresh)
    }
  }, [])

  useEffect(() => {
    const selected = templates.find((template) => template.id === selectedId) || templates[0] || null
    setDraft(selected ? normalizeCoursewareTemplate(selected) : null)
  }, [selectedId, templates])

  const accounts = useMemo(() => getAccounts(), [bookingsVersion])
  const availableBookings = useMemo(() => {
    const nowKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return getBookings()
      .filter((booking) => mode === 'admin' || booking.teacherId === account?.id)
      .filter((booking) => ['pending', 'confirmed', 'ongoing'].includes(booking.status))
      .filter((booking) => !booking.date || booking.date >= nowKey || booking.status === 'ongoing')
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
  }, [account?.id, bookingsVersion, mode])

  useEffect(() => {
    setSelectedBookingId((current) => availableBookings.some((booking) => booking.id === current) ? current : availableBookings[0]?.id || '')
  }, [availableBookings])

  const stats = useMemo(() => {
    const custom = templates.filter((template) => !template.isDefault).length
    const assigned = getBookings().filter((booking) => booking.coursewareTemplateId || booking.coursewareTemplate?.id).length
    return { total: templates.length, custom, assigned }
  }, [templates, bookingsVersion])

  const selectedTemplate = templates.find((template) => template.id === selectedId) || templates[0]

  const updateDraft = (changes) => {
    setDraft((current) => normalizeCoursewareTemplate({ ...(current || {}), ...changes }))
    setError('')
    setMessage('')
  }

  const updateSlide = (index, changes) => {
    setDraft((current) => {
      const slides = [...(current?.slides || [])]
      slides[index] = { ...slides[index], ...changes }
      return normalizeCoursewareTemplate({ ...current, slides })
    })
    setError('')
  }

  const addSlide = () => {
    setDraft((current) => normalizeCoursewareTemplate({
      ...current,
      slides: [
        ...(current?.slides || []),
        {
          id: `slide-${(current?.slides?.length || 0) + 1}`,
          type: 'Speaking',
          title: 'New activity slide',
          objective: 'Practice English with guided teacher support.',
          prompt: 'Write the student prompt here.',
          teacherNote: 'Write teacher notes here.',
          answer: 'Write the sample answer here.',
          vocabulary: [],
        },
      ],
    }))
  }

  const removeSlide = (index) => {
    setDraft((current) => {
      if ((current?.slides?.length || 0) <= 1) return current
      return normalizeCoursewareTemplate({ ...current, slides: current.slides.filter((_, slideIndex) => slideIndex !== index) })
    })
  }

  const moveSlide = (index, direction) => {
    setDraft((current) => {
      const slides = [...(current?.slides || [])]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= slides.length) return current
      const [slide] = slides.splice(index, 1)
      slides.splice(nextIndex, 0, slide)
      return normalizeCoursewareTemplate({ ...current, slides })
    })
  }

  const createTemplate = () => {
    const blank = saveCoursewareTemplate(createBlankCoursewareTemplate(actorName))
    refreshTemplates()
    setSelectedId(blank.id)
    setMessage('New editable lesson created.')
  }

  const duplicateTemplate = () => {
    if (!draft) return
    const copy = saveCoursewareTemplate(cloneCoursewareTemplate(draft, { title: `${draft.title} (Copy)`, createdBy: actorName }))
    refreshTemplates()
    setSelectedId(copy.id)
    setMessage('Lesson duplicated. You can safely edit this copy.')
  }

  const saveTemplate = () => {
    if (!draft) return
    try {
      const templateToSave = draft.isDefault
        ? cloneCoursewareTemplate(draft, { title: `${draft.title} (Custom copy)`, createdBy: actorName })
        : { ...draft, createdBy: draft.createdBy || actorName }
      const saved = saveCoursewareTemplate(templateToSave)
      refreshTemplates()
      setSelectedId(saved.id)
      setMessage(draft.isDefault ? 'Built-in lesson saved as your editable custom copy.' : 'Lesson saved successfully.')
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const deleteTemplate = () => {
    if (!selectedTemplate || selectedTemplate.isDefault) {
      setError('Built-in TutorPro lessons cannot be deleted. Duplicate it first if you want an editable copy.')
      return
    }
    if (!window.confirm(`Delete “${selectedTemplate.title}”?`)) return
    try {
      deleteCoursewareTemplate(selectedTemplate.id)
      refreshTemplates()
      setMessage('Custom lesson deleted.')
      setError('')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const assignToBooking = () => {
    const booking = availableBookings.find((item) => item.id === selectedBookingId)
    const template = normalizeCoursewareTemplate(draft || selectedTemplate)
    if (!booking || !template) {
      setError('Choose a class and a lesson template first.')
      return
    }
    try {
      const snapshot = coursewareSnapshot(template)
      const updated = updateBooking(booking.id, {
        coursewareTemplateId: snapshot.id,
        coursewareTemplate: snapshot,
        coursewareAssignedAt: new Date().toISOString(),
        coursewareAssignedBy: account?.id || 'admin',
      })
      syncBookingNow(updated).catch(() => {})
      setBookingsVersion((value) => value + 1)
      setMessage(`Assigned “${snapshot.title}” to ${booking.learnerName || 'the selected class'}.`)
      setError('')
    } catch (assignError) {
      setError(assignError.message)
    }
  }

  const assignedRows = availableBookings.filter((booking) => booking.coursewareTemplateId || booking.coursewareTemplate?.id).slice(0, 8)

  return (
    <div className="portal-view courseware-manager-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Classroom Pro</span>
          <h1>{mode === 'admin' ? 'Courseware Builder' : 'My Lesson Courseware'}</h1>
          <p>Create reusable interactive lesson slides, then assign a courseware snapshot to booked classes.</p>
        </div>
        <button className="portal-primary-button" onClick={createTemplate}><Plus size={17} /> New lesson</button>
      </div>

      <section className="courseware-command-grid">
        <article className="portal-card courseware-stat-card"><Sparkles size={22} /><strong>{stats.total}</strong><span>Total templates</span></article>
        <article className="portal-card courseware-stat-card"><BookOpen size={22} /><strong>{stats.custom}</strong><span>Custom lessons</span></article>
        <article className="portal-card courseware-stat-card"><CalendarCheck2 size={22} /><strong>{stats.assigned}</strong><span>Assigned classes</span></article>
      </section>

      {(message || error) && <div className={error ? 'portal-error' : 'portal-success'} role="status">{error || <><CheckCircle2 size={17} /> {message}</>}</div>}

      <div className="courseware-builder-layout">
        <aside className="portal-card courseware-template-list">
          <div className="portal-card__heading portal-card__heading--small">
            <div><span className="portal-kicker">Templates</span><h2>Lesson library</h2></div>
          </div>
          <div className="courseware-template-list__items">
            {templates.map((template) => (
              <button type="button" className={template.id === selectedId ? 'active' : ''} key={template.id} onClick={() => setSelectedId(template.id)}>
                <strong>{template.title}</strong>
                <span>{templateCardMeta(template)}</span>
                {template.isDefault ? <i>Built-in</i> : <i>Custom</i>}
              </button>
            ))}
          </div>
          <div className="courseware-list-actions">
            <button className="portal-secondary-button" onClick={duplicateTemplate}><Copy size={15} /> Duplicate</button>
            <button className="portal-danger-link" onClick={deleteTemplate}><Trash2 size={15} /> Delete</button>
          </div>
        </aside>

        {draft && <section className="portal-card courseware-editor-card">
          <div className="courseware-editor-card__top">
            <div>
              <span className="portal-kicker">Lesson editor</span>
              <h2>{draft.title}</h2>
              {draft.isDefault && <p>This is a protected TutorPro built-in lesson. Saving creates your editable copy.</p>}
            </div>
            <button className="portal-primary-button" onClick={saveTemplate}><Save size={17} /> {draft.isDefault ? 'Save as copy' : 'Save lesson'}</button>
          </div>

          <div className="courseware-form-grid">
            <label><span>Lesson title</span><input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} /></label>
            <label><span>Level</span><input value={draft.level} onChange={(event) => updateDraft({ level: event.target.value })} /></label>
            <label className="courseware-form-grid__wide"><span>Lesson goal</span><textarea value={draft.goal} onChange={(event) => updateDraft({ goal: event.target.value })} rows={2} /></label>
            <label className="courseware-form-grid__wide"><span>Tags (comma separated)</span><input value={(draft.tags || []).join(', ')} onChange={(event) => updateDraft({ tags: splitTags(event.target.value) })} /></label>
          </div>

          <div className="courseware-slide-editor-heading">
            <div><span className="portal-kicker">Slides</span><h3>{draft.slides.length} interactive slides</h3></div>
            <button className="portal-secondary-button" onClick={addSlide}><Plus size={15} /> Add slide</button>
          </div>

          <div className="courseware-slide-editor-list">
            {draft.slides.map((slide, index) => (
              <article className="courseware-slide-editor" key={`${slide.id}-${index}`}>
                <div className="courseware-slide-editor__head">
                  <strong>Slide {index + 1}</strong>
                  <div>
                    <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0}>Up</button>
                    <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === draft.slides.length - 1}>Down</button>
                    <button type="button" onClick={() => removeSlide(index)} disabled={draft.slides.length <= 1}>Remove</button>
                  </div>
                </div>
                <div className="courseware-form-grid">
                  <label><span>Type</span><select value={slide.type} onChange={(event) => updateSlide(index, { type: event.target.value })}>{COURSEWARE_SLIDE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label><span>Title</span><input value={slide.title} onChange={(event) => updateSlide(index, { title: event.target.value })} /></label>
                  <label className="courseware-form-grid__wide"><span>Objective</span><input value={slide.objective} onChange={(event) => updateSlide(index, { objective: event.target.value })} /></label>
                  <label className="courseware-form-grid__wide"><span>Student prompt</span><textarea value={slide.prompt} onChange={(event) => updateSlide(index, { prompt: event.target.value })} rows={3} /></label>
                  <label className="courseware-form-grid__wide"><span>Teacher note</span><textarea value={slide.teacherNote} onChange={(event) => updateSlide(index, { teacherNote: event.target.value })} rows={2} /></label>
                  <label className="courseware-form-grid__wide"><span>Sample answer / reveal</span><textarea value={slide.answer} onChange={(event) => updateSlide(index, { answer: event.target.value })} rows={2} /></label>
                  <label className="courseware-form-grid__wide"><span>Vocabulary (comma separated)</span><input value={(slide.vocabulary || []).join(', ')} onChange={(event) => updateSlide(index, { vocabulary: splitTags(event.target.value) })} /></label>
                </div>
              </article>
            ))}
          </div>
        </section>}
      </div>

      <section className="portal-card courseware-assign-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div><span className="portal-kicker">Class assignment</span><h2>Attach this lesson to a booking</h2></div>
        </div>
        <div className="courseware-assign-grid">
          <label><span>Booked class</span><select value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)}>{availableBookings.length ? availableBookings.map((booking) => <option key={booking.id} value={booking.id}>{bookingLabel(booking)}</option>) : <option value="">No upcoming classes</option>}</select></label>
          <div className="courseware-assign-preview"><span>Selected lesson</span><strong>{draft?.title || selectedTemplate?.title || 'No lesson selected'}</strong><small>{draft ? templateCardMeta(draft) : ''}</small></div>
          <button className="portal-primary-button" onClick={assignToBooking} disabled={!selectedBookingId || !draft}><CalendarCheck2 size={17} /> Assign to class</button>
        </div>
        {assignedRows.length > 0 && <div className="courseware-assigned-list">
          <span className="portal-kicker">Recently assigned</span>
          {assignedRows.map((booking) => {
            const teacher = accounts.find((item) => item.id === booking.teacherId)
            return <div key={booking.id}><strong>{booking.coursewareTemplate?.title || booking.coursewareTemplateId}</strong><span>{booking.learnerName || 'Student'} · {teacher?.fullName || booking.teacherName || 'Teacher'} · {formatLessonDate(booking)}</span></div>
          })}
        </div>}
      </section>
    </div>
  )
}
