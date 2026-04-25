import { NextResponse, type NextRequest } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await getSupabaseServer()
  const { data: inv, error } = await sb
    .from('invoices')
    .select('*,clients(legal_name,fiscal_id,fiscal_address,city,province,postal_code,igic),invoice_lines(*)')
    .eq('id', id)
    .single()
  if (error || !inv) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const black = rgb(0.05, 0.05, 0.05)
  const muted = rgb(0.4, 0.4, 0.4)

  let y = 800
  page.drawText('LOGIKA DIGITAL', { x: 40, y, size: 16, font: bold, color: black })
  y -= 14
  page.drawText('Cristian González — Autónomo (Las Palmas)', { x: 40, y, size: 9, font, color: muted })
  y -= 12
  page.drawText('NIF: 12345678X · IGIC en Canarias 7%', { x: 40, y, size: 9, font, color: muted })

  page.drawText(`FACTURA ${inv.number ?? '(borrador)'}`, { x: 380, y: 800, size: 14, font: bold, color: black })
  page.drawText(`Emisión: ${inv.issue_date ?? '—'}`, { x: 380, y: 786, size: 9, font, color: muted })
  page.drawText(`Vencimiento: ${inv.due_date ?? '—'}`, { x: 380, y: 774, size: 9, font, color: muted })

  const c = (inv as { clients: { legal_name: string; fiscal_id: string | null; fiscal_address: string | null; city: string | null; province: string | null; postal_code: string | null } }).clients
  y = 740
  page.drawText('CLIENTE', { x: 40, y, size: 8, font: bold, color: muted })
  y -= 12
  page.drawText(c.legal_name, { x: 40, y, size: 11, font: bold, color: black })
  y -= 12
  if (c.fiscal_id) { page.drawText(`NIF/CIF: ${c.fiscal_id}`, { x: 40, y, size: 9, font, color: muted }); y -= 12 }
  if (c.fiscal_address) { page.drawText(c.fiscal_address, { x: 40, y, size: 9, font, color: muted }); y -= 12 }
  if (c.city || c.province) { page.drawText([c.postal_code, c.city, c.province].filter(Boolean).join(' '), { x: 40, y, size: 9, font, color: muted }); y -= 12 }

  // Tabla de líneas
  y -= 24
  page.drawText('Concepto', { x: 40, y, size: 9, font: bold, color: black })
  page.drawText('Cant.', { x: 360, y, size: 9, font: bold, color: black })
  page.drawText('Precio', { x: 420, y, size: 9, font: bold, color: black })
  page.drawText('Importe', { x: 500, y, size: 9, font: bold, color: black })
  y -= 6
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: muted })
  y -= 12

  const lines = (inv as { invoice_lines: { description: string; qty: number; unit_price: number; amount: number }[] }).invoice_lines ?? []
  for (const l of lines) {
    page.drawText(l.description, { x: 40, y, size: 10, font, color: black })
    page.drawText(String(l.qty), { x: 360, y, size: 10, font, color: black })
    page.drawText(`${Number(l.unit_price).toFixed(2)} €`, { x: 420, y, size: 10, font, color: black })
    page.drawText(`${Number(l.amount).toFixed(2)} €`, { x: 500, y, size: 10, font, color: black })
    y -= 14
  }

  y -= 16
  const labelX = 380; const valX = 500
  page.drawText('Subtotal', { x: labelX, y, size: 10, font, color: muted })
  page.drawText(`${Number(inv.subtotal).toFixed(2)} €`, { x: valX, y, size: 10, font, color: black })
  y -= 14
  page.drawText(`IGIC ${Number(inv.igic_pct).toFixed(0)}%`, { x: labelX, y, size: 10, font, color: muted })
  page.drawText(`${Number(inv.igic_amount).toFixed(2)} €`, { x: valX, y, size: 10, font, color: black })
  y -= 14
  if (Number(inv.irpf_amount) > 0) {
    page.drawText(`IRPF -${Number(inv.irpf_pct).toFixed(0)}%`, { x: labelX, y, size: 10, font, color: muted })
    page.drawText(`-${Number(inv.irpf_amount).toFixed(2)} €`, { x: valX, y, size: 10, font, color: black })
    y -= 14
  }
  page.drawLine({ start: { x: labelX, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 0.5, color: muted })
  y -= 18
  page.drawText('TOTAL', { x: labelX, y, size: 12, font: bold, color: black })
  page.drawText(`${Number(inv.total).toFixed(2)} €`, { x: valX, y, size: 12, font: bold, color: black })

  y = 80
  page.drawText('Pago por transferencia · IBAN ESxx xxxx xxxx xxxx xxxx xxxx', { x: 40, y, size: 8, font, color: muted })
  page.drawText('Documento generado por CRM Logika · cumple requisitos AEAT autónomo (Canarias).', { x: 40, y: y - 12, size: 7, font, color: muted })

  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${inv.number ?? 'factura'}.pdf"`,
    },
  })
}
