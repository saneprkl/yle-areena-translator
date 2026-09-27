import type { TranslationProvider } from "../../global/types";
import { deeplTranslate } from "../../content/areena/deeplBridge";
import { googleTranslator } from "./providers/google/GoogleTranslator";
import type { Translator } from "./Translator";

const deeplTranslator: Translator = {
  translate: deeplTranslate,
};

export const getTranslator = (provider: TranslationProvider): Translator => {
  switch (provider) {
    case "deepl":
      return deeplTranslator;
    case "google":
      return googleTranslator;
  }
};
