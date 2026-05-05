// ---- WhatsApp Business API ----

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text";
  text: { body: string };
}

export interface WhatsAppAudioMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "audio";
  audio: { id: string; mime_type: string };
}

export type WhatsAppMessage = WhatsAppTextMessage | WhatsAppAudioMessage;

export interface WhatsAppValue {
  messaging_product: "whatsapp";
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: unknown[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppPayload {
  object: "whatsapp_business_account";
  entry: WhatsAppEntry[];
}

// ---- Instagram Messaging API ----

export interface InstagramSender {
  id: string;
}

export interface InstagramRecipient {
  id: string;
}

export interface InstagramMessage {
  mid: string;
  text?: string;
  attachments?: { type: string; payload: { url: string } }[];
}

export interface InstagramMessaging {
  sender: InstagramSender;
  recipient: InstagramRecipient;
  timestamp: number;
  message?: InstagramMessage;
}

export interface InstagramEntry {
  id: string;
  time: number;
  messaging: InstagramMessaging[];
}

export interface InstagramPayload {
  object: "instagram";
  entry: InstagramEntry[];
}
