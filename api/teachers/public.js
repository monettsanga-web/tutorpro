import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * The approved teacher directory, WITH the photo.
 *
 * WHY THIS ROUTE EXISTS
 * ---------------------
 * Families do not read the `profiles` table - row-level security stops
 * them - so every teacher a parent or student sees comes from the
 * `get_public_teachers` database function. That function does not return
 * the whole teacher record; it builds a new object field by field:
 *
 *     jsonb_build_object(
 *       'specialization', ..., 'bio', ..., 'education', ...,
 *       'experience', ..., 'languages', ..., 'rating', ...,
 *       'ratingCount', ..., 'lessonsCompleted', ..., 'availabilitySlots', ...
 *     )
 *
 * There is no 'photo' in that list. So a photo could be uploaded, resized,
 * saved to the profile row and synced perfectly - and a parent would still
 * see a grey letter, because the only pipe that reaches a parent drops the
 * field on the floor. No amount of front-end work can fix that.
 *
 * The honest fix is one line of SQL, but it would have to be pasted into
 * the Supabase dashboard by hand, and until somebody did, every family
 * would keep seeing letters. This route needs nothing pasted anywhere: it
 * deploys with the site, reads `profiles` with the service-role key, and
 * returns the same public fields plus the photo. `supabase/public_teachers.sql`
 * is updated too, so a database that does get the SQL run also works - the
 * browser just prefers whichever answer has photos in it.
 *
 * WHAT IS DELIBERATELY NOT RETURNED
 * ---------------------------------
 * This endpoint is public, exactly like the RPC it replaces, so it must
 * leak nothing the RPC would not. Email addresses, login ids, phone
 * numbers, classroom links, payout details, pricing and credits are all
 * left behind: the response is assembled field by field, the same defensive
 * shape the SQL uses, rather than spreading the profile and hoping.
 */

function publicTeacher(row) {
  const data = row.profile_data && typeof row.profile_data === 'object' ? row.profile_data : {}
  const teacher = data.teacher && typeof data.teacher === 'object' ? data.teacher : {}
  /* Two places a photo can be. `teacher.photo` is written by the current
     upload; `profilePhotoUrl` is where older uploads landed. */
  const photo = typeof teacher.photo === 'string' && teacher.photo.startsWith('data:image/')
    ? teacher.photo
    : typeof data.profilePhotoUrl === 'string' && data.profilePhotoUrl.startsWith('data:image/')
      ? data.profilePhotoUrl
      : ''

  return {
    id: row.id,
    full_name: row.full_name || row.display_name || 'TutorPro English Teacher',
    updated_at: row.updated_at,
    teacher: {
      specialization: teacher.specialization || 'Both Curricula',
      bio: teacher.bio || 'TutorPro English teacher profile.',
      education: teacher.education || 'To be updated',
      experience: Number(teacher.experience) || 0,
      languages: teacher.languages || 'English',
      rating: Number(teacher.rating) || 0,
      ratingCount: Number(teacher.ratingCount) || 0,
      lessonsCompleted: Number(teacher.lessonsCompleted) || 0,
      availabilitySlots: Array.isArray(teacher.availabilitySlots) ? teacher.availabilitySlots : [],
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
      photo,
    },
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Use GET.')

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, updated_at, profile_data, role, status')
      .eq('role', 'teacher')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)

    const teachers = (data || [])
      /* The admin can hide an individual teacher from the public site. An
         absent flag means visible, matching the SQL. */
      .filter((row) => !(row.profile_data?.teacher?.hiddenFromWebsite === true))
      .map(publicTeacher)

    /* A short cache: the directory changes perhaps weekly, and every family
       opening the booking page asks for it. */
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return sendJson(res, 200, {
      version: 'teachers-with-photos-2026-10',
      count: teachers.length,
      withPhoto: teachers.filter((teacher) => teacher.teacher.photo).length,
      teachers,
    })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
