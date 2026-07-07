import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/swami.jpg';

export function numberToWords(n) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    const num = Math.floor(n);
    const fn = (x) => {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
        if (x < 1000) return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' and ' + fn(x % 100) : '');
        if (x < 100000) return fn(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + fn(x % 1000) : '');
        if (x < 10000000) return fn(Math.floor(x / 100000)) + ' Lakh' + (x % 100000 ? ' ' + fn(x % 100000) : '');
        return fn(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + fn(x % 10000000) : '');
    };
    return fn(num) + ' Rupees only';
}

export function formatCurrency(amount, withSymbol = true) {
    const symbol = withSymbol ? 'Rs. ' : '';
    return symbol + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formats a discount cell as "Rs. X.XX (Y.Y%)" matching the reference invoice
export function formatDiscount(discAmount, discPercent) {
    const amt = Number(discAmount || 0);
    const pct = Number(discPercent || 0);
    return `${formatCurrency(amt)} (${pct.toFixed(1)}%)`;
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    } catch (e) {
        return dateStr;
    }
}

// ---- Helper: convert an image URL (Vite asset) to base64 data URL ----
async function getBase64FromUrl(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Builds the full items-table config (head / body / foot / columnStyles) for autoTable.
 * - Always includes an MRP column.
 * - Only includes the Discount column when at least one item actually has a discount.
 */
function buildInvoiceTable(items, pageWidth, txn, type) {
    const hasDiscount = items.some(
        (it) => Number(it.discountAmount || it.discount || 0) > 0
    );

    let totalQty = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    const rows = items.map((item, idx) => {
        const qty = Number(item.qty || item.quantity || 0);
        const price = Number(item.price || item.price_per_unit || item.rate || 0);
        const mrp = Number(item.mrp || item.mrpPrice || item.mrp_price || price);
        const discAmt = Number(item.discountAmount || item.discount || 0);
        const discPercent = Number(
            item.discountPercent != null
                ? item.discountPercent
                : (price * qty) > 0 ? (discAmt / (price * qty)) * 100 : 0
        );
        const amount = Number(item.amount || (price * qty - discAmt) || 0);

        totalQty += qty;
        totalDiscount += discAmt;
        totalAmount += amount;

        return {
            idx: String(idx + 1),
            name: item.name || item.item_name || 'Item',
            qty: qty.toString(),
            unit: item.unit || '-',
            mrp: formatCurrency(mrp),
            price: formatCurrency(price),
            discount: formatDiscount(discAmt, discPercent),
            amount: formatCurrency(amount),
        };
    });

    // For payment/expense types with no items, show a single summary row
    if (rows.length === 0 && (txn.paid || txn.amount || txn.transferAmount)) {
        const amt = Number(txn.paid || txn.amount || txn.transferAmount || 0);
        totalAmount = amt;
        const label = txn.category || (type + ' received');
        rows.push({
            idx: '1', name: label, qty: '-', unit: '-', mrp: '-', price: '-',
            discount: formatDiscount(0, 0), amount: formatCurrency(amt),
        });
    }

    // ---- Column definitions (MRP always shown, Discount only if applicable) ----
    const columns = [
        { key: 'idx', header: '#', width: 8, halign: 'left' },
        { key: 'name', header: 'Item name', width: null, halign: 'left', bold: true },
        { key: 'qty', header: 'Quantity', width: 16, halign: 'right' },
        { key: 'unit', header: 'Unit', width: 12, halign: 'center' },
        { key: 'mrp', header: 'MRP', width: 20, halign: 'right' },
        { key: 'price', header: 'Price/ unit', width: 22, halign: 'right' },
    ];
    if (hasDiscount) {
        columns.push({ key: 'discount', header: 'Discount', width: 28, halign: 'right' });
    }
    columns.push({ key: 'amount', header: 'Amount', width: 24, halign: 'right' });

    // Item name column takes up remaining width
    const fixedWidth = columns.filter((c) => c.key !== 'name').reduce((s, c) => s + c.width, 0);
    const nameCol = columns.find((c) => c.key === 'name');
    nameCol.width = pageWidth - fixedWidth;

    const head = [columns.map((c) => c.header)];
    const body = rows.map((r) => columns.map((c) => r[c.key]));

    const footValues = {
        idx: '', name: 'Total', qty: String(totalQty), unit: '', mrp: '', price: '',
        discount: hasDiscount ? formatCurrency(totalDiscount) : '',
        amount: formatCurrency(totalAmount),
    };
    const foot = [columns.map((c) => footValues[c.key])];

    const columnStyles = {};
    columns.forEach((c, i) => {
        columnStyles[i] = {
            cellWidth: c.width,
            halign: c.halign,
            ...(c.key === 'name' ? { fontStyle: 'bold' } : {}),
        };
    });

    return { head, body, foot, columnStyles, totalQty, totalDiscount, totalAmount, hasDiscount };
}

/**
 * Generates a plain, table-based estimate/invoice PDF.
 * NOTE: This function is now async because it fetches the logo asset.
 * Make sure to await it wherever you call it:
 *   await downloadBillPDF(txn, profile, 'Bill of Supply');
 */
export async function downloadBillPDF(txn, profile, type = 'Bill of Supply') {
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const ml = 12, mr = 198;
        const pageWidth = mr - ml;
        let y = 14;

        // Pure black for all text and borders, per spec (monochrome invoice)
        const dark = [0, 0, 0];
        const grey = [0, 0, 0];
        const lineGrey = [0, 0, 0];
        const thickLine = [0, 0, 0];

        // ---- Load logo from Vite asset URL → base64 ----
        let logoBase64 = null;
        try {
            logoBase64 = await getBase64FromUrl(logo);
        } catch (e) {
            console.error('Could not load logo image:', e);
        }

        // ---- Title ----
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...dark);
        doc.text(type, ml + pageWidth / 2, y, { align: 'center' });
        y += 6;

        // ---- Company / Invoice info row ----
        const infoTop = y;
        const infoHeight = 18;
        const colSplit1 = ml + pageWidth * 0.62;
        const colSplit2 = ml + pageWidth * 0.81;

        doc.setDrawColor(...lineGrey);
        doc.setLineWidth(0.25);
        doc.rect(ml, infoTop, pageWidth, infoHeight);
        doc.line(colSplit1, infoTop, colSplit1, infoTop + infoHeight);
        doc.line(colSplit2, infoTop, colSplit2, infoTop + infoHeight);

        const logoSize = 12;
        const logoX = ml + 2;
        const logoY = infoTop + (infoHeight - logoSize) / 2;
        let textX = ml + 3;

        // ---- Add logo (from asset, now as base64) ----
        if (logoBase64) {
            try {
                const format = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize);
                textX = logoX + logoSize + 3;
            } catch (imgErr) {
                console.error('Logo render error:', imgErr);
            }
        } else if (profile?.logo) {
            try {
                const format = profile.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                const base64Data = profile.logo.includes('base64,')
                    ? profile.logo.split('base64,')[1]
                    : profile.logo;
                doc.addImage(base64Data, format, logoX, logoY, logoSize, logoSize);
                textX = logoX + logoSize + 3;
            } catch (imgErr) {
                console.error('Profile logo render error:', imgErr);
            }
        }

        // Company block
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...dark);
        doc.text(profile?.name || 'Shree Samarth Agency', textX, infoTop + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...grey);
        const compParts = [];
        if (profile?.phone) compParts.push(`Phone no.: ${profile.phone}`);
        if (profile?.address) compParts.push(profile.address);
        if (profile?.gstin) compParts.push(`GSTIN: ${profile.gstin}`);
        if (compParts.length) {
            doc.text(compParts[0], textX, infoTop + 12.5);
        }

        // Invoice No. block
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...dark);
        doc.text('Invoice No.', colSplit1 + 3, infoTop + 6);
        doc.setFont('helvetica', 'bold');
        doc.text(txn.invoiceNo || 'Draft', colSplit1 + 3, infoTop + 11);

        // Date block
        doc.setFont('helvetica', 'normal');
        doc.text('Date', colSplit2 + 3, infoTop + 6);
        doc.setFont('helvetica', 'bold');
        doc.text(formatDate(txn.date), colSplit2 + 3, infoTop + 11);

        y = infoTop + infoHeight;

        // ---- Bill To block ----
        const billTop = y;
        const lineH = 5;
        const billLines = [txn.customerName || 'Cash Customer'];
        if (txn.customerAddress) billLines.push(txn.customerAddress);
        if (txn.customerPhone) billLines.push(`Contact No.: ${txn.customerPhone}`);
        const billHeight = 6 + billLines.length * lineH + 2;

        doc.setDrawColor(...lineGrey);
        doc.rect(ml, billTop, pageWidth, billHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...dark);
        doc.text('Bill To', ml + 3, billTop + 5);

        let blY = billTop + 5 + lineH;
        billLines.forEach((line, idx) => {
            doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
            doc.setFontSize(idx === 0 ? 10 : 8.5);
            doc.text(line, ml + 3, blY);
            blY += lineH;
        });

        y = billTop + billHeight;

        // ---- Items table (MRP always shown, Discount only when applicable) ----
        const items = txn.items || [];
        const table = buildInvoiceTable(items, pageWidth, txn, type);
        const { totalDiscount, totalAmount } = table;

        autoTable(doc, {
            startY: y,
            margin: { left: ml, right: 210 - mr },
            tableWidth: pageWidth,
            head: table.head,
            body: table.body,
            foot: table.foot,
            theme: 'grid',
            styles: {
                fontSize: 8.5,
                textColor: dark,
                lineColor: lineGrey,
                lineWidth: 0.25,
                cellPadding: 1.6,
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: dark,
                fontStyle: 'bold',
                lineColor: lineGrey,
                lineWidth: 0.25,
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
            },
            footStyles: {
                fillColor: [255, 255, 255],
                textColor: dark,
                fontStyle: 'bold',
                lineColor: lineGrey,
                lineWidth: 0.25,
            },
            columnStyles: table.columnStyles,
        });

        y = doc.lastAutoTable.finalY;

        // ---- Amount in words + Totals box ----
        const subTotal = totalAmount || Number(txn.paid || txn.amount || 0);
        const rounded = Math.round(subTotal);
        const roundOff = rounded - subTotal;
        const grandTotal = Number(txn.total_amount || txn.total || txn.paid || txn.amount || txn.transferAmount || rounded);
        const received = Number(txn.received != null ? txn.received : (txn.paid || grandTotal));
        const balance = grandTotal - received;
        const showSaved = totalDiscount > 0;

        const wordsBoxWidth = pageWidth * 0.5;
        const amtBoxWidth = pageWidth - wordsBoxWidth;
        const wordsBoxX = ml;
        const amtBoxX = ml + wordsBoxWidth;
        const amtRowH = 5.2;
        // header row + Sub Total, Round off, Total, Received, Balance, (+ You Saved if applicable)
        const amtRowCount = showSaved ? 6 : 5;
        const amtBoxHeight = 5.5 + amtRowH * amtRowCount + 2;

        doc.setDrawColor(...lineGrey);
        doc.rect(wordsBoxX, y, wordsBoxWidth, amtBoxHeight);
        doc.rect(amtBoxX, y, amtBoxWidth, amtBoxHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...dark);
        doc.text('Invoice Amount In Words', wordsBoxX + 3, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        const wordsText = numberToWords(grandTotal);
        const wrapped = doc.splitTextToSize(wordsText, wordsBoxWidth - 6);
        doc.text(wrapped, wordsBoxX + 3, y + 10.5);

        let ay = y + 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...dark);
        doc.text('Amounts', amtBoxX + 3, ay);
        ay += amtRowH;

        doc.setFont('helvetica', 'normal');
        doc.text('Sub Total', amtBoxX + 3, ay);
        doc.text(formatCurrency(subTotal), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        ay += amtRowH;

        doc.text('Round off', amtBoxX + 3, ay);
        doc.text((roundOff >= 0 ? '+ ' : '- ') + formatCurrency(Math.abs(roundOff)), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        ay += amtRowH;

        doc.setDrawColor(...thickLine);
        doc.setLineWidth(0.4);
        doc.line(amtBoxX, ay - 3.8, amtBoxX + amtBoxWidth, ay - 3.8);
        doc.setLineWidth(0.25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('Total', amtBoxX + 3, ay);
        doc.text(formatCurrency(grandTotal), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        ay += amtRowH;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('Received', amtBoxX + 3, ay);
        doc.text(formatCurrency(received), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        ay += amtRowH;

        doc.text('Balance', amtBoxX + 3, ay);
        doc.text(formatCurrency(balance), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        ay += amtRowH;

        if (showSaved) {
            doc.text('You Saved', amtBoxX + 3, ay);
            doc.text(formatCurrency(totalDiscount), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
        }

        y += amtBoxHeight;

        // ---- Terms and conditions / Signatory ----
        const footHeight = 26;
        doc.setDrawColor(...lineGrey);
        doc.setLineWidth(0.25);
        doc.rect(ml, y, pageWidth, footHeight);
        doc.line(wordsBoxX + wordsBoxWidth, y, wordsBoxX + wordsBoxWidth, y + footHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...dark);
        doc.text('Terms and conditions', ml + 3, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(txn.notes || 'Thank you for doing business with us.', ml + 3, y + 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`For: ${profile?.name || 'Shree Samarth Agency'}`, amtBoxX + amtBoxWidth / 2, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('Authorized Signatory', amtBoxX + amtBoxWidth / 2, y + footHeight - 4, { align: 'center' });

        // Download
        const filename = `${type.replace(/\s+/g, '_')}_${txn.invoiceNo || 'Draft'}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Could not generate PDF. Please check the console for errors.');
    }
}

/**
 * Same as downloadBillPDF but returns a { blob, filename } instead of triggering a download.
 * Used for sharing via Web Share API (e.g. WhatsApp).
 */
export async function generateBillPDFBlob(txn, profile, type = 'Bill of Supply') {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { default: logo } = await import('../assets/swami.jpg');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const ml = 12, mr = 198;
    const pageWidth = mr - ml;
    let y = 14;

    const dark = [0, 0, 0];
    const grey = [0, 0, 0];
    const lineGrey = [0, 0, 0];
    const thickLine = [0, 0, 0];

    // Load logo
    let logoBase64 = null;
    try {
        const res = await fetch(logo);
        const blob2 = await res.blob();
        logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob2);
        });
    } catch (e) { /* no logo */ }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(type, ml + pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Company / info row
    const infoTop = y;
    const infoHeight = 18;
    const colSplit1 = ml + pageWidth * 0.62;
    const colSplit2 = ml + pageWidth * 0.81;
    doc.setDrawColor(...lineGrey);
    doc.setLineWidth(0.25);
    doc.rect(ml, infoTop, pageWidth, infoHeight);
    doc.line(colSplit1, infoTop, colSplit1, infoTop + infoHeight);
    doc.line(colSplit2, infoTop, colSplit2, infoTop + infoHeight);

    const logoSize = 12;
    const logoX = ml + 2;
    const logoY = infoTop + (infoHeight - logoSize) / 2;
    let textX = ml + 3;
    if (logoBase64) {
        try {
            const fmt = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(logoBase64, fmt, logoX, logoY, logoSize, logoSize);
            textX = logoX + logoSize + 3;
        } catch (e) { /* skip */ }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...dark);
    doc.text(profile?.name || 'Shree Samarth Agency', textX, infoTop + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...grey);
    const compParts = [];
    if (profile?.phone) compParts.push('Phone no.: ' + profile.phone);
    if (profile?.address) compParts.push(profile.address);
    if (profile?.gstin) compParts.push('GSTIN: ' + profile.gstin);
    if (compParts.length) doc.text(compParts[0], textX, infoTop + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...dark);
    doc.text('Invoice No.', colSplit1 + 3, infoTop + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(txn.invoiceNo || 'Draft', colSplit1 + 3, infoTop + 11);
    doc.setFont('helvetica', 'normal');
    doc.text('Date', colSplit2 + 3, infoTop + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(txn.date), colSplit2 + 3, infoTop + 11);
    y = infoTop + infoHeight;

    // Bill To
    const billTop = y;
    const lineH = 5;
    const billLines = [txn.customerName || 'Cash Customer'];
    if (txn.customerAddress) billLines.push(txn.customerAddress);
    if (txn.customerPhone) billLines.push('Contact No.: ' + txn.customerPhone);
    const billHeight = 6 + billLines.length * lineH + 2;
    doc.setDrawColor(...lineGrey);
    doc.rect(ml, billTop, pageWidth, billHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Bill To', ml + 3, billTop + 5);
    let blY = billTop + 5 + lineH;
    billLines.forEach((line, idx) => {
        doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
        doc.setFontSize(idx === 0 ? 10 : 8.5);
        doc.text(line, ml + 3, blY);
        blY += lineH;
    });
    y = billTop + billHeight;

    // Items table (MRP always shown, Discount only when applicable)
    const items = txn.items || [];
    const table = buildInvoiceTable(items, pageWidth, txn, type);
    const { totalDiscount, totalAmount } = table;

    autoTable(doc, {
        startY: y, margin: { left: ml, right: 210 - mr }, tableWidth: pageWidth,
        head: table.head, body: table.body, foot: table.foot,
        theme: 'grid',
        styles: { fontSize: 8.5, textColor: dark, lineColor: lineGrey, lineWidth: 0.25, cellPadding: 1.6 },
        headStyles: { fillColor: [255,255,255], textColor: dark, fontStyle: 'bold', lineColor: lineGrey, lineWidth: 0.25 },
        bodyStyles: { fillColor: [255,255,255] },
        footStyles: { fillColor: [255,255,255], textColor: dark, fontStyle: 'bold', lineColor: lineGrey, lineWidth: 0.25 },
        columnStyles: table.columnStyles,
    });
    y = doc.lastAutoTable.finalY;

    // Totals
    const subTotal = totalAmount || Number(txn.paid || txn.amount || 0);
    const rounded = Math.round(subTotal);
    const roundOff = rounded - subTotal;
    const grandTotal = Number(txn.total_amount || txn.total || txn.paid || txn.amount || txn.transferAmount || rounded);
    const received = Number(txn.received != null ? txn.received : (txn.paid || grandTotal));
    const balance = grandTotal - received;
    const showSaved = totalDiscount > 0;

    const wordsBoxWidth = pageWidth * 0.5;
    const amtBoxWidth = pageWidth - wordsBoxWidth;
    const amtBoxX = ml + wordsBoxWidth;
    const amtRowH = 5.2;
    const amtRowCount = showSaved ? 6 : 5;
    const amtBoxHeight = 5.5 + amtRowH * amtRowCount + 2;

    doc.setDrawColor(...lineGrey);
    doc.rect(ml, y, wordsBoxWidth, amtBoxHeight);
    doc.rect(amtBoxX, y, amtBoxWidth, amtBoxHeight);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text('Invoice Amount In Words', ml + 3, y + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    const wrapped = doc.splitTextToSize(numberToWords(grandTotal), wordsBoxWidth - 6);
    doc.text(wrapped, ml + 3, y + 10.5);

    let ay = y + 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Amounts', amtBoxX + 3, ay); ay += amtRowH;

    doc.setFont('helvetica', 'normal');
    doc.text('Sub Total', amtBoxX + 3, ay);
    doc.text(formatCurrency(subTotal), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' }); ay += amtRowH;

    doc.text('Round off', amtBoxX + 3, ay);
    doc.text((roundOff >= 0 ? '+ ' : '- ') + formatCurrency(Math.abs(roundOff)), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' }); ay += amtRowH;

    doc.setDrawColor(...thickLine); doc.setLineWidth(0.4);
    doc.line(amtBoxX, ay - 3.8, amtBoxX + amtBoxWidth, ay - 3.8); doc.setLineWidth(0.25);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Total', amtBoxX + 3, ay);
    doc.text(formatCurrency(grandTotal), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' }); ay += amtRowH;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('Received', amtBoxX + 3, ay);
    doc.text(formatCurrency(received), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' }); ay += amtRowH;

    doc.text('Balance', amtBoxX + 3, ay);
    doc.text(formatCurrency(balance), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' }); ay += amtRowH;

    if (showSaved) {
        doc.text('You Saved', amtBoxX + 3, ay);
        doc.text(formatCurrency(totalDiscount), amtBoxX + amtBoxWidth - 3, ay, { align: 'right' });
    }

    y += amtBoxHeight;

    // Footer
    const footHeight = 26;
    doc.setDrawColor(...lineGrey); doc.setLineWidth(0.25);
    doc.rect(ml, y, pageWidth, footHeight);
    doc.line(ml + wordsBoxWidth, y, ml + wordsBoxWidth, y + footHeight);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...dark);
    doc.text('Terms and conditions', ml + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(txn.notes || 'Thank you for doing business with us.', ml + 3, y + 10.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('For: ' + (profile?.name || 'Shree Samarth Agency'), amtBoxX + amtBoxWidth / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', amtBoxX + amtBoxWidth / 2, y + footHeight - 4, { align: 'center' });

    // Return as blob instead of saving
    const filename = type.replace(/\s+/g, '_') + '_' + (txn.invoiceNo || 'Draft') + '.pdf';
    const blob = doc.output('blob');
    return { blob, filename };
}