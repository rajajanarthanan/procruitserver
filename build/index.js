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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const constants_1 = require("./config/constants");
const twilio_1 = require("./services/twilio/twilio");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.json({ "success": true }).status(200);
});
const PORT = 3030;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
app.post(constants_1.ServerEndpoint.twilioMakeCall, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, twilio_1.handleTwilioMakeCall)(req, res);
}));
app.post(constants_1.ServerEndpoint.twilioInitCall, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, twilio_1.serveInitTwiml)(req, res);
}));
// app.post(ServerEndpoint.twilioStatusCallBack, async (req: Request, res: Response) => {
//     await handleTwilioStatusCallback(req, res);    
// });
app.post(constants_1.ServerEndpoint.twilioStopCall, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, twilio_1.handleTwilioStopCall)(req, res);
}));
app.post(constants_1.ServerEndpoint.twilioStatusCallBackUpdate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, twilio_1.handleTwilioStatusCallback)(req, res);
}));
wss.on('connection', (ws) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, twilio_1.handleWs)(ws);
}));
// sendSms();
// parseResume();
