// Use lib path directly to avoid pdf-parse opening test files at import time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js')
import mammoth from 'mammoth'

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  // PDF
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
    const data = await pdfParse(buffer)
    return data.text
  }

  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // Image — OCR via tesseract.js
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(filename)) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('por+eng')
    try {
      const { data } = await worker.recognize(buffer)
      return data.text
    } finally {
      await worker.terminate()
    }
  }

  // Plain text / Markdown / fallback
  return buffer.toString('utf-8')
}
