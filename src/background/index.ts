import {
  handleDeeplTranslateRequest,
  handleDeeplUsageRequest,
  isDeeplTranslateMessage,
  isDeeplUsageMessage,
} from "../features/translation/providers/deepl/deeplMessages";
import {
  handleGoogleTranslateRequest,
  isGoogleTranslateMessage,
} from "../features/translation/providers/google/googleMessages";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (isDeeplTranslateMessage(msg)) {
    void handleDeeplTranslateRequest(msg.payload).then(sendResponse);
    return true;
  }

  if (isDeeplUsageMessage(msg)) {
    void handleDeeplUsageRequest().then(sendResponse);
    return true;
  }

  if (isGoogleTranslateMessage(msg)) {
    void handleGoogleTranslateRequest(msg.payload).then(sendResponse);
    return true;
  }
});
