"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPdf = readPdf;
exports.readDocx = readDocx;
exports.readDoc = readDoc;
exports.readResumes = readResumes;
exports.cleanResumeText = cleanResumeText;
exports.chunkifyResume = chunkifyResume;
exports.chunkifyJd = chunkifyJd;
exports.parseResume = parseResume;
exports.getAiParsing = getAiParsing;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth = __importStar(require("mammoth"));
const constants_1 = require("../config/constants");
const twilio_1 = require("./twilio/twilio");
const conversation_1 = require("./twilio/models/conversation");
function readPdf(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = yield (0, pdf_parse_1.default)(dataBuffer);
            return data.text;
        }
        catch (error) {
            console.error('Error reading PDF:', error);
            return null;
        }
    });
}
function readDocx(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield mammoth.extractRawText({ path: filePath });
            return result.value;
        }
        catch (error) {
            console.error('Error reading DOCX:', error);
            return null;
        }
    });
}
function readDoc(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield mammoth.extractRawText({ path: filePath });
            return result.value;
        }
        catch (error) {
            console.error('Error reading DOC:', error);
            return null;
        }
    });
}
function readResumes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const docFile = path.join(__dirname, '../../docs/resume.docx');
            const docxText = yield readDocx(docFile);
            if (docxText) {
                console.log('DOCX Text:\n', docxText);
            }
            const pdfFile = path.join(__dirname, '../../docs/resume.pdf');
            const pdfText = yield readPdf(pdfFile);
            if (pdfText) {
                console.log('PDF Text:\n', pdfText);
            }
        }
        catch (e) {
            console.error(e);
        }
    });
}
function cleanResumeText(resumeText) {
    // Remove special characters and normalize whitespace
    return resumeText
        .replace(/\u00a0/g, ' ') // Non-breaking spaces
        .replace(/(\r\n|\n|\r)/gm, '\n') // Uniform newlines
        .replace(/\s+/g, ' ') // Multiple spaces
        .replace(/[^\x00-\x7F]/g, '') // Non-ASCII characters
        .trim();
}
function chunkifyResume(resumeText_1) {
    return __awaiter(this, arguments, void 0, function* (resumeText, maxTokensPerChunk = 3000, overlapContextSize = 500) {
        const resumeTokens = cleanResumeText(resumeText).split(' ');
        const chunks = [];
        if (resumeTokens.length <= maxTokensPerChunk) {
            chunks.push(resumeTokens);
            return chunks;
        }
        function createChunk(start, end) {
            end = (end > (resumeTokens.length - 1)) ? (resumeTokens.length - 1) : end;
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
    });
}
function chunkifyJd(jdText) {
    return __awaiter(this, void 0, void 0, function* () {
        return cleanResumeText(jdText).split(' ');
    });
}
function parseResume() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pdfFile = path.join(__dirname, '../../docs/sampleResume.docx');
            // const pdfText = await readPdf(pdfFile);
            const pdfText = yield readDocx(pdfFile);
            if (pdfText) {
                const resumeChunks = yield chunkifyResume(pdfText);
                const jdChunk = yield chunkifyJd(constants_1.sampleJobDescription);
                let parsedRes = {};
                for (let chunk of resumeChunks) {
                    try {
                        const result = yield getAiParsing(chunk, jdChunk, parsedRes);
                        if (result)
                            parsedRes = result;
                        console.log('Resume Parsed Result: ', parsedRes);
                    }
                    catch (e) {
                        console.log('Exception', e);
                    }
                }
                console.log('Parsed Resume: ', parsedRes);
            }
        }
        catch (e) {
            console.error(e);
        }
    });
}
function getAiParsing(chunk, jdChunk, parsedRes) {
    return __awaiter(this, void 0, void 0, function* () {
        let res = {};
        const payload = (0, constants_1.resumeParsingPrompt)(chunk, jdChunk, parsedRes);
        const completion = yield twilio_1.groq.chat.completions.create({
            model: "mixtral-8x7b-32768",
            messages: [{
                    role: conversation_1.ChatRole.SYSTEM,
                    content: payload
                }],
            temperature: 0.7,
            stream: false,
            stop: null
        });
        const response = completion.choices[0].message.content;
        return JSON.parse(response !== null && response !== void 0 ? response : "");
    });
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
