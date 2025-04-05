export type TwilioSockEvent = TwilioSockEventConnected | TwilioSockEventStart | TwilioSockEventMedia | TwilioSockEventStop;

export interface TwilioSockEventConnected{
    event: string;
    protocol: string;
    version: string;
}

export interface TwilioSockEventStart{
    event: string;
    sequenceNumber: string;
    start: {
        accountSid: string;
        streamSid: string;
        callSid: string;
        tracks: string[];
        mediaFormat: {
            encoding: string;
            sampleRate: number;
            channels: number;
        };
        customParameters: {
            name: string;
        };
    };
    streamSid: string;
}

export enum TwilioMediaTrack{
    inbound = "inbound",
    outbound = "outbound",
    both = "both"
}

export interface TwilioSockEventMedia{
    event: string;
    sequenceNumber: string;
    media: {
        track: string;
        chunk: string;
        timestamp: string;
        payload: string;
    };
    streamSid: string;
}

export interface TwilioSockEventStop{
    event: string;
    sequenceNumber: string;
    stop: {
        accountSid: string;
        callSid: string;
    };
    streamSid: string;
}