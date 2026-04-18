export const printBatchLabel = (perfumeName: string, perfumeCode: string, batchNumber: string, weight: number, date: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
        <html>
            <head>
                <title>Batch Label - ${batchNumber}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 20px; text-align: center; }
                    .label-card { 
                        border: 2px solid #000; 
                        padding: 30px; 
                        width: 400px; 
                        margin: 0 auto; 
                        border-radius: 10px;
                    }
                    .header { font-size: 12px; font-weight: 800; letter-spacing: 2px; color: #666; margin-bottom: 20px; }
                    .perfume-name { font-size: 28px; font-weight: 900; margin-bottom: 5px; color: #000; }
                    .perfume-code { font-size: 14px; font-weight: 700; color: #444; margin-bottom: 25px; font-family: monospace; }
                    .batch-info { border-top: 1px dashed #ccc; padding-top: 20px; display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
                    .info-box { text-align: left; }
                    .label { font-size: 9px; font-weight: 800; color: #888; text-transform: uppercase; }
                    .value { font-size: 14px; font-weight: 700; color: #000; }
                    .qr-placeholder { margin-top: 25px; font-size: 10px; color: #ccc; border: 1px solid #eee; padding: 10px; }
                    @media print {
                        body { padding: 0; }
                        .label-card { border: 1px solid #000; box-shadow: none; width: 100%; border-radius: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <div class="header">SCENTVAULT INVENTORY</div>
                    <div class="perfume-name">${perfumeName}</div>
                    <div class="perfume-code">${perfumeCode}</div>
                    
                    <div class="batch-info">
                        <div class="info-box">
                            <div class="label">Batch Number</div>
                            <div class="value">${batchNumber}</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Net Weight</div>
                            <div class="value">${weight.toFixed(2)} KG</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Date Recorded</div>
                            <div class="value">${date}</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Status</div>
                            <div class="value">QUALITY PASSED</div>
                        </div>
                    </div>

                    <div class="qr-placeholder">
                        INTERNAL USE ONLY - ${batchNumber}
                    </div>
                </div>
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
