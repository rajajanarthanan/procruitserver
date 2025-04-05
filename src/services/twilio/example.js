const express = require('express');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { Groq } = require('groq-sdk');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 3000;
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const wsUrl = process.env.REPLIT_DEV_DOMAIN;

// This is the first message that the AI will say once the call connects.
const welcomeMessage = "Hello, how are you today. Can I take your order please.";

console.log("Add This To Twilio Voice Request URL: ", "https://"+wsUrl+":3000/");
console.log("***********************");

app.use(express.static('public'));

app.get('/', (_, res) => res.type('text').send('Twilio media stream transcriber'));

app.post('/', async (_, res) => {
  res.type('xml')
    .send(
      `<Response>
        <Connect>
          <Stream url='wss://${wsUrl}:3000' />
        </Connect>
      </Response>`
    );
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const wss = new WebSocket.Server({ server });

const chatHistory = [];
let currentAudioTimer;

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  console.log(wsUrl);

  let deepgramConnection;

  ws.on('open', async () => {
    await sendWelcomeMessage(ws);
  });

  if (ws.readyState === WebSocket.OPEN) {
    sendWelcomeMessage(ws);
  }

  ws.on('message', async (message) => {
    const msg = JSON.parse(message);

    switch (msg.event) {
      case 'start':
        console.log('Starting Media Stream:', msg.streamSid);
        global.myNumberID = msg.streamSid;
        initializeDeepgram(ws);
        break;
      case 'media':
        if (deepgramConnection) {
          const audio = Buffer.from(msg.media.payload, 'base64');
          deepgramConnection.send(audio);
        }
        break;
      case 'stop':
        console.log('Stopping Media Stream:', msg.streamSid);
        if (deepgramConnection) {
          deepgramConnection.finish();
        }
        break;
    }
  });

  function initializeDeepgram(ws) {
    deepgramConnection = deepgramClient.listen.live({
      encoding: 'mulaw',
      sample_rate: 8000,
      channels: 1,
      model: 'nova-phonecall',
      smart_format: true,
    });

    deepgramConnection.on(LiveTranscriptionEvents.Open, () => console.log('Deepgram connection opened'));
    deepgramConnection.on(LiveTranscriptionEvents.Close, () => console.log('Deepgram connection closed'));

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, async (transcription) => {
      if (transcription.channel?.alternatives?.[0]?.transcript) {
        const transcript = transcription.channel.alternatives[0].transcript.trim();
        console.log('Transcript:', transcript);

        if (transcript) {
          try {
            // Stop any existing audio before processing the new transcript
            clearTimeout(currentAudioTimer);

            const messages = [
              {
                role: "system",
                content: "You work at a London Sandwich Bar and you're answering the phone taking people's takeaway orders. You'll be friendly and helpful and try to get people to buy the muscle and pickled sandwich as that is the special for today which costs four pounds each. Soft drinks cost one pound and there are six different types of cake that cost £2 per slice. Once you've taken their order you will read it back to them and tell them to have a nice day. Most importantly, keep all of your conversations to 20 words or less. At the start of the order, please ask me for my name and also what time I wish to pick up the order before you start taking my order."
              },
              ...chatHistory,
              {
                role: "user",
                content: transcript
              }
            ];

            const completion = await groq.chat.completions.create({
              messages,
              model: "llama3-8b-8192",
              temperature: 1,
              max_tokens: 1024,
              top_p: 1,
              stream: false,
              stop: null
            });

            const response = completion.choices[0].message.content;
            console.log('Groq response:', response);

            // Update chat history
            chatHistory.push({ role: "user", content: transcript });
            chatHistory.push({ role: "assistant", content: response });

            // Limit chat history to last 40 messages
            if (chatHistory.length > 40) {
              chatHistory.splice(0, chatHistory.length - 40);
            }

            const audioBuffer = await synthesizeAudio(response);
            currentAudioTimer = sendAudioToClient(ws, audioBuffer);
            //console.log('Response sent to Twilio:', response);
          } catch (error) {
            console.error('Error processing with Groq:', error);
          }
        }
      }
    });
  }

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    if (deepgramConnection) {
      deepgramConnection.finish();
    }
  });
});

async function sendWelcomeMessage(ws) {
  console.log('Sending welcome message:', welcomeMessage);

  try {
    const welcomeAudioBuffer = await synthesizeAudio(welcomeMessage);
    const welcomeAudioTimer = sendAudioToClient(ws, welcomeAudioBuffer);
    console.log('Welcome message sent successfully');
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

async function synthesizeAudio(text) {
  const response = await deepgramClient.speak.request(
    { text },
    {
      model: 'aura-helios-en',
      encoding: 'mulaw',
      container: 'none',
      sample_rate: 8000,
    }
  );

  const stream = await response.getStream();
  if (stream) {
    return getAudioBuffer(stream);
  } else {
    throw new Error('Error generating audio');
  }
}

async function getAudioBuffer(response) {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function sendAudioToClient(ws, audioBuffer) {
  if (ws.readyState === WebSocket.OPEN) {
    return setTimeout(() => {
      ws.send(
        JSON.stringify({
          event: "media",
          sequenceNumber: "4",
          media: {
            track: "outbound",
            chunk: "2",
            timestamp: "4",
            payload: audioBuffer.toString('base64')
          },
          streamSid: global.myNumberID
        })
      );
    }, 100);
  } else {
    console.error('WebSocket is not open. Cannot send audio.');
  }
}