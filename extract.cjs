const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractText() {
  try {
    let dataBuffer = fs.readFileSync('./src/contratos/Contrato_Desarrollo_Software_Axon.pdf');
    let data = await pdfParse(dataBuffer);
    console.log(data.text);
  } catch (err) {
    console.error(err);
  }
}

extractText();
