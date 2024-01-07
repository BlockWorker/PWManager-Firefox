var pwField = undefined;
var popupRoot = undefined;
var windowFrame = undefined;
var identShort = "";
var identLong = "";
var sub = false;
var popupClicked = false;

//remove prompt popup icon
function removePopup() {
  if (popupRoot != undefined) popupRoot.remove();
  popupRoot = undefined;
}

//create prompt popup icon above password field
function createPopup() {
  popupRoot = document.createElement("div");
  
  popupRoot.className = "pwm-popup";
  popupRoot.style.backgroundImage = "url(" + browser.runtime.getURL("icons/popup.png") + ")";
  
  popupRoot.addEventListener("mousedown", function() {
    popupClicked = true;
  });
  
  popupRoot.addEventListener("click", function() { //on click: remove popup icon, show generation window
    removePopup();
    createWindow();
    popupClicked = false;
  });
  
  document.body.appendChild(popupRoot);
  
  //position icon above the password field on the right side
  const pwRect = pwField.getBoundingClientRect();
  const popRect = popupRoot.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  popupRoot.style.left = Math.round(pwRect.right - popRect.width - bodyRect.left).toString() + "px";
  popupRoot.style.top = Math.round(pwRect.top - popRect.height - bodyRect.top).toString() + "px";
}

//remove generation window
function removeWindow() {
  if (windowFrame != undefined) windowFrame.remove();
  windowFrame = undefined;
  pwField = undefined;
  document.body.removeEventListener("mousedown", bodyClickWithWindow);
}

//remove generation window and popup icon when clicking away
function bodyClickWithWindow(e) {
  if (!e.target.matches(".pwm-popup, .pwm-iframe")) removeWindow();
}

//create generation window
function createWindow() {
  if (pwField == undefined) return;
  
  //get url and extract idents
  const urlRegex = /(?:(?:[A-Za-z0-9-]+\.)+)?([A-Za-z0-9-]+\.[A-Za-z0-9-]+)/;
  const match = window.location.href.match(urlRegex);
  if (match) {
    identShort = match[1];
    identLong = match[0];
  } else {
    identShort = "";
    identLong = "";
  }
  
  //create iframe with window content
  windowFrame = document.createElement("iframe");
  
  const windowUrl = browser.runtime.getURL("content/pwm-content.html");
  
  windowFrame.className = "pwm-iframe";
  windowFrame.sandbox.add("allow-scripts"); //requires inner script for UI
  windowFrame.sandbox.add("allow-same-origin"); //requires same-origin access for icon font
  
  windowFrame.src = windowUrl;
  
  document.body.appendChild(windowFrame);
  
  //position window above the password field on the right side
  const pwRect = pwField.getBoundingClientRect();
  const winRect = windowFrame.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  windowFrame.style.left = Math.round(pwRect.right - winRect.width - bodyRect.left).toString() + "px";
  windowFrame.style.top = Math.round(pwRect.top - winRect.height - bodyRect.top).toString() + "px";
  
  document.body.addEventListener("mousedown", bodyClickWithWindow); //handle "click-away"
}

//called when a password field is focused
function pwFocus(field) {
  removeWindow();
  removePopup();
  pwField = field;
  createPopup();
}

//called when password field loses focus
function pwBlur(field) {
  removePopup();
  pwField = undefined;
}

//hanlde incoming command from extension (i.e., keyboard shortcut)
function onPwmCommand(name) {
  if (popupRoot && name === "pwm-main") { //open generation window
    removePopup();
    createWindow();
  } else if (windowFrame && windowFrame.contentWindow && name && typeof name === "string") {
    //if generation window already present: forward command to window inner script
    windowFrame.contentWindow.postMessage(
      {"type": "pwm-command", "name": name},
      "*"
    );
  }
}

//init content script after page load
function initPwmContent() {
  //listen for focus events to see if password field focused/unfocused
  document.body.addEventListener("focusin", (e) => {
    if (e.target.tagName.toLowerCase() != "input" || e.target.type.toLowerCase() != "password" || e.target.classList.contains("pwm-ignore")) return;
    pwFocus(e.target);
  });
  document.body.addEventListener("focusout", (e) => {
    if (e.target.tagName.toLowerCase() != "input" || e.target.type.toLowerCase() != "password" || e.target.classList.contains("pwm-ignore") || windowFrame != undefined || popupClicked) return;
    pwBlur(e.target);
  });
  //register command listener
  browser.runtime.onMessage.addListener(onPwmCommand);
}

//check if saved item message has a valid structure
function savedataMsgValid(item) {
  return item && "ident" in item && "iter" in item && "symbols" in item &&
          "longpw" in item && item.ident && typeof item.ident === "string" &&
          typeof item.iter === "number" && item.iter >= 0 && item.symbols &&
          typeof item.symbols === "string" && typeof item.longpw === "boolean";
}

//handle incoming messages from generation window inner script
window.addEventListener("message", function(event) {
  if (event.source !== windowFrame?.contentWindow) return;
  
  const data = event.data;
  //must have "type" to describe type of message
  if (!(data && "type" in data && data.type && typeof data.type === "string")) return;
  
  switch(data.type) {
    case "pwm-loadinfo": //generation window loaded, requesting settings
      loadSettings(function() { //load settings, sync, send results to generation window
        event.source.postMessage(
          {
            "type": "pwm-loaded",
            "items": pwm_settingItems,
            "shortident": identShort,
            "longident": identLong
          },
          "*"
        );
        sync(function(success) {
          if (success) {
            event.source.postMessage(
              {
                "type": "pwm-synced",
                "items": pwm_settingItems
              },
              "*"
            );
          }
        });
      });
      break;
    case "pwm-gen": //password generated, optionally with settings to be saved
      if (!("value" in data && data.value && typeof data.value === "string" && "savedata" in data && typeof data.savedata === "object")) break;
      
      //insert password into field, with events to (hopefully) trigger input validation on the website
      pwField.focus();
      pwField.value = data.value;
      pwField.dispatchEvent(new InputEvent(
        "input",
        {"inputType": "insertReplacementText", "data": data.value}
      ));
      pwField.dispatchEvent(new Event("change"));
      
      const oldpwfield = pwField;
      removeWindow(); //remove generation window
      oldpwfield.focus();
      
      if (data.savedata) { //settings need to be saved
        let sd = data.savedata;
        
        if (!savedataMsgValid(sd)) break; //check validity
        
        let saveItem = { //create settings item
          "ident": sd.ident,
          "iter": sd.iter,
          "symbols": sd.symbols,
          "longpw": sd.longpw,
          "timestamp": new Date()
        };
        
        if (identItemValid(saveItem)) { //validate and check for duplicate, then insert, save, and sync
          let ident = saveItem.ident;
          
          if (ident in pwm_settingItems) {
            let existing = pwm_settingItems[ident];
            if (saveItem.iter === existing.iter && saveItem.symbols === existing.symbols && saveItem.longpw === existing.longpw) break;
          }
          
          pwm_settingItems[ident] = saveItem;
          
          browser.storage.local.set(
            {"pwm-settings": JSON.stringify(Object.values(pwm_settingItems))}
          ).then(function() {
            sync(null);
          });
        }
      }
      
      break;
  }
});

//initial loading trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPwmContent);
} else {
  initPwmContent();
}
