import express, { Request, Response } from 'express';
import http, { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ServerEndpoint } from './config/constants';
import {  handleTwilioMakeCall, handleTwilioStatusCallback, handleTwilioStopCall, handleWs, serveInitTwiml } from './services/twilio/twilio';
import { parseResume, readResumes } from './services/doc_utils';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.json({"success": true}).status(200);
});

const PORT = 3030;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`); 
});

app.post(ServerEndpoint.twilioMakeCall, async (req: Request, res: Response) => {
    await handleTwilioMakeCall(req, res);    
});


app.post(ServerEndpoint.twilioInitCall, async (req: Request, res: Response) => {
    await serveInitTwiml(req, res);    
});

// app.post(ServerEndpoint.twilioStatusCallBack, async (req: Request, res: Response) => {
//     await handleTwilioStatusCallback(req, res);    
// });

app.post(ServerEndpoint.twilioStopCall, async (req: Request, res: Response) => {
    await handleTwilioStopCall(req, res);    
});

app.post(ServerEndpoint.twilioStatusCallBackUpdate, async (req: Request, res: Response) => {
    await handleTwilioStatusCallback(req, res);    
});

wss.on('connection',async (ws: WebSocket) => {
    await handleWs(ws);
});

// sendSms();


// parseResume();

