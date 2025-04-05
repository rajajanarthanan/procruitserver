"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewDeepgramClient = void 0;
exports.synthesizeAudio = synthesizeAudio;
const sdk_1 = require("@deepgram/sdk");
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const getNewDeepgramClient = () => {
    const deepgram = (0, sdk_1.createClient)(deepgramApiKey);
    const connection = deepgram.listen.live({
        encoding: 'mulaw',
        sample_rate: 8000,
        channels: 1,
        model: 'nova-phonecall',
        smart_format: true
    });
    return {
        deepgramClient: deepgram,
        connection: connection
    };
};
exports.getNewDeepgramClient = getNewDeepgramClient;
function synthesizeAudio(response, deepgram) {
    return __awaiter(this, void 0, void 0, function* () {
        const audio = yield deepgram.speak.request({ text: response }, {
            model: 'aura-athena-en', //'aura-venus-en',
            encoding: 'mulaw',
            container: 'none',
            sample_rate: 8000
        });
        const stream = yield audio.getStream();
        if (stream) {
            return getAudioBuffer(stream);
        }
        else {
            throw new Error('Error generating audio');
        }
    });
}
function getAudioBuffer(response) {
    return __awaiter(this, void 0, void 0, function* () {
        const reader = response.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = yield reader.read();
            if (done)
                break;
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    });
}
