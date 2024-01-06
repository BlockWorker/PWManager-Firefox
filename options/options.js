const table = document.getElementById("table");
const errorrow = document.getElementById("error-row");
const templaterow = document.getElementById("template-row");
const divider = document.getElementById("end-divider");
const clearbtn = document.getElementById("clear-button");
const addbtn = document.getElementById("add-button");
const savebtn = document.getElementById("save-button");

const syncctl = document.getElementById("sync-control");
const synchostdisp = document.getElementById("sync-host-disp");
const syncportdisp = document.getElementById("sync-port-disp");
const synctokendisp = document.getElementById("sync-token-disp");
const synceditbtn = document.getElementById("sync-edit-button");
const syncbtn = document.getElementById("sync-button");
const syncstatusdisp = document.getElementById("sync-status");
const syncsettings = document.getElementById("sync-settings");
const synchostwr = document.getElementById("sync-host-wrapper");
const synchostbox = document.getElementById("sync-host-box");
const syncportwr = document.getElementById("sync-port-wrapper");
const syncportbox = document.getElementById("sync-port-box");
const synctokenwr = document.getElementById("sync-token-wrapper");
const synctokenbox = document.getElementById("sync-token-box");
const syncdeletebtn = document.getElementById("sync-delete-button");
const synccancelbtn = document.getElementById("sync-cancel-button");
const syncsavebtn = document.getElementById("sync-save-button");
const synctestingdisp = document.getElementById("sync-testing");

function clearTable() {
  var node = templaterow.nextElementSibling;
  while (node && node != divider) {
    let next = node.nextElementSibling;
    table.removeChild(node);
    node = next;
  }
}

function addRow(info) {
  if (!info) {
    info = {
      "ident": "",
      "iter": 0,
      "symbols": DEFAULT_SYMBOLS,
      "longpw": true,
      "timestamp": new Date()
    };
  }
  
  var row = templaterow.cloneNode(true);
  row.id = "";
  row.style.display = "flex";
  
  var identwr = row.children[0].children[0];
  var identbox = identwr.children[1];
  var iterwr = row.children[1].children[0];
  var iterbox = iterwr.children[1];
  var symbolswr = row.children[2].children[0];
  var symbolsbox = symbolswr.children[1];
  var symbolsbtn = symbolswr.children[2].children[0].children[0];
  var longpwbtn = row.children[3].children[0];
  var deletebtn = row.children[5].children[0];
  
  identwr.addEventListener("click", function() { identbox.focus(); });
  iterwr.addEventListener("click", function() { iterbox.focus(); });
  symbolswr.addEventListener("click", function() { symbolsbox.focus(); });
  
  identbox.addEventListener("input", function() {
    if (identbox.value) identwr.classList.remove("input-error");
    else identwr.classList.add("input-error");
  });
  iterbox.addEventListener("input", function() {
    if (iterbox.value) iterwr.classList.remove("input-error");
    else iterwr.classList.add("input-error");
  });
  symbolsbox.addEventListener("input", function() {
    if (symbolsbox.value) symbolswr.classList.remove("input-error");
    else symbolswr.classList.add("input-error");
  });
  
  symbolsbtn.addEventListener("click", function() {
    symbolsbox.value = DEFAULT_SYMBOLS;
    symbolsbox.dispatchEvent(new Event("input"));
  });
  
  longpwbtn.addEventListener("click", function() {
    if (longpwbtn.classList.contains("filled-button-inactive")) {
      longpwbtn.classList.remove("filled-button-inactive");
    } else {
      longpwbtn.classList.add("filled-button-inactive");
    }
  });
  deletebtn.addEventListener("click", function() {
    if (deletebtn.classList.contains("delete-button-inactive")) {
      deletebtn.classList.remove("delete-button-inactive");
    } else {
      deletebtn.classList.add("delete-button-inactive");
    }
  });
  
  identbox.value = info.ident;
  identbox.dispatchEvent(new Event("input"));
  iterbox.value = info.iter;
  iterbox.dispatchEvent(new Event("input"));
  symbolsbox.value = info.symbols;
  symbolsbox.dispatchEvent(new Event("input"));
  if (info.longpw) {
    longpwbtn.classList.remove("filled-button-inactive");
  } else {
    longpwbtn.classList.add("filled-button-inactive");
  }
  
  table.insertBefore(row, divider);
}

function populateTable() {
  clearTable();
  
  for (var ident of Object.keys(pwm_settingItems).sort()) {
    addRow(pwm_settingItems[ident]);
  }
}

