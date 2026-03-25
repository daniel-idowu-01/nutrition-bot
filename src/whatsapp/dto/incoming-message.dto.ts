export interface WhatsAppMediaMessage {
    id: string;
    mime_type: string;
  }
  
  export interface WhatsAppTextMessage {
    body: string;
  }
  
  export interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'image' | 'text' | 'audio' | 'document';
    image?: WhatsAppMediaMessage;
    text?: WhatsAppTextMessage;
  }
  
  export interface IncomingWebhookDto {
    object: string;
    entry: Array<{
      changes: Array<{
        value: {
          messages?: WhatsAppMessage[];
          statuses?: any[];
        };
      }>;
    }>;
  }