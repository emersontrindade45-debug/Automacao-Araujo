export async function transcreverAudio(audioId: string, mimeType: string): Promise<string | null> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!waToken || !openaiKey) {
    console.warn("[whisper] WHATSAPP_TOKEN ou OPENAI_API_KEY não configurados");
    return null;
  }

  // 1. Obter URL de download do áudio via Graph API do Meta
  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${audioId}`, {
    headers: { Authorization: `Bearer ${waToken}` },
  });

  if (!mediaRes.ok) {
    console.error("[whisper] falha ao obter metadados do áudio:", mediaRes.status);
    return null;
  }

  const { url } = (await mediaRes.json()) as { url: string };

  // 2. Baixar o arquivo de áudio
  const audioRes = await fetch(url, {
    headers: { Authorization: `Bearer ${waToken}` },
  });

  if (!audioRes.ok) {
    console.error("[whisper] falha ao baixar áudio:", audioRes.status);
    return null;
  }

  const audioBlob = await audioRes.blob();

  // 3. Enviar para Whisper (OpenAI)
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";
  const file = new File([audioBlob], `audio.${ext}`, { type: mimeType });

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("language", "pt");

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  if (!whisperRes.ok) {
    console.error("[whisper] falha na transcrição:", whisperRes.status);
    return null;
  }

  const { text } = (await whisperRes.json()) as { text: string };
  return text.trim();
}
