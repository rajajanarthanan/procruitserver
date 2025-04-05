export interface TwilioCallStatusCallBack {
    Called: string;
    ToState: string;
    CallerCountry: string;
    Direction: string; //'outbound-api';
    Timestamp: string;
    CallbackSource: string; // 'call-progress-events';
    SipResponseCode: string;
    CallerState: string;
    ToZip: string;
    SequenceNumber: string;
    CallSid: string;
    To: string;
    CallerZip: string;
    ToCountry: string;
    CalledZip: string;
    ApiVersion: string; //'2010-04-01';
    CalledCity: string;
    CallStatus: string; //'completed' | 'in-progress' | 'queued' | 'ringing' | 'failed' | 'busy' | 'no-answer' | 'canceled'; 
    Duration: string;
    From: string;
    CallDuration: string;
    AccountSid: string;
    CalledCountry: string;
    CallerCity: string;
    ToCity: string;
    FromCountry: string;
    Caller: string;
    FromCity: string;
    CalledState: string;
    FromZip: string;
    FromState: string;
  }
  