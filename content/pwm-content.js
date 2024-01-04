var pwField = undefined;
var popupRoot = undefined;
var windowRoot = undefined;
var url = undefined;
var sub = false;
var popupClicked = false;

function removePopup() {
  if (popupRoot != undefined) popupRoot.remove();
  popupRoot = undefined;
}

function createPopup() {
  popupRoot = document.createElement("div");
  
  popupRoot.className = "pwm-popup";
  popupRoot.style.backgroundImage = "url(" + browser.runtime.getURL("icons/popup.png") + ")";
  
  popupRoot.addEventListener("mousedown", function() {
    popupClicked = true;
  });
  
  popupRoot.addEventListener("click", function() {
    removePopup();
    createWindow();
    popupClicked = false;
  });
  
  document.body.appendChild(popupRoot);
  
  const pwRect = pwField.getBoundingClientRect();
  const popRect = popupRoot.getBoundingClientRect();
  popupRoot.style.left = Math.round(pwRect.right - popRect.width).toString() + "px";
  popupRoot.style.top = Math.round(pwRect.top - popRect.height).toString() + "px";
}

function getIdent() {
  const urlRegex = /(?:(?:[A-Za-z0-9-]+\.)+)?([A-Za-z0-9-]+\.[A-Za-z0-9-]+)/;
  const match = url.match(urlRegex);
  if (match == null) return "";
  return sub ? match[0] : match[1];
}

function removeWindow() {
  if (windowRoot != undefined) windowRoot.remove();
  windowRoot = undefined;
  pwField = undefined;
  document.body.removeEventListener("mousedown", bodyClickWithWindow);
}

function bodyClickWithWindow(e) {
  if (!e.target.matches(".pwm-popup, .pwm-window")) removeWindow();
}

function genFromWindow() {
  if (windowRoot == undefined || pwField == undefined) return;
  
  const fd = new FormData(windowRoot.children[0]);
  const master = fd.get('pwm_master');
  const ident = fd.get('pwm_ident');
  const longpw = fd.has('pwm_long');
  
  getIdentConfig(ident, (iter, symbols) => {
    genPass(master, ident, iter, longpw, symbols, (pw) => {
      pwField.focus();
      pwField.value = pw;
      pwField.dispatchEvent(new Event("input"));
      //pwField.dispatchEvent(new KeyboardEvent("keyup", {key: "a"}));
      pwField.dispatchEvent(new Event("change"));
      
      const oldpwfield = pwField;
      removeWindow();
      oldpwfield.focus();
    });
  });
}

