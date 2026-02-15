import { sendDeeplTranslate } from "../../protocol/messages";

export async function deeplTranslate(texts: string[], targetLang: string) {
  return sendDeeplTranslate({ texts, targetLang });
}
