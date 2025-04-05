import {createClient, DeepgramClient, LiveTranscriptionEvents} from '@deepgram/sdk';



const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

export const getNewDeepgramClient = () => {
  const deepgram = createClient(deepgramApiKey);
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



export async function synthesizeAudio(response: string, deepgram: DeepgramClient){
    const audio = await deepgram.speak.request(
      { text: response },
      {
        model: 'aura-athena-en', //'aura-venus-en',
        encoding: 'mulaw',
        container: 'none',
        sample_rate: 8000
      }
    );
    const stream = await audio.getStream();
    if(stream) {
      return getAudioBuffer(stream);
    }else{
      throw new Error('Error generating audio');
    }
  }


  async function getAudioBuffer(response: ReadableStream){
    const reader = response.getReader();
    const chunks = [];
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  