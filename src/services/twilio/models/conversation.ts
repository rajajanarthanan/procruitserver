export class Conversation {
    public promptChatItem: ChatItem;
    public chatHistory: ChatItem[];
    constructor(systemPrompt: string){
        this.promptChatItem = {
            role: ChatRole.SYSTEM,
            content: systemPrompt
        };
        this.chatHistory = [];
    }

    getUpdatedConversation = (newChatItem: ChatItem) => {
        this.chatHistory.push(newChatItem);
        this.chatHistory = (this.chatHistory.length < 40) ? this.chatHistory : this.chatHistory.splice(0,this.chatHistory.length - 40);
        return [this.promptChatItem,...this.chatHistory];
    };
}



export interface ChatItem{
    role: ChatRole;
    content: string;
  }

export enum ChatRole{
    USER = "user",
    ASSISTANT = "assistant",
    SYSTEM = "system"
  }
  