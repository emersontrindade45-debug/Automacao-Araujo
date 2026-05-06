// ---- Evolution API (WhatsApp via Evolution) ----

export type EvolutionMessageType =
  | "conversation"
  | "extendedTextMessage"
  | "audioMessage"
  | "imageMessage"
  | "videoMessage"
  | "documentMessage"
  | "stickerMessage"
  | "reactionMessage"
  | string;

export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface EvolutionMessageContent {
  // texto simples
  conversation?: string;
  // texto com formatação
  extendedTextMessage?: { text: string };
  // áudio
  audioMessage?: {
    url?: string;
    mimetype?: string;
    fileLength?: string;
    seconds?: number;
    base64?: string;
  };
  // imagem
  imageMessage?: { url?: string; mimetype?: string; caption?: string };
}

export interface EvolutionMessageData {
  key: EvolutionMessageKey;
  pushName?: string;
  message: EvolutionMessageContent;
  messageType: EvolutionMessageType;
  messageTimestamp: number;
  instanceId?: string;
  source?: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

// Helpers para extrair dados do payload Evolution
export function evolutionGetTelefone(data: EvolutionMessageData): string {
  // remoteJid vem como "5511999999999@s.whatsapp.net" ou "5511999999999@g.us" (grupo)
  return data.key.remoteJid.split("@")[0];
}

export function evolutionGetTexto(data: EvolutionMessageData): string | null {
  const msg = data.message;
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    null
  );
}

export function evolutionIsAudio(data: EvolutionMessageData): boolean {
  return data.messageType === "audioMessage";
}

export function evolutionIsGrupo(data: EvolutionMessageData): boolean {
  return data.key.remoteJid.endsWith("@g.us");
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
