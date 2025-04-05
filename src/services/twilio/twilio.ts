import { Request, Response } from 'express';
import { CallInstance } from 'twilio/lib/rest/api/v2010/account/call';
import Twilio from 'twilio';

import { TwilioCallStatusCallBack } from './models/status_calllback';
import { WebSocket } from 'ws';
import { TwilioSockEvent, TwilioSockEventMedia, TwilioSockEventStart, TwilioSockEventStop } from './models/twilio_sock_event';
import { DeepgramClient, ListenLiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { getNewDeepgramClient, synthesizeAudio } from '../deepgram/deepgram';
import { ChatRole, Conversation } from './models/conversation';
import Groq from 'groq-sdk';
import * as nodemailer from "nodemailer";
import { systemPromptV3 } from '../../config/newPrompts';
import { otpEmailHtmlBody, sampleJobDescription, ServerConstants, TwilioCallBackEvents, TwilioSockEvents } from '../../config/constants';


const groqApiKey = process.env.GROQ_API_KEY;

export const groq = new Groq({ apiKey: groqApiKey });

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

if (!twilioAccountSid || !twilioAuthToken) {
  throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set.");
}

/**creates twilio client */
export const twilioClient = Twilio(twilioAccountSid, twilioAuthToken);


/***
 * holds all the twilio call instances and manage the calls
 */
export const proTwilioCalls: ProTwilioCall[] = [];



export class ProTwilioCall{
    constructor(){
        const deepgramConTimer = setInterval(() => {
            if(this.deepgramConnection) {
                this.deepgramConnection.keepAlive();
            }
            if(this.callEnded) clearInterval(deepgramConTimer);
        }, 10 * 1000);
        
    };
    callSid: string | undefined = undefined;
    streamSid: string | undefined = undefined;
    callInstance: CallInstance | undefined = undefined;
    callEnded: boolean = false;
    wsConnection: WebSocket | undefined = undefined;
    deepgramClient: DeepgramClient | undefined = undefined;
    deepgramConnection: ListenLiveClient | undefined = undefined;
    audioTransmitterTimer: NodeJS.Timeout | undefined = undefined;
    conversation: Conversation | undefined = undefined;
    jdText: string = sampleJobDescription;
    transcriptQue: string[] = [];
    transcriptPrcessingTimer: NodeJS.Timeout | undefined = undefined;
    /**places new call and returns the call sid */
    async makeNewCall(req: Request): Promise<String | undefined>{
        try{
        const { fromNumber, toNumber, recordCall } = req.body;
            if(!fromNumber ||  !toNumber){
                console.log('No from or to number provided');
                return undefined;
            }else{
                this.callInstance = await twilioClient.calls.create({
                    url: ServerConstants.initTwimlUrl,
                    to: toNumber,
                    from: fromNumber,
                    record: recordCall ?? false,
                    statusCallback: ServerConstants.twiStatusCallBackUrl,
                    statusCallbackEvent: Object.values(TwilioCallBackEvents),
                    statusCallbackMethod: "POST"
                });
                this.callSid = this.callInstance.sid;
                console.log(`Call made with sid ${this.callSid}`);
                return this.callSid;
            }
        }catch(e){
            console.error("Error making call", e);
            return undefined;
        }        
    }


    async setUpHandler(){
        if(!this.deepgramClient || !this.deepgramConnection){
            const getDeepgramRes = await getNewDeepgramClient();
            this.deepgramClient = getDeepgramRes.deepgramClient;
            this.deepgramConnection = getDeepgramRes.connection;
            
        }
        
        this.deepgramConnection.addListener(LiveTranscriptionEvents.Open, async () => {
           this.deepgramConnection?.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
            if(data.channel?.alternatives[0]?.transcript &&
                data.channel?.alternatives[0]?.transcript.trim().length > 0){
                if(this.audioTransmitterTimer) clearTimeout(this.audioTransmitterTimer);
                const transcript = data.channel.alternatives[0].transcript.trim();
                this.transcriptQue.push(transcript);
                if(this.transcriptPrcessingTimer) clearTimeout(this.transcriptPrcessingTimer);
                this.transcriptPrcessingTimer = setTimeout(async () => {
                    const transcriptPayload = this.transcriptQue.join(' ');
                    this.transcriptQue = [];
                    console.log('Candidate Said: ',transcriptPayload); 
                    await this.handleTranscript(transcriptPayload);
                }, 2000);
                
            } 
           });
        });
    }
    
    async handleTranscript(transcript: string){
        if(!this.wsConnection) return;
        if(!this.conversation) this.conversation = new Conversation(systemPromptV3);
        const newChatItem = {
            role: ChatRole.USER,
            content: transcript
        }
        const updatedConversationHistory = this.conversation.getUpdatedConversation(newChatItem);
        const completion = await groq.chat.completions.create({
            messages: updatedConversationHistory,
            model: "llama3-8b-8192",
            temperature: 1,
            max_tokens: 1024,
            top_p: 1,
            stream: false,
            stop: null
          });
        
          const response = completion.choices[0].message.content;
          if(response && this.deepgramClient){
            
            const audioBuffer = await synthesizeAudio(response, this.deepgramClient);
            if(audioBuffer){
                
            if(!this.conversation) return;
            this.conversation.getUpdatedConversation({
            role: ChatRole.ASSISTANT,
            content: response
            });

            console.log('ProCruitAi Said: ',response);
            this.audioTransmitterTimer = await this.sendAudio(audioBuffer);
                
                
                
                
            }
          }
    }

    async sendAudio(audioBuffer: Buffer){
        if(!this.wsConnection) return;
        if(this.wsConnection.readyState !== WebSocket.OPEN) return;
        try{
            return setTimeout(() => {
                this.wsConnection!.send(JSON.stringify({
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

        }catch(e){
            console.error('Error Sending Audio to Client',e);
        }
    }

    async introduceYourSelf(){
        // if(this.deepgramClient){
        //     const welcomeBuffer = await synthesizeAudio(introPrompt, this.deepgramClient);
        //     if(welcomeBuffer){
        //         const welcomeTimer = await this.sendAudio(welcomeBuffer);
        //     }
        // }
        
    }

    handleWsmedia(mediaPayload: TwilioSockEventMedia){
        if(!this.deepgramClient || !this.deepgramConnection){
            const getDeepgramRes = getNewDeepgramClient();
            this.deepgramClient = getDeepgramRes.deepgramClient;
            this.deepgramConnection = getDeepgramRes.connection;
        }
        if(this.deepgramConnection){
            const msg = Buffer.from(mediaPayload.media.payload, 'base64');
            const arrayBuffer = msg.buffer.slice(
                msg.byteOffset, msg.byteOffset + msg.byteLength
            );
            
            this.deepgramConnection.send(arrayBuffer);
        }
        
    }


}


export const handleTwilioMakeCall = async (req: Request, res: Response) => {
    const newCall = new ProTwilioCall();
    proTwilioCalls.push(newCall);
    const result = await newCall.makeNewCall(req);
    if(!result){
        proTwilioCalls.pop();
        res.json({"success": false, "message": "Failed to make call"}).status(200);
    }else{
        res.json({"success": true, "callSid": result}).status(200);
    }
}

export const serveInitTwiml = async (req: Request, res: Response) => {
    res.type('xml')
    .send(
      `<Response>
        <Connect>
          <Stream url='${ServerConstants.twiCallWsUrl}' />
        </Connect>
      </Response>`
    );  
};

export const handleTwilioStatusCallback = async (req: Request, res: Response) => {
    const update = req.body as Partial<TwilioCallStatusCallBack>;
    console.log(`call status update: ${update.CallStatus} `);
    res.json({"success": true}).status(200);
};

export const handleTwilioStopCall = async (req: Request, res: Response) => {
    res.json({"success": true}).status(200);
};

export async function handleWs(ws: WebSocket){
    ws.on('message', async (message: any) => {
        const event = JSON.parse(message.toString()) as TwilioSockEvent;
        if(event){
            switch(event.event){
                case TwilioSockEvents.connected:
                    console.log(`New Ws Connection Established`);
                    break;
                case TwilioSockEvents.start:
                    const payload = event as TwilioSockEventStart;
                    const call = proTwilioCalls.find(c => c.callSid === payload.start.callSid);
                    if(call){
                        const callIndex = proTwilioCalls.indexOf(call);
                        call.wsConnection = ws;
                        call.streamSid = payload.streamSid;
                        proTwilioCalls[callIndex] = call;
                        await proTwilioCalls[callIndex].setUpHandler();
                        console.log(`Connected to call ${call.callSid}`);
                        await proTwilioCalls[callIndex].introduceYourSelf();
                    }
                    break;
                case TwilioSockEvents.stop:
                    const stopPayload = event as TwilioSockEventStop;
                    const stopCall = proTwilioCalls.find(c => c.callSid === stopPayload.stop.callSid);
                    if(stopCall){
                        stopCall.callEnded = true;
                        console.log(`Call ${stopCall.callSid} ended`);
                    }
                    break;
                case TwilioSockEvents.media:
                    const mediaPayload = event as TwilioSockEventMedia;
                    const mediaCall = proTwilioCalls.find(c => c.streamSid === mediaPayload.streamSid);
                    

                    if(mediaCall && mediaCall.wsConnection){
                        mediaCall.handleWsmedia(mediaPayload);                    
                        
                    };
                    break;
            }
        }
    });

}



export async function sendSms(){
    try{
        const message = await twilioClient.messages.create({
            body: 'Hello from Node',
            from: '+19088834007',
            to: '+919025278909'
        });
        console.log(message);
    }catch(e){
        console.error(e);
    }
}

export async function sendEmail(){
    try{
        const mailOptions = {
            from: "support@profinix.tech",
            to: "rajajanarthanan@gmail.com",
            subject: "",
            html: otpEmailHtmlBody("")
          };
          await transporter.sendMail(mailOptions);
       
    }catch(e){
        console.error(e);
    }
}



export const transporter = nodemailer.createTransport({
    host: "us2.smtp.mailhostbox.com",
    port: 587,
    secure: false,
    auth: {
      user: "support@profinix.tech",
      pass: "ThePasswordIsSecret",
    }
  });



  