// Transcreve áudio via Whisper (OpenAI).
// Aceita base64, URL direta (Evolution API) ou media ID da Graph API (Meta).
export async function transcreverAudio(
  fonte: string,
  mimeType: string
): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.warn("[whisper] OPENAI_API_KEY não configurada");
    return null;
  }

  let audioBlob: Blob | null = null;
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";

  if (isBase64(fonte)) {
    // Evolution envia áudio como base64
    const buffer = Buffer.from(fonte, "base64");
    audioBlob = new Blob([buffer], { type: mimeType });
  } else if (fonte.startsWith("http")) {
    // URL direta — tenta baixar sem autenticação (Evolution CDN)
    const res = await fetch(fonte);
    if (!res.ok) {
      console.error("[whisper] falha ao baixar áudio da URL:", res.status);
      return null;
    }
    audioBlob = await res.blob();
  } else {
    // Fallback: media ID da Graph API do Meta
    const waToken = process.env.WHATSAPP_TOKEN;
    if (!waToken) {
      console.warn("[whisper] WHATSAPP_TOKEN não configurado para Graph API");
      return null;
    }

    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${fonte}`, {
      headers: { Authorization: `Bearer ${waToken}` },
    });

    if (!mediaRes.ok) {
      console.error("[whisper] falha ao obter metadados do áudio:", mediaRes.status);
      return null;
    }

    const { url } = (await mediaRes.json()) as { url: string };
    const audioRes = await fetch(url, {
      headers: { Authorization: `Bearer ${waToken}` },
    });

    if (!audioRes.ok) {
      console.error("[whisper] falha ao baixar áudio:", audioRes.status);
      return null;
    }

    audioBlob = await audioRes.blob();
  }

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

function isBase64(str: string): boolean {
  if (str.length < 100) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(str.replace(/\s/g, ""));
}
