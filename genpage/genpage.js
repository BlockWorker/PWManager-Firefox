const genBtn = document.getElementById("generate");
const allBtn = document.getElementById("allsymbols");
const form = document.getElementById("form");
const identbox = document.getElementById("ident");
const iterbox = document.getElementById("iter");
const symbolbox = document.getElementById("symbols");
const result = document.getElementById("result");
const copymsg = document.getElementById("copymsg");

function genpageCallback(pw) {
  result.type = "text";
  result.value = pw;
  result.select();
  document.execCommand("copy");
  result.value = "";
  result.type = "hidden";
  copymsg.style.visibility = "visible";
  setTimeout(() => { copymsg.style.visibility = "hidden"; }, 2000);
}

function process() {
  const fd = new FormData(form);
  const master = fd.get("pwm_master");
  const ident = fd.get("pwm_ident");
  const iter = fd.get("pwm_iter");
  const symbols = fd.get("pwm_symbols");
  const longpw = fd.has("pwm_long");
  
  genPass(master, ident, iter, longpw, symbols, genpageCallback);
}

function init() {
  document.getElementById("masterlabel").innerText = browser.i18n.getMessage("master") + ":";
  document.getElementById("identlabel").innerText = browser.i18n.getMessage("ident") + ":";
  document.getElementById("iterlabel").innerText = browser.i18n.getMessage("iter") + ":";
  document.getElementById("symbollabel").innerText = browser.i18n.getMessage("symbols") + ":";
  document.getElementById("longlabel").innerText = browser.i18n.getMessage("long");
  allBtn.innerText = browser.i18n.getMessage("all");
  genBtn.innerText = browser.i18n.getMessage("generate");
  copymsg.innerText = browser.i18n.getMessage("copiedMessage");
  
  symbolbox.value = defaultSymbols;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

genBtn.addEventListener("click", process)

allBtn.addEventListener("click", function() {
  symbolbox.value = defaultSymbols;
})

identbox.addEventListener("blur", function() {
  getIdentConfig(identbox.value, (iter, symbols) => {
    iterbox.value = iter;
    symbolbox.value = symbols;
  });
});
