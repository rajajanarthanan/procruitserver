This project is a simple agentic AI featuring,
1. Build Fixed length extract of a resume from inter-connected chunks
2. Build Fixed length extract of the job description
3. Matching resume against job description
4. Simple screening call with the candidate
5. Reports back the summary of the candidature for the job

TODO:
#On-Prem_Environment_inference
6. Vectorize 1 & 2, store in chromaDb/OpenSearch
7. Implement FAISS for semantic search
8. Implement ollama+llama, coqui for tts & whisper for stt
9. Integrate plivo & other service providers
10. Android client to automate PSTN calls as default dialer with AudioManager api (Only Rooted Devices)

Environment:
*Twilio for communication
*GroqCloud to infer the LLM: Llama3
*Deepgram SDK
