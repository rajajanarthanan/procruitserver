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
exports.transporter = exports.handleTwilioStopCall = exports.handleTwilioStatusCallback = exports.serveInitTwiml = exports.handleTwilioMakeCall = exports.ProTwilioCall = exports.proTwilioCalls = exports.twilioClient = exports.groq = void 0;
exports.handleWs = handleWs;
exports.sendSms = sendSms;
exports.sendEmail = sendEmail;
const twilio_1 = __importDefault(require("twilio"));
const ws_1 = require("ws");
const sdk_1 = require("@deepgram/sdk");
const deepgram_1 = require("../deepgram/deepgram");
const conversation_1 = require("./models/conversation");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const nodemailer = __importStar(require("nodemailer"));
const newPrompts_1 = require("../../config/newPrompts");
const constants_1 = require("../../config/constants");
const groqApiKey = process.env.GROQ_API_KEY;
exports.groq = new groq_sdk_1.default({ apiKey: groqApiKey });
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set.");
}
/**creates twilio client */
exports.twilioClient = (0, twilio_1.default)(twilioAccountSid, twilioAuthToken);
/***
 * holds all the twilio call instances and manage the calls
 */
exports.proTwilioCalls = [];
class ProTwilioCall {
    constructor() {
        this.callSid = undefined;
        this.streamSid = undefined;
        this.callInstance = undefined;
        this.callEnded = false;
        this.wsConnection = undefined;
        this.deepgramClient = undefined;
        this.deepgramConnection = undefined;
        this.audioTransmitterTimer = undefined;
        this.conversation = undefined;
        this.jdText = constants_1.sampleJobDescription;
        this.transcriptQue = [];
        this.transcriptPrcessingTimer = undefined;
        const deepgramConTimer = setInterval(() => {
            if (this.deepgramConnection) {
                this.deepgramConnection.keepAlive();
            }
            if (this.callEnded)
                clearInterval(deepgramConTimer);
        }, 10 * 1000);
    }
    ;
    /**places new call and returns the call sid */
    makeNewCall(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { fromNumber, toNumber, recordCall } = req.body;
                if (!fromNumber || !toNumber) {
                    console.log('No from or to number provided');
                    return undefined;
                }
                else {
                    this.callInstance = yield exports.twilioClient.calls.create({
                        url: constants_1.ServerConstants.initTwimlUrl,
                        to: toNumber,
                        from: fromNumber,
                        record: recordCall !== null && recordCall !== void 0 ? recordCall : false,
                        statusCallback: constants_1.ServerConstants.twiStatusCallBackUrl,
                        statusCallbackEvent: Object.values(constants_1.TwilioCallBackEvents),
                        statusCallbackMethod: "POST"
                    });
                    this.callSid = this.callInstance.sid;
                    console.log(`Call made with sid ${this.callSid}`);
                    return this.callSid;
                }
            }
            catch (e) {
                console.error("Error making call", e);
                return undefined;
            }
        });
    }
    setUpHandler() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.deepgramClient || !this.deepgramConnection) {
                const getDeepgramRes = yield (0, deepgram_1.getNewDeepgramClient)();
                this.deepgramClient = getDeepgramRes.deepgramClient;
                this.deepgramConnection = getDeepgramRes.connection;
            }
            this.deepgramConnection.addListener(sdk_1.LiveTranscriptionEvents.Open, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                (_a = this.deepgramConnection) === null || _a === void 0 ? void 0 : _a.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    if (((_b = (_a = data.channel) === null || _a === void 0 ? void 0 : _a.alternatives[0]) === null || _b === void 0 ? void 0 : _b.transcript) &&
                        ((_d = (_c = data.channel) === null || _c === void 0 ? void 0 : _c.alternatives[0]) === null || _d === void 0 ? void 0 : _d.transcript.trim().length) > 0) {
                        if (this.audioTransmitterTimer)
                            clearTimeout(this.audioTransmitterTimer);
                        const transcript = data.channel.alternatives[0].transcript.trim();
                        this.transcriptQue.push(transcript);
                        if (this.transcriptPrcessingTimer)
                            clearTimeout(this.transcriptPrcessingTimer);
                        this.transcriptPrcessingTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                            const transcriptPayload = this.transcriptQue.join(' ');
                            this.transcriptQue = [];
                            console.log('Candidate Said: ', transcriptPayload);
                            yield this.handleTranscript(transcriptPayload);
                        }), 2000);
                    }
                }));
            }));
        });
    }
    handleTranscript(transcript) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.wsConnection)
                return;
            if (!this.conversation)
                this.conversation = new conversation_1.Conversation(newPrompts_1.systemPromptV3);
            const newChatItem = {
                role: conversation_1.ChatRole.USER,
                content: transcript
            };
            const updatedConversationHistory = this.conversation.getUpdatedConversation(newChatItem);
            const completion = yield exports.groq.chat.completions.create({
                messages: updatedConversationHistory,
                model: "llama3-8b-8192",
                temperature: 1,
                max_tokens: 1024,
                top_p: 1,
                stream: false,
                stop: null
            });
            const response = completion.choices[0].message.content;
            if (response && this.deepgramClient) {
                const audioBuffer = yield (0, deepgram_1.synthesizeAudio)(response, this.deepgramClient);
                if (audioBuffer) {
                    if (!this.conversation)
                        return;
                    this.conversation.getUpdatedConversation({
                        role: conversation_1.ChatRole.ASSISTANT,
                        content: response
                    });
                    console.log('ProCruitAi Said: ', response);
                    this.audioTransmitterTimer = yield this.sendAudio(audioBuffer);
                }
            }
        });
    }
    sendAudio(audioBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.wsConnection)
                return;
            if (this.wsConnection.readyState !== ws_1.WebSocket.OPEN)
                return;
            try {
                return setTimeout(() => {
                    this.wsConnection.send(JSON.stringify({
                        event: "media",
                        sequenceNumber: "4",
                        media: {
                            track: "outbound",
                            chunk: "2",
                            timestamp: "4",
                            payload: audioBuffer.toString('base64')
                        },
                        streamSid: this.streamSid
                    }));
                }, 1000);
            }
            catch (e) {
                console.error('Error Sending Audio to Client', e);
            }
        });
    }
    introduceYourSelf() {
        return __awaiter(this, void 0, void 0, function* () {
            // if(this.deepgramClient){
            //     const welcomeBuffer = await synthesizeAudio(introPrompt, this.deepgramClient);
            //     if(welcomeBuffer){
            //         const welcomeTimer = await this.sendAudio(welcomeBuffer);
            //     }
            // }
        });
    }
    handleWsmedia(mediaPayload) {
        if (!this.deepgramClient || !this.deepgramConnection) {
            const getDeepgramRes = (0, deepgram_1.getNewDeepgramClient)();
            this.deepgramClient = getDeepgramRes.deepgramClient;
            this.deepgramConnection = getDeepgramRes.connection;
        }
        if (this.deepgramConnection) {
            const msg = Buffer.from(mediaPayload.media.payload, 'base64');
            const arrayBuffer = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength);
            this.deepgramConnection.send(arrayBuffer);
        }
    }
}
exports.ProTwilioCall = ProTwilioCall;
const handleTwilioMakeCall = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newCall = new ProTwilioCall();
    exports.proTwilioCalls.push(newCall);
    const result = yield newCall.makeNewCall(req);
    if (!result) {
        exports.proTwilioCalls.pop();
        res.json({ "success": false, "message": "Failed to make call" }).status(200);
    }
    else {
        res.json({ "success": true, "callSid": result }).status(200);
    }
});
exports.handleTwilioMakeCall = handleTwilioMakeCall;
const serveInitTwiml = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.type('xml')
        .send(`<Response>
        <Connect>
          <Stream url='${constants_1.ServerConstants.twiCallWsUrl}' />
        </Connect>
      </Response>`);
});
exports.serveInitTwiml = serveInitTwiml;
const handleTwilioStatusCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const update = req.body;
    console.log(`call status update: ${update.CallStatus} `);
    res.json({ "success": true }).status(200);
});
exports.handleTwilioStatusCallback = handleTwilioStatusCallback;
const handleTwilioStopCall = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ "success": true }).status(200);
});
exports.handleTwilioStopCall = handleTwilioStopCall;
function handleWs(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        ws.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
            const event = JSON.parse(message.toString());
            if (event) {
                switch (event.event) {
                    case constants_1.TwilioSockEvents.connected:
                        console.log(`New Ws Connection Established`);
                        break;
                    case constants_1.TwilioSockEvents.start:
                        const payload = event;
                        const call = exports.proTwilioCalls.find(c => c.callSid === payload.start.callSid);
                        if (call) {
                            const callIndex = exports.proTwilioCalls.indexOf(call);
                            call.wsConnection = ws;
                            call.streamSid = payload.streamSid;
                            exports.proTwilioCalls[callIndex] = call;
                            yield exports.proTwilioCalls[callIndex].setUpHandler();
                            console.log(`Connected to call ${call.callSid}`);
                            yield exports.proTwilioCalls[callIndex].introduceYourSelf();
                        }
                        break;
                    case constants_1.TwilioSockEvents.stop:
                        const stopPayload = event;
                        const stopCall = exports.proTwilioCalls.find(c => c.callSid === stopPayload.stop.callSid);
                        if (stopCall) {
                            stopCall.callEnded = true;
                            console.log(`Call ${stopCall.callSid} ended`);
                        }
                        break;
                    case constants_1.TwilioSockEvents.media:
                        const mediaPayload = event;
                        const mediaCall = exports.proTwilioCalls.find(c => c.streamSid === mediaPayload.streamSid);
                        if (mediaCall && mediaCall.wsConnection) {
                            mediaCall.handleWsmedia(mediaPayload);
                        }
                        ;
                        break;
                }
            }
        }));
    });
}
function sendSms() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const message = yield exports.twilioClient.messages.create({
                body: 'Hello from Node',
                from: '+19088834007',
                to: '+919025278909'
            });
            console.log(message);
        }
        catch (e) {
            console.error(e);
        }
    });
}
function sendEmail() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const mailOptions = {
                from: "support@profinix.tech", // Use your verified sender email
                to: "rajajanarthanan@gmail.com",
                subject: "",
                html: (0, constants_1.otpEmailHtmlBody)("")
            };
            yield exports.transporter.sendMail(mailOptions);
        }
        catch (e) {
            console.error(e);
        }
    });
}
exports.transporter = nodemailer.createTransport({
    host: "us2.smtp.mailhostbox.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
        user: "support@profinix.tech",
        pass: "Profinix@777",
    }
});
