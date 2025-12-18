import { type User, type InsertUser, type Conversation, type ConversationMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getConversation(sessionId: string): Promise<Conversation | undefined>;
  saveConversation(sessionId: string, persona: string, language: string, messages: ConversationMessage[]): Promise<Conversation>;
  appendMessages(sessionId: string, messages: ConversationMessage[]): Promise<Conversation>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    return this.conversations.get(sessionId);
  }

  async saveConversation(sessionId: string, persona: string, language: string, messages: ConversationMessage[]): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      sessionId,
      persona,
      language,
      messages,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(sessionId, conversation);
    return conversation;
  }

  async appendMessages(sessionId: string, messages: ConversationMessage[]): Promise<Conversation> {
    let conversation = this.conversations.get(sessionId);
    if (!conversation) {
      conversation = {
        sessionId,
        persona: "assistant",
        language: "en",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    conversation.messages = [...(Array.isArray(conversation.messages) ? conversation.messages : []), ...messages];
    conversation.updatedAt = new Date();
    this.conversations.set(sessionId, conversation);
    return conversation;
  }
}

export const storage = new MemStorage();
