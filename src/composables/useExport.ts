import { now } from '@/utils/id'

export interface DownloadOptions {
  filename?: string
  mime?: string
  charset?: string
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, mime: string = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  downloadBlob(blob, filename)
}

export function downloadJson<T>(data: T, filename: string): void {
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function downloadCSV(rows: string[][], filename: string): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const content = rows.map(r => r.map(esc).join(',')).join('\n')
  downloadText(content, filename, 'text/csv')
}

export function downloadMarkdown(content: string, filename: string): void {
  downloadText(content, filename, 'text/markdown')
}

export function formatDateFilename(ts?: number): string {
  const d = ts ? new Date(ts) : new Date()
  return d.toISOString().split('T')[0]
}

export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled'
}

export interface ExportFile {
  name: string
  format: 'json' | 'csv' | 'md' | 'txt'
  content: string
  createdAt: number
}

export function useExport() {
  function exportAsJson<T>(data: T, baseName: string): void {
    const filename = `${safeFilename(baseName)}_${formatDateFilename()}.json`
    downloadJson(data, filename)
  }

  function exportAsCSV(rows: string[][], baseName: string): void {
    const filename = `${safeFilename(baseName)}_${formatDateFilename()}.csv`
    downloadCSV(rows, filename)
  }

  function exportAsMarkdown(content: string, baseName: string): void {
    const filename = `${safeFilename(baseName)}_${formatDateFilename()}.md`
    downloadMarkdown(content, filename)
  }

  function exportAsText(content: string, baseName: string): void {
    const filename = `${safeFilename(baseName)}_${formatDateFilename()}.txt`
    downloadText(content, filename)
  }

  return {
    exportAsJson,
    exportAsCSV,
    exportAsMarkdown,
    exportAsText,
    downloadBlob,
    downloadText,
    downloadJson,
    downloadCSV,
    downloadMarkdown,
    formatDateFilename,
    safeFilename
  }
}
