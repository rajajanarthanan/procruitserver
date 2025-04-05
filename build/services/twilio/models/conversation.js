"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRole = exports.Conversation = void 0;
class Conversation {
    constructor(systemPrompt) {
        this.getUpdatedConversation = (newChatItem) => {
            this.chatHistory.push(newChatItem);
            this.chatHistory = (this.chatHistory.length < 40) ? this.chatHistory : this.chatHistory.splice(0, this.chatHistory.length - 40);
            return [this.promptChatItem, ...this.chatHistory];
        };
        this.promptChatItem = {
            role: ChatRole.SYSTEM,
            content: systemPrompt
        };
        this.chatHistory = [];
    }
}
exports.Conversation = Conversation;
var ChatRole;
(function (ChatRole) {
    ChatRole["USER"] = "user";
    ChatRole["ASSISTANT"] = "assistant";
    ChatRole["SYSTEM"] = "system";
})(ChatRole || (exports.ChatRole = ChatRole = {}));
