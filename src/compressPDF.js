import { PDFDocument } from 'pdf-lib'

/**
 * Rewrites a PDF with PDF object streams enabled.
 *
 * This is a lossless optimisation: it does not rasterise, recompress, or
 * downsample pages, images, fonts, or other document content. PDFs that are
 * already optimally encoded are returned unchanged rather than made larger.
 *
 * @param {File} file A PDF selected in the browser.
 * @returns {Promise<File>} The smaller optimised PDF, or the original file.
 */
export async function compressPDF(file) {
  if (!file?.arrayBuffer) throw new Error('A PDF file is required for compression.')

  const pdf = await PDFDocument.load(await file.arrayBuffer(), {
    // Keep the source metadata intact while rewriting the file structure.
    updateMetadata: false,
  })
  const compressedBytes = await pdf.save({
    // Object streams reduce structural overhead without changing document data.
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  })

  // Do not replace an upload with a larger version when its source PDF was
  // already as compact as pdf-lib can make it.
  if (compressedBytes.byteLength >= file.size) return file

  return new File([compressedBytes], file.name, {
    type: 'application/pdf',
    lastModified: file.lastModified,
  })
}
