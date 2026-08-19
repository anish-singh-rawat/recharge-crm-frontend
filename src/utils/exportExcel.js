function escapeXml(val) {
  if (val === null || val === undefined) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colName(n) {
  let s = ''
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function buildSharedStrings(rows) {
  const map = new Map()
  const list = []
  rows.forEach((row) =>
    row.forEach((cell) => {
      const v = String(cell ?? '')
      if (!map.has(v)) {
        map.set(v, list.length)
        list.push(v)
      }
    }),
  )
  return { map, list }
}

function buildSheetXml(rows, ss) {
  const cells = rows
    .map((row, ri) =>
      row
        .map((cell, ci) => {
          const ref = `${colName(ci)}${ri + 1}`
          const val = String(cell ?? '')
          const numVal = !isNaN(val) && val.trim() !== '' ? val : null
          if (numVal !== null) {
            return `<c r="${ref}"><v>${numVal}</v></c>`
          }
          const idx = ss.map.get(val)
          return `<c r="${ref}" t="s"><v>${idx}</v></c>`
        })
        .join(''),
    )
    .map((cells, ri) => `<row r="${ri + 1}">${cells}</row>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${cells}</sheetData>
</worksheet>`
}

function buildSst(list) {
  const items = list
    .map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${list.length}" uniqueCount="${list.length}">${items}</sst>`
}

function strToBytes(str) {
  const buf = new TextEncoder().encode(str)
  return buf
}

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDate() {
  const d = new Date()
  return (
    (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) * 65536 +
    ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2))
  )
}

function deflateRaw(data) {
  return data
}

function writeUint32LE(v) {
  return [(v >>> 0) & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]
}
function writeUint16LE(v) {
  return [v & 0xff, (v >> 8) & 0xff]
}

function buildZip(files) {
  const entries = []
  let offset = 0
  const localParts = []

  for (const { name, data } of files) {
    const nameBytes = strToBytes(name)
    const crc = crc32(data)
    const size = data.length
    const dd = dosDate()

    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04,
      0x14, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      ...writeUint16LE(dd & 0xffff),
      ...writeUint16LE((dd >>> 16) & 0xffff),
      ...writeUint32LE(crc),
      ...writeUint32LE(size),
      ...writeUint32LE(size),
      ...writeUint16LE(nameBytes.length),
      0x00, 0x00,
      ...nameBytes,
      ...data,
    ])

    entries.push({ name: nameBytes, crc, size, offset })
    localParts.push(local)
    offset += local.length
  }

  const centralParts = entries.map(({ name: nb, crc, size, offset: off }, i) => {
    const dd = dosDate()
    return new Uint8Array([
      0x50, 0x4b, 0x01, 0x02,
      0x14, 0x00,
      0x14, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      ...writeUint16LE(dd & 0xffff),
      ...writeUint16LE((dd >>> 16) & 0xffff),
      ...writeUint32LE(crc),
      ...writeUint32LE(size),
      ...writeUint32LE(size),
      ...writeUint16LE(nb.length),
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      ...writeUint32LE(off),
      ...nb,
    ])
  })

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0)
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    0x00, 0x00,
    0x00, 0x00,
    ...writeUint16LE(entries.length),
    ...writeUint16LE(entries.length),
    ...writeUint32LE(centralSize),
    ...writeUint32LE(offset),
    0x00, 0x00,
  ])

  const total = [...localParts, ...centralParts, eocd].reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of [...localParts, ...centralParts, [eocd]].flat()) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

export function exportToExcel(rows, filename = 'report.xlsx') {
  const ss = buildSharedStrings(rows)
  const sheetXml = buildSheetXml(rows, ss)
  const sstXml = buildSst(ss.list)

  const files = [
    { name: '[Content_Types].xml', data: strToBytes(CONTENT_TYPES) },
    { name: '_rels/.rels', data: strToBytes(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: strToBytes(WORKBOOK) },
    { name: 'xl/_rels/workbook.xml.rels', data: strToBytes(WORKBOOK_RELS) },
    { name: 'xl/worksheets/sheet1.xml', data: strToBytes(sheetXml) },
    { name: 'xl/sharedStrings.xml', data: strToBytes(sstXml) },
  ]

  const zip = buildZip(files)
  const blob = new Blob([zip], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
