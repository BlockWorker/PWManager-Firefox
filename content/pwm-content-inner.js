const form = document.getElementById("form");
const masterbox = document.getElementById("master");
const identbox = document.getElementById("ident");
const identicon = document.getElementById("ident-icon");
const identswitch = document.getElementById("ident-switch");
const iterrow = document.getElementById("iter-row");
const iterwr = document.getElementById("iter-wrapper");
const iterbox = document.getElementById("iter");
const symbolrow = document.getElementById("symbols-row");
const symbolwr = document.getElementById("symbols-wrapper");
const symbolbox = document.getElementById("symbols");
const expandbtn = document.getElementById("expand");
const longbtn = document.getElementById("long");
const savebtn = document.getElementById("save");
const genbtn = document.getElementById("generate");

var longpw = true; //whether long password should be generated
var expanded = false; //whether the window is expanded to show iter and symbols
var save = false; //whether the selected ident settings should be saved
var longident = false; //whether the long given ident should be used
var identValLong = ""; //long given ident value
var identValShort = ""; //short given ident value

//process input data and generate password
function process() {
  const fd = new FormData(form);
  const master = fd.get("pwm_master");
  const ident = fd.get("pwm_ident");
  const iter = fd.get("pwm_iter");
  const symbols = fd.get("pwm_symbols");
  
  if (!(iter && parseInt(iter) >= 0 && symbols)) return;
  
  const iterval = parseInt(iter);
  
  var savedata = {}; //create save data if requested
  if (save && ident && iterval >= 0 && symbols && (iterval > 0 || symbols != DEFAULT_SYMBOLS || !longpw)) {
    savedata = {
      "ident": ident,
      "iter": iterval,
      "symbols": symbols,
      "longpw": longpw
    };
  }
  
  //send generated password to content script
  genPass(master, ident, iterval, longpw, symbols, function(pw) {
    window.parent.postMessage(
      {"type": "pwm-gen", "value": pw, "savedata": savedata},
      "*"
    );
  });
}

//page initialization
function init() {
  symbolbox.value = DEFAULT_SYMBOLS;
  
  window.parent.postMessage( //request settings
    {"type": "pwm-loadinfo"},
    "*"
  );
  
  masterbox.focus();
}

//focus input elements when clicking on its wrapper element
document.getElementById("master-wrapper").addEventListener("click", function() {
  masterbox.focus();
});
document.getElementById("ident-wrapper").addEventListener("click", function() {
  identbox.focus();
})
iterwr.addEventListener("click", function() {
  iterbox.focus();
})
symbolwr.addEventListener("click", function() {
  symbolbox.focus();
})

//perform character masking on master password box (as we're not using an actual password-type input here)
masterbox.addEventListener("input", function() {
  if (masterbox.value) {
    masterbox.classList.add("pseudo-password");
  } else {
    masterbox.classList.remove("pseudo-password");
  }
});

//validation of iter and symbol inputs - highlight and disable generate button
iterbox.addEventListener("input", function() {
  if (iterbox.value) {
    iterwr.classList.remove("input-error");
    if (symbolbox.value) genbtn.classList.remove("disabled");
  } else {
    iterwr.classList.add("input-error");
    genbtn.classList.add("disabled");
  }
});
symbolbox.addEventListener("input", function() {
  if (symbolbox.value) {
    symbolwr.classList.remove("input-error");
    if (iterbox.value) genbtn.classList.remove("disabled");
  } else {
    symbolwr.classList.add("input-error");
    genbtn.classList.add("disabled");
  }
});

//generate button
genbtn.addEventListener("click", process)

//toggle between short and long given ident
function toggleIdentSwitch() {
  longident = !longident;
  if (longident) {
    identswitch.classList.add("highlight");
  } else {
    identswitch.classList.remove("highlight");
  }
  
  if (identValShort && identValLong) {
    identbox.value = longident ? identValLong : identValShort;
    identbox.dispatchEvent(new Event("input"));
    identbox.dispatchEvent(new Event("change"));
  }
}

identswitch.addEventListener("click", toggleIdentSwitch)

//reset to all symbols
document.getElementById("allsymbols").addEventListener("click", function() {
  symbolbox.value = DEFAULT_SYMBOLS;
  symbolbox.dispatchEvent(new Event("input"));
})

