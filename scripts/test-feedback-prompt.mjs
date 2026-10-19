/* The owner's reference assistant (the Novakid tool she uses) leads with
 * STEP 1: GENERATE PROMPT - a copyable AI prompt composed from the lesson
 * fields. Our card now does the same, and this test pins the workflow so a
 * future edit cannot drop the step, the copy action or the honest
 * per-teacher generation counter.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, '..', 'src', 'Dashboards.jsx'), 'utf8')

let failures = 0
const ok = (condition, label) => {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}`)
  if (!condition) failures += 1
}

ok(source.includes('const generatePrompt = () => {'), 'the feedback card can generate the prompt')
ok(source.includes('Step 1: Generate prompt'), 'the primary button is labelled Step 1, like the reference')
ok(source.includes('Step 2: Save feedback & complete class'), 'saving stays the second, explicit step')
ok(source.includes('const composeFeedbackPrompt = () => {'), 'the prompt is composed from the entered fields')
ok(source.includes('navigator.clipboard.writeText(generatedPrompt)'), 'the generated prompt copies to the clipboard')
ok(source.includes('tutorpro_prompt_generations_'), 'generations are counted per teacher, on device')
ok(source.includes('Your generations:'), 'the stats strip shows the teacher their generation count')
ok(/Areas of Success and Areas for Improvement are required - the prompt is built from them/.test(source), 'generation refuses to run without the required areas')

console.log(failures ? `${failures} failed` : 'all feedback prompt checks passed')
process.exit(failures ? 1 : 0)
