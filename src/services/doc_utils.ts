import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { resumeParsingPrompt, sampleJobDescription } from '../config/constants';
import { groq } from './twilio/twilio';
import { ChatRole } from './twilio/models/conversation';

export async function readPdf(filePath: string): Promise<string | null> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error reading PDF:', error);
    return null;
  }
}

export async function readDocx(filePath: string): Promise<string | null> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error reading DOCX:', error);
    return null;
  }
}

export async function readDoc(filePath: string): Promise<string | null> {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (error) {
        console.error('Error reading DOC:', error);
        return null;
    }
}

export async function readResumes(){
    try{
        const docFile = path.join(__dirname, '../../docs/resume.docx');
        const docxText = await readDocx(docFile);
        if(docxText){
            console.log('DOCX Text:\n', docxText);
        }

        const pdfFile = path.join(__dirname, '../../docs/resume.pdf');
        const pdfText = await readPdf(pdfFile);
        if(pdfText){
            console.log('PDF Text:\n', pdfText);
        }
    }catch(e){
        console.error(e);
    }
}

export function cleanResumeText(resumeText: string): string {
    // Remove special characters and normalize whitespace
    return resumeText
      .replace(/\u00a0/g, ' ') // Non-breaking spaces
      .replace(/(\r\n|\n|\r)/gm, '\n') // Uniform newlines
      .replace(/\s+/g, ' ') // Multiple spaces
      .replace(/[^\x00-\x7F]/g, '') // Non-ASCII characters
      .trim();
}

export async function chunkifyResume(resumeText: string, maxTokensPerChunk: number = 3000, overlapContextSize: number = 500): Promise<string[][]> {
    const resumeTokens = cleanResumeText(resumeText).split(' ');
    const chunks: string[][] = [];

    if (resumeTokens.length <= maxTokensPerChunk) {
        chunks.push(resumeTokens);
        return chunks;
    }

    function createChunk(start: number, end: number): string[] {
        end  = (end > (resumeTokens.length-1)) ? (resumeTokens.length-1) : end;
        return resumeTokens.slice(start, end);
    }
    chunks.push(createChunk(0, maxTokensPerChunk));
    let processedTokens = maxTokensPerChunk;
    while (processedTokens < resumeTokens.length) {
        const nextChunkStart = processedTokens - overlapContextSize;
        const nextChunkEnd = nextChunkStart + maxTokensPerChunk;
        chunks.push(createChunk(nextChunkStart, nextChunkEnd));
        processedTokens = nextChunkEnd;
    }

    return chunks;
}

export async function chunkifyJd(jdText: string): Promise<string[]>{
    return cleanResumeText(jdText).split(' ');
}

export async function parseResume(){
    try{
        const pdfFile = path.join(__dirname, '../../docs/sampleResume.docx');
        // const pdfText = await readPdf(pdfFile);
        const pdfText = await readDocx(pdfFile);
        if(pdfText){
           const resumeChunks = await chunkifyResume(pdfText); 
           const jdChunk = await chunkifyJd(sampleJobDescription);
           let parsedRes = {};
           for(let chunk of resumeChunks){
            try{
                const result = await getAiParsing(chunk, jdChunk, parsedRes);
                if(result) parsedRes = result;
                console.log('Resume Parsed Result: ', parsedRes);
            }catch(e){
                console.log('Exception',e);
            }
           }

           console.log('Parsed Resume: ', parsedRes);

        }
    }catch(e){
        console.error(e);
    }
}

export async function getAiParsing(chunk: string[], jdChunk: string[], parsedRes: Object): Promise<Object>{
    let res = {};
    const payload = resumeParsingPrompt(chunk, jdChunk, parsedRes);
    const completion = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{
            role: ChatRole.SYSTEM,
            content: payload
        }],
        temperature: 0.7,
        stream: false,
        stop: null
    });
    const response = completion.choices[0].message.content;
    return JSON.parse(response ?? "");
}

/*
async function main(): Promise<void> {
  const pdfFilePath = 'example.pdf';
  const docxFilePath = 'example.docx';
  const docFilePath = 'example.doc';

  const pdfText = await readPdf(pdfFilePath);
  if (pdfText) {
    console.log('PDF Text:\n', pdfText);
  }

  const docxText = await readDocx(docxFilePath);
  if (docxText) {
    console.log('DOCX Text:\n', docxText);
  }

  const docText = await readDoc(docFilePath);
  if (docText) {
    console.log('DOC Text:\n', docText);
  }

  // Example of creating a docx file.
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new TextRun("Hello World"),
            new TextRun({
              text: "Foo Bar",
              bold: true,
            }),
            new TextRun({
              text: "\tGithub is the best source code hosting",
              bold: true,
            }),
          ],
        }),
      ],
    }],
  });

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("output.docx", buffer);
  });
}
*/