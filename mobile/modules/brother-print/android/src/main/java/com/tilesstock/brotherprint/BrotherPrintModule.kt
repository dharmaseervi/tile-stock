package com.tilesstock.brotherprint

import android.graphics.*
import android.util.Base64
import com.brother.sdk.lmprinter.Channel
import com.brother.sdk.lmprinter.OpenChannelError
import com.brother.sdk.lmprinter.PrinterDriverGenerator
import com.brother.sdk.lmprinter.PrinterModel
import com.brother.sdk.lmprinter.setting.QLPrintSettings
import com.brother.sdk.lmprinter.setting.PrintImageSettings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.InetAddress

/**
 * Renders tile labels for the QL-820NWB on 62mm continuous roll.
 *
 * 62mm at 300dpi = 732 dots across. Thermal heads lose definition below
 * roughly 30 dots of type (~2.5mm), and they have no true grey — a grey
 * fill becomes a dot pattern that reads as fuzz at small sizes. So every
 * template here uses pure black and keeps type above that floor.
 */
class BrotherPrintModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("BrotherPrint")

        // Expo runs AsyncFunction bodies off the JS thread, so the blocking
        // SDK calls below are safe here.
        AsyncFunction("printLabel") { ip: String, qrBase64: String, copies: Int, cfg: Map<String, Any?> ->
            printLabel(ip, qrBase64, copies, LabelCfg(cfg))
        }
    }

    private val labelW = 732

    private fun getWorkPath(): String {
        val dir = File(appContext.cacheDirectory, "brother_print")
        if (!dir.exists()) dir.mkdirs()
        return dir.absolutePath
    }

    // ── Paint helpers ────────────────────────────────────────────────

    private fun paint(size: Float, bold: Boolean = false, color: Int = Color.BLACK,
                      align: Paint.Align = Paint.Align.LEFT, tracking: Float = 0f) =
        Paint().apply {
            this.color = color
            textSize = size
            typeface = Typeface.create(
                Typeface.DEFAULT, if (bold) Typeface.BOLD else Typeface.NORMAL
            )
            isAntiAlias = true
            textAlign = align
            letterSpacing = tracking
        }

    /** Real line height including descenders — what drawText's baseline needs. */
    private fun lineHeight(p: Paint): Float {
        val fm = p.fontMetrics
        return fm.descent - fm.ascent
    }

    /** Baseline offset from the top of a line box. */
    private fun baselineOf(p: Paint): Float = -p.fontMetrics.ascent

    /** Shrinks text until it fits, down to a floor, then truncates. */
    private fun fitText(text: String, p: Paint, maxW: Float, minSize: Float): String {
        if (text.isEmpty()) return text
        while (p.measureText(text) > maxW && p.textSize > minSize) {
            p.textSize = p.textSize - 2f
        }
        var s = text
        while (p.measureText(s) > maxW && s.length > 1) s = s.dropLast(1)
        return s
    }

    private fun wrap(text: String, p: Paint, maxW: Float, maxLines: Int): List<String> {
        if (text.isEmpty()) return emptyList()
        if (p.measureText(text) <= maxW) return listOf(text)
        val out = mutableListOf<String>()
        var cur = ""
        for (w in text.split(" ")) {
            val cand = if (cur.isEmpty()) w else "$cur $w"
            if (p.measureText(cand) <= maxW) cur = cand
            else {
                if (cur.isNotEmpty()) out.add(cur)
                cur = w
                if (out.size == maxLines) break
            }
        }
        if (cur.isNotEmpty() && out.size < maxLines) out.add(cur)
        return out.take(maxLines).map { line ->
            var s = line
            while (p.measureText(s) > maxW && s.length > 1) s = s.dropLast(1)
            s
        }
    }

    private fun decodeQr(b64: String, px: Int): Bitmap {
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val src = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        return Bitmap.createScaledBitmap(src, px, px, true)
    }

    // ── Template 1: RACK TAG ─────────────────────────────────────────
    /* Reversed brand band, oversized design name, two-up field grid,
       QR anchored bottom-left. Reads at arm's length down a rack. */
    private fun rackTag(c: Canvas, h: Int, qr: String, brand: String,
                        name: String, size: String, finish: String, extra: String) {
        val pad = 26f
        val bandH = 70f

        // Brand band — knocked-out white on solid black
        c.drawRect(0f, 0f, labelW.toFloat(), bandH, paint(1f, color = Color.BLACK).apply {
            style = Paint.Style.FILL
        })
        if (brand.isNotEmpty()) {
            val bp = paint(38f, bold = true, color = Color.WHITE, tracking = 0.12f)
            fitText(brand.uppercase(), bp, labelW - pad * 2, 26f)
            c.drawText(brand.uppercase(), pad, bandH / 2 + baselineOf(bp) / 2 - 4f, bp)
        }

        // Design name — the sorting key, so it dominates
        val np = paint(112f, bold = true)
        val nameFitted = fitText(name, np, labelW - pad * 2, 52f)
        val nameTop = bandH + 24f
        c.drawText(nameFitted, pad, nameTop + baselineOf(np), np)

        var y = nameTop + lineHeight(np) + 20f

        // Field grid — hairline rules, small caps labels
        val hasFields = size.isNotEmpty() || finish.isNotEmpty()
        if (hasFields) {
            val rule = Paint().apply { color = Color.BLACK; strokeWidth = 2f }
            c.drawLine(pad, y, labelW - pad, y, rule)
            y += 18f

            val labelP = paint(24f, bold = true, tracking = 0.14f)
            val valueP = paint(40f, bold = true)
            val colW = (labelW - pad * 2) / 2f

            if (size.isNotEmpty()) {
                c.drawText("SIZE", pad, y + baselineOf(labelP), labelP)
                c.drawText(size, pad, y + lineHeight(labelP) + 6f + baselineOf(valueP), valueP)
            }
            if (finish.isNotEmpty()) {
                val fx = pad + colW
                c.drawText("FINISH", fx, y + baselineOf(labelP), labelP)
                val ff = fitText(finish.uppercase(), valueP, colW - pad, 26f)
                c.drawText(ff, fx, y + lineHeight(labelP) + 6f + baselineOf(valueP), valueP)
            }
            y += lineHeight(labelP) + 6f + lineHeight(valueP) + 20f
        }

        // QR bottom-left, optional note beside it
        val qrPx = ((h - y - pad).coerceAtLeast(120f)).toInt().coerceAtMost(200)
        c.drawBitmap(decodeQr(qr, qrPx), pad, h - qrPx - pad, null)

        if (extra.isNotEmpty()) {
            val ep = paint(28f, bold = true, tracking = 0.1f)
            val ex = pad + qrPx + 24f
            val ef = fitText(extra.uppercase(), ep, labelW - ex - pad, 20f)
            c.drawText(ef, ex, (h - pad - qrPx / 2f) + baselineOf(ep) / 2 - 6f, ep)
        }
    }

    // ── Template 2: TOWER ────────────────────────────────────────────
    /* Big centred QR on top, then each field full-width and centred.
       Best when the label is scanned more than read. */
    private fun tower(c: Canvas, h: Int, qr: String, brand: String,
                      name: String, size: String, finish: String, extra: String) {
        val pad = 26f
        val cx = labelW / 2f

        val qrPx = (labelW * 0.52f).toInt()
        c.drawBitmap(decodeQr(qr, qrPx), cx - qrPx / 2f, pad, null)
        var y = pad + qrPx + 26f

        if (brand.isNotEmpty()) {
            val bp = paint(30f, bold = true, align = Paint.Align.CENTER, tracking = 0.14f)
            fitText(brand.uppercase(), bp, labelW - pad * 2, 22f)
            c.drawText(brand.uppercase(), cx, y + baselineOf(bp), bp)
            y += lineHeight(bp) + 8f
        }

        if (name.isNotEmpty()) {
            val np = paint(88f, bold = true, align = Paint.Align.CENTER)
            val nf = fitText(name, np, labelW - pad * 2, 44f)
            c.drawText(nf, cx, y + baselineOf(np), np)
            y += lineHeight(np) + 14f
        }

        // Full-width rule, then stacked fields
        val rule = Paint().apply { color = Color.BLACK; strokeWidth = 2f }
        if (size.isNotEmpty() || finish.isNotEmpty()) {
            c.drawLine(pad, y, labelW - pad, y, rule)
            y += 16f
        }

        val fieldP = paint(40f, bold = true, align = Paint.Align.CENTER)
        if (size.isNotEmpty()) {
            c.drawText(size, cx, y + baselineOf(fieldP), fieldP)
            y += lineHeight(fieldP) + 8f
        }
        if (finish.isNotEmpty()) {
            val ff = fitText(finish.uppercase(), fieldP, labelW - pad * 2, 26f)
            c.drawText(ff, cx, y + baselineOf(fieldP), fieldP)
            y += lineHeight(fieldP) + 8f
        }
        if (extra.isNotEmpty()) {
            val ep = paint(30f, align = Paint.Align.CENTER, tracking = 0.08f)
            val ef = fitText(extra.uppercase(), ep, labelW - pad * 2, 22f)
            c.drawText(ef, cx, y + baselineOf(ep), ep)
        }
    }

    // ── Template 3: STRIP ────────────────────────────────────────────
    /* Short and wide — QR left, everything on one or two lines beside it.
       Uses the least roll per label. */
    private fun strip(c: Canvas, h: Int, qr: String, brand: String,
                      name: String, size: String, finish: String, extra: String) {
        val pad = 22f
        val qrPx = (h - pad * 2).toInt().coerceAtMost(220)
        c.drawBitmap(decodeQr(qr, qrPx), pad, ((h - qrPx) / 2).toFloat(), null)

        val tx = pad + qrPx + 24f
        val tw = labelW - tx - pad

        val bp = paint(26f, bold = true, tracking = 0.12f)
        val np = paint(66f, bold = true)
        val mp = paint(30f)

        val meta = listOf(size, finish.uppercase()).filter { it.isNotEmpty() }.joinToString("  ·  ")
        val nameFitted = fitText(name, np, tw, 34f)
        val metaFitted = fitText(meta, mp, tw, 22f)

        var blockH = 0f
        if (brand.isNotEmpty()) blockH += lineHeight(bp) + 8f
        if (name.isNotEmpty()) blockH += lineHeight(np) + 8f
        if (meta.isNotEmpty()) blockH += lineHeight(mp)

        var y = (h - blockH) / 2f

        if (brand.isNotEmpty()) {
            c.drawText(brand.uppercase(), tx, y + baselineOf(bp), bp)
            y += lineHeight(bp) + 8f
        }
        if (name.isNotEmpty()) {
            c.drawText(nameFitted, tx, y + baselineOf(np), np)
            y += lineHeight(np) + 8f
        }
        if (meta.isNotEmpty()) {
            c.drawText(metaFitted, tx, y + baselineOf(mp), mp)
        }
    }

    // ── Template 4: BOXED ────────────────────────────────────────────
    /* Framed card with a boxed brand, name below, fields in a bordered
       footer row, QR right. No solid fills — least ink, no bleed risk. */
    private fun boxed(c: Canvas, h: Int, qr: String, brand: String,
                      name: String, size: String, finish: String, extra: String) {
        val pad = 20f
        val stroke = Paint().apply {
            color = Color.BLACK; style = Paint.Style.STROKE; strokeWidth = 3f
        }
        c.drawRect(pad, pad, labelW - pad, h - pad, stroke)

        val inner = pad + 18f
        val qrPx = 190
        c.drawBitmap(decodeQr(qr, qrPx), labelW - pad - 18f - qrPx, inner, null)

        val tw = labelW - inner - qrPx - 56f
        var y = inner

        if (brand.isNotEmpty()) {
            val bp = paint(26f, bold = true, tracking = 0.12f)
            val bf = fitText(brand.uppercase(), bp, tw - 20f, 20f)
            val bw = bp.measureText(bf)
            val bh = lineHeight(bp)
            c.drawRect(inner, y, inner + bw + 20f, y + bh + 10f, stroke)
            c.drawText(bf, inner + 10f, y + 5f + baselineOf(bp), bp)
            y += bh + 10f + 16f
        }

        if (name.isNotEmpty()) {
            val np = paint(76f, bold = true)
            val lines = wrap(name, np, tw, 2)
            lines.forEach { line ->
                c.drawText(line, inner, y + baselineOf(np), np)
                y += lineHeight(np) + 2f
            }
            y += 14f
        }

        // Footer field row inside the frame
        val fields = listOf("SIZE" to size, "FINISH" to finish.uppercase())
            .filter { it.second.isNotEmpty() }
        if (fields.isNotEmpty()) {
            val footY = h - pad - 18f - 62f
            c.drawLine(inner, footY, labelW - pad - 18f, footY, Paint().apply {
                color = Color.BLACK; strokeWidth = 2f
            })
            val labelP = paint(22f, bold = true, tracking = 0.14f)
            val valueP = paint(36f, bold = true)
            var fx = inner
            val colW = (labelW - inner - pad - 18f) / fields.size
            fields.forEach { (lab, value) ->
                c.drawText(lab, fx, footY + 16f + baselineOf(labelP), labelP)
                val vf = fitText(value, valueP, colW - 16f, 24f)
                c.drawText(vf, fx, footY + 16f + lineHeight(labelP) + 4f + baselineOf(valueP), valueP)
                fx += colW
            }
        }
    }

    // ── Custom (the previous freeform layout) ────────────────────────
    private fun custom(c: Canvas, h: Int, cfg: LabelCfg, qr: String,
                       brand: String, name: String, meta: String) {
        val pad = 24f
        val layout = cfg.getString("layout") ?: "horizontal"
        val qrAlign = cfg.getString("qrAlign") ?: "left"
        val textAlign = cfg.getString("textAlign") ?: "left"
        val qrPct = cfg.getInt("qrSize").coerceIn(30, 95)

        val brandSize = cfg.getInt("brandSize").coerceIn(18, 64).toFloat()
        val nameSize = cfg.getInt("nameSize").coerceIn(24, 120).toFloat()
        val metaSize = cfg.getInt("metaSize").coerceIn(18, 64).toFloat()
        val bold = cfg.getBoolean("boldText")

        val align = when (textAlign) {
            "center" -> Paint.Align.CENTER
            "right" -> Paint.Align.RIGHT
            else -> Paint.Align.LEFT
        }
        val bp = paint(brandSize, bold = true, align = align, tracking = 0.1f)
        val np = paint(nameSize, bold = bold, align = align)
        val mp = paint(metaSize, align = align)

        fun blockH(nLines: Int): Float {
            var t = 0f
            if (brand.isNotEmpty()) t += lineHeight(bp) + 14f
            if (name.isNotEmpty()) t += (lineHeight(np) + 4f) * nLines + 10f
            if (meta.isNotEmpty()) t += lineHeight(mp)
            return t
        }

        fun drawBlock(top: Float, left: Float, width: Float, lines: List<String>) {
            val x = when (textAlign) {
                "center" -> left + width / 2f
                "right" -> left + width
                else -> left
            }
            var y = top
            if (brand.isNotEmpty()) {
                c.drawText(brand.uppercase(), x, y + baselineOf(bp), bp)
                y += lineHeight(bp) + 14f
            }
            lines.forEach { line ->
                c.drawText(line, x, y + baselineOf(np), np)
                y += lineHeight(np) + 4f
            }
            if (lines.isNotEmpty()) y += 10f
            if (meta.isNotEmpty()) c.drawText(meta, x, y + baselineOf(mp), mp)
        }

        if (layout == "vertical") {
            val qrPx = ((qrPct / 100f) * (h * 0.55f)).toInt().coerceIn(100, h - (pad * 2).toInt())
            val qx = when (qrAlign) {
                "center" -> (labelW - qrPx) / 2f
                "right" -> labelW - qrPx - pad
                else -> pad
            }
            c.drawBitmap(decodeQr(qr, qrPx), qx, pad, null)
            val tw = labelW - pad * 2
            val lines = wrap(name, np, tw, 2)
            val remaining = h - qrPx - pad * 2
            drawBlock(qrPx + pad + (remaining - blockH(lines.size.coerceAtLeast(1))) / 2f, pad, tw, lines)
        } else {
            val qrPx = ((qrPct / 100f) * (h - pad * 2)).toInt().coerceIn(100, h - (pad * 2).toInt())
            val onRight = qrAlign == "right"
            val qx = if (onRight) labelW - qrPx - pad else pad
            c.drawBitmap(decodeQr(qr, qrPx), qx, (h - qrPx) / 2f, null)
            val tw = labelW - qrPx - pad * 3
            val tx = if (onRight) pad else qrPx + pad * 2
            val lines = wrap(name, np, tw, 2)
            drawBlock((h - blockH(lines.size.coerceAtLeast(1))) / 2f, tx, tw, lines)
        }
    }

    // ── Compose ──────────────────────────────────────────────────────

    private fun compose(cfg: LabelCfg, qr: String): Bitmap {
        val template = cfg.getString("template") ?: "rack"
        val h = cfg.getInt("labelHeight").coerceIn(200, 1000)

        val brand = cfg.getString("brand") ?: ""
        val name = cfg.getString("name") ?: ""
        val size = cfg.getString("size") ?: ""
        val finish = cfg.getString("finish") ?: ""
        val extra = cfg.getString("extra") ?: ""

        val bmp = Bitmap.createBitmap(labelW, h, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        c.drawColor(Color.WHITE)

        when (template) {
            "rack" -> rackTag(c, h, qr, brand, name, size, finish, extra)
            "tower" -> tower(c, h, qr, brand, name, size, finish, extra)
            "strip" -> strip(c, h, qr, brand, name, size, finish, extra)
            "boxed" -> boxed(c, h, qr, brand, name, size, finish, extra)
            else -> {
                val meta = listOf(size, finish).filter { it.isNotEmpty() }.joinToString(" · ")
                custom(c, h, cfg, qr, brand, name, meta)
            }
        }
        return bmp
    }

    private fun printLabel(ip: String, qrBase64: String, copies: Int, cfg: LabelCfg): String {
        if (!InetAddress.getByName(ip).isReachable(3000)) {
            throw PrintException("Printer at $ip not reachable. Check WiFi and IP.")
        }

        val openResult = PrinterDriverGenerator.openChannel(Channel.newWifiChannel(ip))
        if (openResult.error.code != OpenChannelError.ErrorCode.NoError) {
            throw PrintException("Channel error: ${openResult.error.code}")
        }

        val settings = QLPrintSettings(PrinterModel.QL_820NWB)
        settings.setLabelSize(QLPrintSettings.LabelSize.RollW62)
        settings.setAutoCut(true)
        settings.setNumCopies(copies)
        settings.setScaleMode(PrintImageSettings.ScaleMode.FitPageAspect)
        settings.setPrintQuality(PrintImageSettings.PrintQuality.Best)
        settings.setHalftone(PrintImageSettings.Halftone.Threshold)
        settings.setWorkPath(getWorkPath())

        try {
            val err = openResult.driver.printImage(compose(cfg, qrBase64), settings)
            if (err != null && err.code != com.brother.sdk.lmprinter.PrintError.ErrorCode.NoError) {
                throw PrintException("Print error: ${err.code}")
            }
        } finally {
            openResult.driver.closeChannel()
        }
        return "printed"
    }
}

private class PrintException(message: String) : CodedException("PRINT_ERROR", message, null)

/** Typed view over the JS config object; JS numbers arrive as Double. */
class LabelCfg(private val map: Map<String, Any?>) {
    fun getString(key: String): String? = map[key] as? String
    fun getInt(key: String): Int = (map[key] as? Number)?.toInt() ?: 0
    fun getBoolean(key: String): Boolean = map[key] as? Boolean ?: false
}
