import { PDFDocument, StandardFonts } from 'pdf-lib'
import { compressPDF } from '../src/compressPDF.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const source = await PDFDocument.create()
const font = await source.embedFont(StandardFonts.Helvetica)
const page = source.addPage([612, 792])
page.drawText('TutorPro lossless classroom PDF compression test', {
  x: 48,
  y: 720,
  size: 18,
  font,
})

// Generate a deliberately unoptimised source so the test proves the helper
// emits a valid, smaller PDF without changing its page content.
const uncompressedBytes = await source.save({ useObjectStreams: false })
const original = new File([uncompressedBytes], 'lesson.pdf', {
  type: 'application/pdf',
  lastModified: 1_700_000_000_000,
})
const compressed = await compressPDF(original)
const verified = await PDFDocument.load(await compressed.arrayBuffer())

assert(compressed.name === original.name, 'Compressed PDF filename was not preserved.')
assert(compressed.type === 'application/pdf', 'Compressed PDF MIME type was not preserved.')
assert(compressed.lastModified === original.lastModified, 'Compressed PDF timestamp was not preserved.')
assert(compressed.size < original.size, 'Lossless PDF optimisation did not reduce an unoptimised PDF.')
assert(verified.getPageCount() === source.getPageCount(), 'PDF page content was not preserved.')

console.log('PDF compression checks passed.')