//expand/contract window (show/hide iter and ident)
expandbtn.addEventListener("click", function() {
  expanded = !expanded;
  if (expanded) {
    expandbtn.innerText = "expand_less";
    iterrow.style.display = "flex";
    symbolrow.style.display = "flex";
    savebtn.style.display = "inline-block";
  } else {
    expandbtn.innerText = "expand_more";
    iterrow.style.display = "none";
    symbolrow.style.display = "none";
    savebtn.style.display = "none"; //save function only makes sense if all boxes are shown, i.e. expanded
    save = false;
    savebtn.classList.add("filled-button-inactive");
  }
})

//toggle long password
function toggleLongPW() {
  longpw = !longpw;
  if (longpw) {
    longbtn.classList.remove("filled-button-inactive");
  } else {
    longbtn.classList.add("filled-button-inactive");
  }
}

longbtn.addEventListener("click", toggleLongPW)

//toggle whether settings should be saved
savebtn.addEventListener("click", function() {
  save = !save;
  if (save) {
    savebtn.classList.remove("filled-button-inactive");
  } else {
    savebtn.classList.add("filled-button-inactive");
  }
})

//highlight ident icon when ident has associated saved settings
identbox.addEventListener("input", function() {
  if (identbox.value in pwm_settingItems) {
    identicon.classList.add("highlight");
  } else {
    identicon.classList.remove("highlight");
  }
});

//apply saved ident settings on ident change
identbox.addEventListener("change", function() {
  if (identbox.value in pwm_settingItems) {
    let info = pwm_settingItems[identbox.value];
    iterbox.value = info.iter;
    iterbox.dispatchEvent(new Event("input"));
    symbolbox.value = info.symbols;
    symbolbox.dispatchEvent(new Event("input"));
    longpw = info.longpw;
    if (longpw) {
      longbtn.classList.remove("filled-button-inactive");
    } else {
      longbtn.classList.add("filled-button-inactive");
    }
  }
});

//check whether a settings-loaded message has a valid structure
function loadedMessageValid(data) {
  return data && "items" in data && typeof data.items === "object" &&
          "longident" in data && typeof data.longident === "string" &&
          "shortident" in data && typeof data.shortident === "string";
}

//handle incoming messages from the content script
window.addEventListener("message", function(event) {
  if (event.source !== window.parent) return;
  
  const data = event.data;
  //must have "type" to describe type of message
  if (!(data && "type" in data && data.type && typeof data.type === "string")) return;
  
  switch (data.type) {
    case "pwm-loaded": //settings loaded, sent in this message
      if (!loadedMessageValid(data)) return; //check message validity
      
      for (let ident in data.items) { //validate received settings items
        let item = data.items[ident];
        if (!(identItemValid(item) && item.ident === ident)) {
          console.error("Invalid item in pwm-loaded message");
          console.error(item);
          return;
        }
      }
      
      //copy received settings
      pwm_settingItems = data.items;
      
      identValLong = data.longident;
      identValShort = data.shortident;
      
      //apply received ident, if present
      if (identValShort && identValLong) {
        identbox.value = longident ? identValLong : identValShort;
        identbox.dispatchEvent(new Event("input"));
        identbox.dispatchEvent(new Event("change"));
      }
      
      break;
    case "pwm-synced": //sync complete - reloaded settings items
      if (!("items" in data && typeof data.items === "object")) return; //check message validity
      
      for (let ident in data.items) { //validate received settings items
        let item = data.items[ident];
        if (!(identItemValid(item) && item.ident === ident)) {
          console.error("Invalid item in pwm-synced message");
          console.error(item);
          return;
        }
      }
      
      console.info("sync updated settings");
      
      //copy received settings
      pwm_settingItems = data.items;
      
      break;
    case "pwm-command": //extension command received, i.e. keyboard shortcut
      if (!("name" in data && data.name && typeof data.name === "string")) return;
      
      switch (data.name) {
        case "pwm-main": //generate password
          process();
          break;
        case "pwm-custom": //custom ident: select ident box text to allow user to replace it
          identbox.select();
          break;
        case "pwm-subdomain": //toggle between short and long ident
          toggleIdentSwitch();
          break;
        case "pwm-length": //toggle long password
          toggleLongPW();
          break;
        default:
          console.error(`Unknown pwm-command: ${data.name}`);
          break;
      }
      
      break;
  }
});

//initial loading trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