function interpretTable() {
  res = {};
  
  var node = templaterow;
  while (node) {
    node = node.nextElementSibling;
    if (node == divider) break;
    
    if (node.tagName != "TR") continue;
    
    //item selected for deletion: just skip it
    if (!node.children[5].children[0].classList.contains("delete-button-inactive")) continue;
    
    let ident = node.children[0].children[0].children[1].value;
    if (!ident) return "Identifier may not be empty";
    if (ident in res) return `Duplicate identifier ${ident}`;
    
    let iter = node.children[1].children[0].children[1].value;
    if (!iter) return `Identifier ${ident} has invalid iteration`;
    let iter_int = parseInt(iter);
    
    let symbols = node.children[2].children[0].children[1].value;
    if (!symbols) return `Symbols may not be empty (identifier ${ident})`;
    
    let longpw = !node.children[3].children[0].classList.contains("filled-button-inactive");
    
    if (iter_int === 0 && symbols === DEFAULT_SYMBOLS && longpw) return `Don't save default settings (identifier ${ident})`;
    
    res[ident] = {
      "ident": ident,
      "iter": iter_int,
      "symbols": symbols,
      "longpw": longpw,
      "timestamp": new Date()
    };
  }
  
  return res;
}

function timeSpanDescription(targetDate) {
  if (isNaN(targetDate) || targetDate.getUTCFullYear() < 2000) return "Never";
  
  var msDiff = targetDate.getTime() - Date.now();
  var absMs = Math.abs(msDiff);
  var seconds = Math.floor(absMs / 1000.0);
  var minutes = Math.floor(absMs / 60000.0);
  var hours = Math.floor(absMs / 3600000.0);
  var days = Math.floor(absMs / 86400000.0);
  var weeks = Math.floor(absMs / 604800000.0);
  var months = Math.floor(absMs / 2629743830.0);
  var years = Math.floor(absMs / 31556926000.0);
  
  var ret;
  if (years >= 1) ret = years.toString() + ((years > 1) ? " years" : " year");
  else if (months >= 1) ret = months.toString() + ((months > 1) ? " months" : " month");
  else if (weeks >= 1) ret = weeks.toString() + ((weeks > 1) ? " weeks" : " week");
  else if (days >= 1) ret = days.toString() + ((days > 1) ? " days" : " day");
  else if (hours >= 1) ret = hours.toString() + ((hours > 1) ? " hours" : " hour");
  else if (minutes >= 1) ret = minutes.toString() + ((minutes > 1) ? " minutes" : " minute");
  else if (seconds >= 1) ret = seconds.toString() + ((seconds > 1) ? " seconds" : " second");
  else return "Now";
  
  if (msDiff < 0) return ret + " ago";
  else return "In " + ret;
}

function updateSyncStatus() {
  if (!syncValid()) {
    syncstatusdisp.classList.remove("errormsg");
    syncstatusdisp.innerText = "Never";
    synceditbtn.classList.remove("disabled");
    syncbtn.classList.add("disabled");
    return;
  }
  
  if (pwm_syncInProgress) {
    syncstatusdisp.classList.remove("errormsg");
    syncstatusdisp.innerText = "In progress...";
    synceditbtn.classList.add("disabled");
    syncbtn.classList.add("disabled");
    return;
  }
  
  synceditbtn.classList.remove("disabled");
  syncbtn.classList.remove("disabled");
  
  var timeSpanDesc = timeSpanDescription(pwm_syncSettings.last_sync);
  if (pwm_lastSyncSucceeded) {
    syncstatusdisp.classList.remove("errormsg");
    syncstatusdisp.innerText = timeSpanDesc;
  } else {
    syncstatusdisp.classList.add("errormsg");
    syncstatusdisp.innerText = timeSpanDesc + " (failed later)";
  }
}

function showSyncControl() {
  syncsettings.style.display = "none";
  syncctl.style.display = "flex";
  
  if (syncValid()) {
    synchostdisp.innerText = pwm_syncSettings.host;
    syncportdisp.innerText = pwm_syncSettings.port;
    synctokendisp.innerText = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  } else {
    synchostdisp.innerText = "(None)";
    syncportdisp.innerText = "(None)";
    synctokendisp.innerText = "(None)";
  }
  
  updateSyncStatus();
  
  synceditbtn.classList.remove("disabled");
}

function syncSettingsEntriesValid() {
  return synchostbox.value && syncportbox.value && synctokenbox.value && parseInt(syncportbox.value) > 0
}

function showSyncSettings() {
  syncctl.style.display = "none";
  syncsettings.style.display = "flex";
  
  if (syncSettingsValid(pwm_syncSettings)) {
    synchostbox.value = pwm_syncSettings.host;
    syncportbox.value = pwm_syncSettings.port > 0 ? pwm_syncSettings.port : "";
    synctokenbox.value = pwm_syncSettings.token;
  } else {
    synchostbox.value = "";
    syncportbox.value = "";
    synctokenbox.value = "";
  }
  
  synchostbox.dispatchEvent(new Event("input"));
  syncportbox.dispatchEvent(new Event("input"));
  synctokenbox.dispatchEvent(new Event("input"));
  
  synctestingdisp.innerText = "";
  
  syncdeletebtn.classList.remove("disabled");
  
  if (syncSettingsEntriesValid()) {
    syncsavebtn.classList.remove("disabled");
  } else {
    syncsavebtn.classList.add("disabled");
  }
}

