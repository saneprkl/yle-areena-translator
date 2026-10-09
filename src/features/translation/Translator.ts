export interface Translator {
  translate(texts: string[], targetLanguage: string): Promise<string[]>;
}
