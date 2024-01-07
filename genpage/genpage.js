const form = document.getElementById("form");
const masterbox = document.getElementById("master");
const identbox = document.getElementById("ident");
const identicon = document.getElementById("ident-icon");
const iterwr = document.getElementById("iter-wrapper");
const iterbox = document.getElementById("iter");
const symbolwr = document.getElementById("symbols-wrapper");
const symbolbox = document.getElementById("symbols");
const longbtn = document.getElementById("long");
const genbtn = document.getElementById("generate");
const result = document.getElementById("result");
const copymsg = document.getElementById("copymsg");

//whether long password should be used
var longpw = true;

//copy generated password and display message
function genpageCallback(pw) {
  result.type = "text";
  result.value = pw;
  result.select();
  document.execCommand("copy");
  result.value = "";
  result.type = "hidden";
  copymsg.style.display = "inherit";
  setTimeout(() => { copymsg.style.display = "none"; }, 2000);
}

//process input data and generate password
function process() {
  const fd = new FormData(form);
  const master = fd.get("pwm_master");
  const ident = fd.get("pwm_ident");
  const iter = fd.get("pwm_iter");
  const symbols = fd.get("pwm_symbols");
  
  genPass(master, ident, iter, longpw, symbols, genpageCallback);
}

//page initialization
function init() {
  symbolbox.value = DEFAULT_SYMBOLS;
  
  loadSettings(function() {
    sync(null);
    masterbox.focus();
  });
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

//open settings page
document.getElementById("settings").addEventListener("click", function() {
  browser.runtime.openOptionsPage();
})

//generate button
genbtn.addEventListener("click", process)

//reset to all symbols
document.getElementById("allsymbols").addEventListener("click", function() {
  symbolbox.value = DEFAULT_SYMBOLS;
  symbolbox.dispatchEvent(new Event("input"));
})

//toggle long password
longbtn.addEventListener("click", function() {
  longpw = !longpw;
  if (longpw) {
    longbtn.classList.remove("filled-button-inactive");
  } else {
    longbtn.classList.add("filled-button-inactive");
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

//initial loading trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
