import fs from 'fs';

async function extractText() {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    let dataBuffer = fs.readFileSync('./src/contratos/Contrato_Desarrollo_Software_Axon.pdf');
    let data = await pdfParse(dataBuffer);
    console.log(data.text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}

extractText();
