import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Send a message to OpenAI and get a response
   */
  async getChatCompletion(userMessage: string): Promise<string> {
    try {
      this.logger.log(`Sending message to OpenAI: ${userMessage.substring(0, 50)}...`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide clear, concise, and friendly responses.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

      this.logger.log(`Received response from OpenAI: ${response.substring(0, 50)}...`);

      return response;
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a message with conversation history
   */
  async getChatCompletionWithHistory(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    try {
      this.logger.log(`Sending conversation to OpenAI with ${messages.length} messages`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

      return response;
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`);
      throw error;
    }
  }
}