function performSync() {
  if (!syncValid() || pwm_syncInProgress) return;
  
  sync(function(success) {
    updateSyncStatus();
    if (success) populateTable();
  });
  
  updateSyncStatus();
}

function init() {
  clearbtn.classList.remove("disabled");
  addbtn.classList.remove("disabled");
  savebtn.classList.remove("disabled");
  
  loadSettings(function() {
    populateTable();
    showSyncControl();
    
    performSync();
    
    setInterval(updateSyncStatus, 200);
  });
}

clearbtn.addEventListener("click", function() {
  if (!confirm("All settings will be deleted, including sync settings. Are you sure?")) return;
  
  browser.storage.local.clear().then(function() {
    loadSettings(function() {
      populateTable();
      showSyncControl();
    });
  });
});

addbtn.addEventListener("click", function() {
  addRow(null);
});

savebtn.addEventListener("click", function() {
  var interpreted = interpretTable();
  if (typeof interpreted === "string") {
    alert("Error: " + interpreted);
    return;
  }
  
  var items = Object.values(interpreted);
  for (var i of items) {
    if (i.ident in pwm_settingItems) {
      let orig = pwm_settingItems[i.ident];
      if (orig.iter === i.iter && orig.symbols === i.symbols && orig.longpw === i.longpw) {
        i.timestamp = orig.timestamp;
      }
    }
  }
  
  browser.storage.local.set(
    {"pwm-settings": JSON.stringify(items)}
  ).then(function() {
    loadSettings(function() {
      populateTable();
      performSync();
    });
  });
});

synceditbtn.addEventListener("click", showSyncSettings);

syncbtn.addEventListener("click", performSync);

synchostbox.addEventListener("input", function() {
  if (synchostbox.value) synchostwr.classList.remove("input-error");
  else synchostwr.classList.add("input-error");
  
  if (syncSettingsEntriesValid() && synctestingdisp.innerText === "")
    syncsavebtn.classList.remove("disabled");
  else syncsavebtn.classList.add("disabled");
});
syncportbox.addEventListener("input", function() {
  if (syncportbox.value && parseInt(syncportbox.value) > 0) syncportwr.classList.remove("input-error");
  else syncportwr.classList.add("input-error");
  
  if (syncSettingsEntriesValid() && synctestingdisp.innerText === "") syncsavebtn.classList.remove("disabled");
  else syncsavebtn.classList.add("disabled");
});
synctokenbox.addEventListener("input", function() {
  if (synctokenbox.value) synctokenwr.classList.remove("input-error");
  else synctokenwr.classList.add("input-error");
  
  if (syncSettingsEntriesValid() && synctestingdisp.innerText === "")
    syncsavebtn.classList.remove("disabled");
  else syncsavebtn.classList.add("disabled");
});

syncdeletebtn.addEventListener("click", function() {
  if (!confirm("Sync settings will be deleted, disabling sync. Identifier settings will remain intact. Are you sure?")) return;
  
  browser.storage.local.remove("pwm-sync").then(function() {
    loadSettings(function() {
      showSyncControl();
    });
  });
});

synccancelbtn.addEventListener("click", showSyncControl);

syncsavebtn.addEventListener("click", function() {
  if (!syncSettingsEntriesValid() || synctestingdisp.innerText != "") return;
  
  syncdeletebtn.classList.add("disabled");
  synccancelbtn.classList.add("disabled");
  syncsavebtn.classList.add("disabled");
  
  var newSettings = {
    "host": synchostbox.value,
    "port": parseInt(syncportbox.value),
    "token": synctokenbox.value,
    "last_sync": new Date(0)
  };
  
  synctestingdisp.innerText = "Testing connection...";
  
  testSync(newSettings.host, newSettings.port, function(success) {
    syncdeletebtn.classList.remove("disabled");
    synccancelbtn.classList.remove("disabled");
    
    if (success) {
      synctestingdisp.innerText = "";
      
      pwm_syncSettings = newSettings;
      browser.storage.local.set(
        {"pwm-sync": JSON.stringify(newSettings)}
      ).then(showSyncControl);
    } else {
      synctestingdisp.innerText = "Connection failed.";
      synctestingdisp.classList.add("errormsg");
      
      setTimeout(function() {
        synctestingdisp.innerText = "";
        synctestingdisp.classList.remove("errormsg");
        if (syncSettingsEntriesValid()) syncsavebtn.classList.remove("disabled");
      }, 2000);
    }
  });
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
