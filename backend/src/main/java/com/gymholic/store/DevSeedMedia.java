package com.gymholic.store;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;
import java.util.zip.Deflater;

/**
 * Dev-seed media generators — plain JDK only (no new dependencies).
 * Produces a small valid multi-page PDF and a small valid PNG using raw
 * format writers, so the dev store has real, openable files out of the box.
 */
public final class DevSeedMedia {

    private DevSeedMedia() {
    }

    // ---- PDF ----

    /**
     * Minimal but valid multi-page PDF: a Helvetica title page set, one
     * object pair per page, a correct xref table and trailer.
     */
    public static byte[] samplePdf(String title, int pages) throws IOException {
        List<String> objects = new ArrayList<>();
        // Object ids: 1 catalog, 2 pages tree, 3 font, then per page: page + content.
        int totalPages = Math.max(1, pages);
        List<Integer> pageObjIds = new ArrayList<>();
        for (int i = 0; i < totalPages; i++) {
            pageObjIds.add(4 + i * 2);
        }

        StringBuilder kids = new StringBuilder();
        for (Integer id : pageObjIds) {
            if (kids.length() > 0) kids.append(' ');
            kids.append(id).append(" 0 R");
        }

        objects.add("<< /Type /Catalog /Pages 2 0 R >>");
        objects.add("<< /Type /Pages /Kids [" + kids + "] /Count " + totalPages + " >>");
        objects.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        for (int i = 0; i < totalPages; i++) {
            String content = pageContent(title, i + 1, totalPages);
            objects.add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                + "/Resources << /Font << /F1 3 0 R >> >> /Contents " + (5 + i * 2) + " 0 R >>");
            objects.add("<< /Length " + content.getBytes(StandardCharsets.US_ASCII).length + " >>\nstream\n"
                + content + "endstream");
        }

        StringBuilder pdf = new StringBuilder();
        pdf.append("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(pdf.length());
            pdf.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
        }
        int xrefOffset = pdf.length();
        pdf.append("xref\n0 ").append(objects.size() + 1).append("\n");
        pdf.append("0000000000 65535 f \n");
        for (int offset : offsets) {
            pdf.append(String.format("%010d 00000 n \n", offset));
        }
        pdf.append("trailer\n<< /Size ").append(objects.size() + 1)
            .append(" /Root 1 0 R >>\nstartxref\n").append(xrefOffset).append("\n%%EOF");

        return pdf.toString().getBytes(StandardCharsets.US_ASCII);
    }

    private static String pageContent(String title, int pageNumber, int totalPages) {
        return "BT\n"
            + "/F1 22 Tf\n"
            + "72 760 Td\n"
            + "(" + escape(title) + ") Tj\n"
            + "/F1 12 Tf\n"
            + "0 -30 Td\n"
            + "(Gymholic Blueprint - page " + pageNumber + " of " + totalPages + ") Tj\n"
            + "0 -30 Td\n"
            + "(Sample content generated for local development.) Tj\n"
            + "ET\n";
    }

    private static String escape(String text) {
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    // ---- PNG ----

    /**
     * Tiny valid RGB PNG (no interlace): a dark canvas with an orange band —
     * a generated stand-in for a real cover so seeded products render an
     * image immediately in dev.
     */
    public static byte[] coverPng(int variant) throws IOException {
        int width = 600;
        int height = 800;
        int bandTop = 360 + (variant % 4) * 20;
        int bandBottom = bandTop + 48;

        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        for (int y = 0; y < height; y++) {
            raw.write(0); // filter type: none
            for (int x = 0; x < width; x++) {
                if (y >= bandTop && y < bandBottom) {
                    raw.write(0xFF); raw.write(0x6A); raw.write(0x00); // --orange
                } else if (y == bandBottom || y == bandTop - 1) {
                    raw.write(0xF5); raw.write(0xF1); raw.write(0xE8); // --paper edge
                } else {
                    raw.write(0x0D); raw.write(0x0D); raw.write(0x0D); // near-void
                }
            }
        }
        byte[] idat = deflate(raw.toByteArray());

        ByteArrayOutputStream png = new ByteArrayOutputStream();
        png.write(new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        writeChunk(png, "IHDR", ihdr(width, height));
        writeChunk(png, "IDAT", idat);
        writeChunk(png, "IEND", new byte[0]);
        return png.toByteArray();
    }

    private static byte[] ihdr(int width, int height) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(intBytes(width));
        out.write(intBytes(height));
        out.write(8);  // bit depth
        out.write(2);  // color type: truecolor RGB
        out.write(0);  // compression
        out.write(0);  // filter
        out.write(0);  // interlace
        return out.toByteArray();
    }

    private static byte[] deflate(byte[] data) {
        // Default (nowrap=false) emits the zlib stream PNG IDAT requires
        // (2-byte header + adler32 trailer).
        Deflater deflater = new Deflater(Deflater.BEST_SPEED);
        deflater.setInput(data);
        deflater.finish();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[64 * 1024];
        while (!deflater.finished()) {
            int count = deflater.deflate(buffer);
            out.write(buffer, 0, count);
        }
        deflater.end();
        return out.toByteArray();
    }

    private static void writeChunk(ByteArrayOutputStream out, String type, byte[] data) throws IOException {
        out.write(intBytes(data.length));
        byte[] typeBytes = type.getBytes(StandardCharsets.US_ASCII);
        out.write(typeBytes);
        out.write(data);
        CRC32 crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        out.write(intBytes((int) crc.getValue()));
    }

    private static byte[] intBytes(int value) {
        return new byte[]{
            (byte) (value >>> 24), (byte) (value >>> 16), (byte) (value >>> 8), (byte) value};
    }
}
