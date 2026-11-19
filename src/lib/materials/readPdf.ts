// Reads a PDF in the browser with pdf.js. pdf.js (about 1 MB) only loads when a teacher picks a PDF.
// The legacy build works on older school Chromebooks and iPads.

import { linesFromItems, type TextItemLike } from './extract.ts'
import type { SourceDoc } from './types.ts'

export const MAX_FILE_BYTES = 50 * 1024 * 1024

export class ReadError extends Error {}

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let loading: Promise<PdfJs> | null = null

function loadPdfJs(): Promise<PdfJs> {
  loading ??= Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  return loading
}

/** Text and line sizes of every page, plus the top-level bookmarks. `onPage` reports progress. */
export async function readPdf(file: File, onPage?: (done: number, total: number) => void): Promise<SourceDoc> {
  if (file.size > MAX_FILE_BYTES) throw new ReadError('This file is over 50 MB. Try a smaller file.')
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())

  const task = pdfjs.getDocument({ data, verbosity: 0 })
  try {
    let doc
    try {
      doc = await task.promise
    } catch (err) {
      if (err instanceof Error && err.name === 'PasswordException') throw new ReadError('This PDF has a password. Remove it and try again.')
      throw new ReadError('We couldn’t open this PDF. Try another file.')
    }

    const pages: SourceDoc['pages'] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const height = page.view[3] - page.view[1] || 792
      const content = await page.getTextContent()
      const items = content.items.filter((it): it is TextItemLike & typeof it => 'str' in it)
      pages.push({ number: n, lines: linesFromItems(items, height) })
      page.cleanup()
      onPage?.(n, doc.numPages)
    }

    const outline: SourceDoc['outline'] = []
    for (const entry of (await doc.getOutline()) ?? []) {
      try {
        const dest = typeof entry.dest === 'string' ? await doc.getDestination(entry.dest) : entry.dest
        const ref = dest?.[0]
        if (!ref) continue
        const index = typeof ref === 'number' ? ref : await doc.getPageIndex(ref)
        outline.push({ title: entry.title, page: index + 1 })
      } catch {
        // A broken bookmark: skip it. The heading search or the teacher covers the rest.
      }
    }

    return { kind: 'pdf', fileName: file.name, unit: 'page', pages, outline }
  } finally {
    await task.destroy()
  }
}
