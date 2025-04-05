"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeParsingPrompt = exports.otpEmailHtmlBody = exports.TwilioSockEvents = exports.TwilioCallBackEvents = exports.ServerConstants = exports.ServerEndpoint = exports.sampleJobDescription = void 0;
exports.sampleJobDescription = `
Job Title: Software Engineer
Location: Sunnyvale, California
Company: Apple Inc.
Job Type: Full-time
Salary: $80,000 - $120,000 per year
Job Description:
We are seeking a talented and motivated Software Engineer to join our dynamic team at Tech Innovations Inc. As a Software Engineer, you will be responsible for designing, developing, and maintaining software applications that meet the needs of our clients. You will work closely with cross-functional teams to deliver high-quality software solutions.
Responsibilities:
- Collaborate with product managers, designers, and other engineers to define software requirements and specifications.
- Design, develop, and maintain software applications using modern programming languages and frameworks.
- Write clean, efficient, and maintainable code.
- Conduct code reviews and provide constructive feedback to team members.
- Troubleshoot and debug software issues.
- Participate in the full software development lifecycle, including planning, development, testing, and deployment.
- Stay up-to-date with emerging technologies and industry trends.
- Contribute to the continuous improvement of our development processes and practices.
- Mentor and support junior engineers.
- Participate in team meetings and contribute to project planning and estimation.
- Collaborate with cross-functional teams to ensure successful project delivery.
- Document software designs, processes, and procedures.
- Ensure software applications are scalable, secure, and performant.
- Participate in on-call support rotation as needed.
Qualifications:
- Bachelor's degree in Computer Science, Software Engineering, or a related field.
- 3+ years of experience in software development.
- Proficiency in one or more programming languages (e.g., Java, Python, C#, JavaScript).
- Experience with web development frameworks (e.g., React, Angular, Django).
- Familiarity with database technologies (e.g., SQL, NoSQL).
- Strong understanding of software development principles and best practices.
- Experience with version control systems (e.g., Git).
- Knowledge of Agile development methodologies.
- Excellent problem-solving skills and attention to detail.
- Strong communication and collaboration skills.
- Ability to work independently and as part of a team.
- Willingness to learn and adapt to new technologies.
- Experience with cloud platforms (e.g., AWS, Azure, Google Cloud) is a plus.
- Familiarity with DevOps practices and tools (e.g., Docker, Kubernetes) is a plus.
`;
exports.ServerEndpoint = {
    twilioMakeCall: "/twilio/makeCall",
    twilioInitCall: "/twilio/initCall",
    twilioStopCall: "/twilio/stopCall",
    twilioStatusCallBackUpdate: "/twilio/statusCallBackUpdate",
};
const baseUrl = "https://perfectly-shining-flounder.ngrok-free.app";
exports.ServerConstants = {
    initTwimlUrl: `${baseUrl}${exports.ServerEndpoint.twilioInitCall}`,
    twiStatusCallBackUrl: `${baseUrl}${exports.ServerEndpoint.twilioStatusCallBackUpdate}`,
    twiMakeCallUrl: `${baseUrl}${exports.ServerEndpoint.twilioMakeCall}`,
    twiStopCallUrl: `${baseUrl}${exports.ServerEndpoint.twilioStopCall}`,
    twiCallWsUrl: `wss://perfectly-shining-flounder.ngrok-free.app/twilio/call`,
};
exports.TwilioCallBackEvents = {
    initiated: "initiated",
    ringing: "ringing",
    answered: "answered",
    completed: "completed",
};
exports.TwilioSockEvents = {
    connected: "connected",
    start: "start",
    stop: "stop",
    media: "media",
};
const otpEmailHtmlBody = (otp) => ``;
exports.otpEmailHtmlBody = otpEmailHtmlBody;
const resumeParsingPrompt = (chunk, jdChunk, parsedRes) => `
You are a highly skilled resume parser. Your task is to analyze the provided resume and job description, extract relevant information, and provide a detailed analysis of the candidate's qualifications and fit for the position. Please follow the structure below:
1. Candidate Information: Extract and summarize the candidate's personal information, including name, contact details, and location.
2. Summary: Provide a brief summary of the candidate's professional background and key qualifications.
3. Skills: List the candidate's technical and soft skills relevant to the job description.  
4. Work Experience: Summarize the candidate's work experience, including job titles, companies, and key responsibilities.   
5. Education: Extract and summarize the candidate's educational background, including degrees, institutions, and graduation dates.
6. Certifications: List any relevant certifications or training the candidate has completed.
7. Job Description Match: Analyze the job description and identify how the candidate's qualifications align with the requirements. Highlight any gaps or areas for improvement.
8. Recommendations: Provide recommendations for the candidate to improve their resume or qualifications based on the job description.
9. Conclusion: Summarize the overall fit of the candidate for the position and any additional comments or observations.`;
exports.resumeParsingPrompt = resumeParsingPrompt;