function createWindow() {
  if (pwField == undefined) return;
  
  windowRoot = document.createElement("div");
  const form = document.createElement("form");
  const table = document.createElement("table");
  const r1 = document.createElement("tr");
  const r2 = document.createElement("tr");
  const r3 = document.createElement("tr");
  const r1c1 = document.createElement("td");
  const r1c2 = document.createElement("td");
  const r2c1 = document.createElement("td");
  const r2c2 = document.createElement("td");
  const r3c1 = document.createElement("td");
  const r3c2 = document.createElement("td");
  const masterlabel = document.createElement("label");
  const identlabel = document.createElement("label");
  const longlabel = document.createElement("label");
  const masterbox = document.createElement("input");
  const identbox = document.createElement("input");
  const longbox = document.createElement("input");
  const button = document.createElement("button");
  const image = document.createElement("img");
  
  windowRoot.className = "pwm-window";
  form.className = "pwm-window";
  table.className = "pwm-window";
  r1.className = "pwm-window";
  r2.className = "pwm-window";
  r3.className = "pwm-window";
  r1c1.className = "pwm-window";
  r1c2.className = "pwm-window";
  r2c1.className = "pwm-window";
  r2c2.className = "pwm-window";
  r3c1.className = "pwm-window";
  r3c2.className = "pwm-window";
  masterlabel.className = "pwm-window";
  identlabel.className = "pwm-window";
  longlabel.className = "pwm-window";
  masterbox.className = "pwm-window pwm-ignore";
  identbox.className = "pwm-window";
  longbox.className = "pwm-window";
  button.className = "pwm-window";
  image.className = "pwm-window";
  
  masterlabel.htmlFor = "pwm-master";
  masterlabel.innerText = browser.i18n.getMessage("master") + ":";
  identlabel.htmlFor = "pwm-ident";
  identlabel.innerText = browser.i18n.getMessage("ident") + ":";
  longlabel.htmlFor = "pwm-long";
  longlabel.innerText = browser.i18n.getMessage("long");
  longlabel.style.width = "40px";
  longlabel.style.textAlign = "left";
  
  masterbox.type = "password";
  masterbox.id = "pwm-master";
  masterbox.name = "pwm_master";
  identbox.type = "text";
  identbox.id = "pwm-ident";
  identbox.name = "pwm_ident";
  longbox.type = "checkbox";
  longbox.id = "pwm-long";
  longbox.name = "pwm_long";
  longbox.checked = true;
  longbox.style.width = "15px";
  
  button.type = "button";
  button.innerText = browser.i18n.getMessage("generate");
  
  image.src = browser.runtime.getURL("icons/dark-24.png");
  
  button.addEventListener("click", genFromWindow);
  url = window.location.href;
  sub = false;
  identbox.value = getIdent();
  
  r1c1.appendChild(masterlabel);
  r1c2.appendChild(masterbox);
  r2c1.appendChild(identlabel);
  r2c2.appendChild(identbox);
  r3c1.appendChild(longbox);
  r3c1.appendChild(longlabel);
  r3c2.appendChild(button);
  r3c2.appendChild(image);
  
  r1.appendChild(r1c1);
  r1.appendChild(r1c2);
  r2.appendChild(r2c1);
  r2.appendChild(r2c2);
  r3.appendChild(r3c1);
  r3.appendChild(r3c2);
  
  table.appendChild(r1);
  table.appendChild(r2);
  table.appendChild(r3);
  
  form.appendChild(table);
  
  windowRoot.appendChild(form);
  
  document.body.appendChild(windowRoot);
  
  const pwRect = pwField.getBoundingClientRect();
  const winRect = windowRoot.getBoundingClientRect();
  windowRoot.style.left = Math.round(pwRect.right - winRect.width).toString() + "px";
  windowRoot.style.top = Math.round(pwRect.top - winRect.height).toString() + "px";
  
  document.body.addEventListener("mousedown", bodyClickWithWindow);
  
  masterbox.focus();
}

function pwFocus(field) {
  removeWindow();
  removePopup();
  pwField = field;
  createPopup();
}

function pwBlur(field) {
  removePopup();
  pwField = undefined;
}

function onPwmCommand(name) {
  if (popupRoot != undefined && name == "pwm-main") {
    removePopup();
    createWindow();
  } else if (windowRoot != undefined) {
    const identbox = windowRoot.children[0].children[0].children[1].children[1].children[0];
    const longbox = windowRoot.children[0].children[0].children[2].children[0].children[0];
    
    if (name == "pwm-main") {
      genFromWindow();
    } else if (name == "pwm-custom") {
      identbox.select();
    } else if (name == "pwm-subdomain") {
      sub = !sub;
      identbox.value = getIdent();
    } else if (name == "pwm-length") {
      longbox.checked = !longbox.checked;
    }
  }
}

function initPwmContent() {
  document.body.addEventListener("focusin", (e) => {
    if (e.target.tagName.toLowerCase() != "input" || e.target.type.toLowerCase() != "password" || e.target.classList.contains("pwm-ignore")) return;
    pwFocus(e.target);
  });
  document.body.addEventListener("focusout", (e) => {
    if (e.target.tagName.toLowerCase() != "input" || e.target.type.toLowerCase() != "password" || e.target.classList.contains("pwm-ignore") || windowRoot != undefined || popupClicked) return;
    pwBlur(e.target);
  });
  browser.runtime.onMessage.addListener(onPwmCommand);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPwmContent);
} else {
  initPwmContent();
}


